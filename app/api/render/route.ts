import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { GoogleGenAI } from "@google/genai";
import { authOptions } from "@/lib/auth";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Gemini image-generation model.
 * Uses v1beta — the standard channel for preview models.
 */
const GEMINI_MODEL = "gemini-3-pro-image-preview";

/** Max reference product images to pull from Drive (keeps request size sane). */
const MAX_REF_IMAGES = 3;

const STYLE_LABELS: Record<string, string> = {
  "modern-minimalist": "Modern Minimalist",
  contemporary: "Contemporary",
  traditional: "Traditional New England",
  industrial: "Industrial Loft",
  scandinavian: "Scandinavian",
};

const COLOR_PALETTE_LABELS: Record<string, { label: string; description: string; swatches: string[] }> = {
  "warm-earth": {
    label: "Warm Earth",
    description: "Terracotta, sand, and warm taupe with bronze accents",
    swatches: ["#C17F5A", "#D4B896", "#8B6E52", "#E8D5B7"],
  },
  "coastal-calm": {
    label: "Coastal Calm",
    description: "Soft greys, white, and weathered blue with crisp trim",
    swatches: ["#B8C9D4", "#EAEEF0", "#6E8FA0", "#D6E0E5"],
  },
  "forest-modern": {
    label: "Forest Modern",
    description: "Deep charcoal, sage green, and natural wood tones",
    swatches: ["#3D4A3E", "#7A9177", "#2C3030", "#B5C4AD"],
  },
  "urban-contrast": {
    label: "Urban Contrast",
    description: "Bold black and white with matte concrete and steel",
    swatches: ["#1A1A1A", "#F0F0F0", "#5A5A5A", "#C8C8C8"],
  },
  "desert-sunrise": {
    label: "Desert Sunrise",
    description: "Warm white, dusty rose, and burnt orange with clay accents",
    swatches: ["#F2E8DC", "#D9927A", "#C4714F", "#EDD5C0"],
  },
};

// ─── Route handler (POST) ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: {
    address?: string;
    lat?: string | number;
    lng?: string | number;
    buildingType?: string;
    architectureStyle?: string;
    colorPalette?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { address, lat, lng, buildingType = "", architectureStyle = "modern-minimalist", colorPalette = "warm-earth" } = body;

  if (!address || lat == null || lng == null) {
    return NextResponse.json(
      { error: "address, lat, and lng are required." },
      { status: 400 }
    );
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER;

  if (!geminiKey)
    return NextResponse.json({ error: "GEMINI_API_KEY is not configured." }, { status: 500 });
  if (!mapsKey)
    return NextResponse.json({ error: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured." }, { status: 500 });

  // ── 1. Fetch Google Street View image ──────────────────────────────────────
  const svUrl = new URL("https://maps.googleapis.com/maps/api/streetview");
  svUrl.searchParams.set("size", "640x480");
  svUrl.searchParams.set("location", `${lat},${lng}`);
  svUrl.searchParams.set("fov", "75");       // Tighter FOV = less distortion, better for building detail
  svUrl.searchParams.set("pitch", "2");      // Slightly upward to capture rooflines
  svUrl.searchParams.set("source", "outdoor");
  svUrl.searchParams.set("key", mapsKey);

  let svBase64: string;
  try {
    const svRes = await fetch(svUrl.toString());
    if (!svRes.ok)
      return NextResponse.json(
        { error: `Street View API returned HTTP ${svRes.status}` },
        { status: 502 }
      );
    svBase64 = Buffer.from(await svRes.arrayBuffer()).toString("base64");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch Street View image" },
      { status: 502 }
    );
  }

  // ── 2. Fetch Reframe product reference images from Drive (if authenticated) ─
  interface RefImage { base64: string; mimeType: string; name: string }
  const referenceImages: RefImage[] = [];

  const session = await getServerSession(authOptions);

  if (session?.accessToken && parentFolderId && buildingType) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );
      oauth2Client.setCredentials({ access_token: session.accessToken as string });
      const drive = google.drive({ version: "v3", auth: oauth2Client });

      // Find the building-type subfolder
      const subfoldersRes = await drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: "files(id, name)",
        pageSize: 50,
      });

      const subfolder = (subfoldersRes.data.files ?? []).find(
        (f) => f.name?.toLowerCase() === buildingType.toLowerCase()
      );

      if (subfolder?.id) {
        // List image files inside the subfolder
        const imagesRes = await drive.files.list({
          q: `'${subfolder.id}' in parents and mimeType contains 'image/' and trashed=false`,
          fields: "files(id, name, mimeType)",
          pageSize: MAX_REF_IMAGES,
          orderBy: "name",
        });

        // Download each image as binary → base64
        for (const imgFile of (imagesRes.data.files ?? []).slice(0, MAX_REF_IMAGES)) {
          try {
            const imgRes = await drive.files.get(
              { fileId: imgFile.id!, alt: "media" },
              { responseType: "arraybuffer" }
            );
            const imgBase64 = Buffer.from(imgRes.data as ArrayBuffer).toString("base64");
            referenceImages.push({
              base64: imgBase64,
              mimeType: imgFile.mimeType ?? "image/jpeg",
              name: imgFile.name ?? "reference",
            });
          } catch (imgErr) {
            console.warn(`[render] Could not download reference image ${imgFile.name}:`, imgErr);
          }
        }
      }
    } catch (driveErr) {
      // Non-fatal — proceed without reference images
      console.warn("[render] Drive reference image fetch failed:", driveErr);
    }
  }

  // ── 3. Build professional AEC composite prompt ─────────────────────────────
  const styleLabel = STYLE_LABELS[architectureStyle] ?? architectureStyle.replace(/-/g, " ");
  // buildingType is the raw Drive folder name (e.g. "Single Family (2-Story)", "Bungalow")
  const buildingLabel = buildingType || "prefab modular building";

  // Resolve color palette info
  const paletteInfo = COLOR_PALETTE_LABELS[colorPalette];
  const paletteLabel = paletteInfo?.label ?? colorPalette.replace(/-/g, " ");
  const paletteDescription = paletteInfo?.description ?? "";
  const paletteSwatches = paletteInfo?.swatches ?? [];
  const paletteSwatchList = paletteSwatches.length > 0
    ? paletteSwatches.map((hex) => `  ${hex}`).join("\n")
    : "";

  const totalImages = 1 + referenceImages.length;
  const refBlock =
    referenceImages.length > 0
      ? referenceImages
          .map((img, i) => `• Image ${i + 2}: Reframe "${buildingLabel}" product photo — use this as the definitive design reference for the building's facade, cladding, windows, roofline, and entry.`)
          .join("\n")
      : "";

  const prompt = `You are a licensed architect and senior architectural visualization specialist at a world-class AEC rendering studio. You produce photorealistic site composite images used in investor pitch decks, pre-sales materials, and planning submissions. Your work is indistinguishable from actual photographs.

━━━ INPUT IMAGES (${totalImages} total) ━━━
• Image 1: Google Street View site photograph at ${address}
  → This is your IMMUTABLE BACKGROUND CANVAS. Every pixel outside the subject lot must be preserved with absolute fidelity.
${refBlock}

━━━ YOUR TASK ━━━
Produce a single photorealistic composite photograph that replaces the primary structure on the subject lot with a new Reframe "${buildingLabel}" prefab home in ${styleLabel} architectural style — while leaving the entire surrounding context completely unchanged.

━━━ WHAT YOU MUST NEVER MODIFY ━━━
Preserve with zero deviation:
• Sky: exact clouds, color gradient, sun position, light quality
• Street: asphalt texture, lane markings, curb edges, gutter lines
• Sidewalk: every slab, crack, and surface variation
• Neighboring structures: every facade detail, window, door, cornice, and material of all adjacent buildings
• Landscape: all trees, shrubs, grass patches, planting beds — same shape and scale
• Infrastructure: utility poles, overhead wires, hydrants, mailboxes, street signs, meters
• Vehicles: every parked or passing car, bicycle, or truck
• Perspective geometry: horizon line, vanishing points, lens focal length — must match Image 1 exactly
• Lighting: exposure, color temperature, time of day, ambient shadows on the road and sidewalk

━━━ EXTERIOR COLOR PALETTE: "${paletteLabel}" ━━━
${paletteDescription ? `Palette character: ${paletteDescription}` : ""}
${paletteSwatchList ? `Hex color references:\n${paletteSwatchList}` : ""}

Apply this palette consistently across all exterior surfaces of the new building:
• Primary cladding / siding: use the dominant palette hue (first hex color) as the main facade material color
• Secondary trim, fascia, and accent elements: use the lighter/contrasting palette tones
• Window frames and doors: coordinate with the darkest or most contrasting palette color
• Roof material: select a palette-harmonious tone that reads naturally in the ambient lighting
• All colors must be adapted to the actual lighting conditions in the Street View photo (time of day, shadows, sun angle) — do not apply colors as flat swatches; render them as they would appear in real photography under the scene's lighting

━━━ THE NEW REFRAME BUILDING ━━━
${referenceImages.length > 0 ? `Design reference: Replicate the building shown in the provided product images with high fidelity, applying the "${paletteLabel}" color palette to all exterior surfaces:
• Cladding and exterior materials (siding type, texture, panel system) — recolor to match palette
• Window count, size, placement, and glazing character (frame color from palette, glass reflectivity)
• Roofline geometry: pitch, overhang depth, fascia, and any dormers
• Entry sequence: door, stoop, steps, canopy, or porch as shown in reference
• Any architectural details: corner trim, banding, balconies, vents, gutters` : `Design a clean, well-proportioned ${styleLabel}-style prefab home appropriate for this neighborhood context, using the "${paletteLabel}" color palette throughout the exterior.`}

Integration requirements:
• Position the building at the same setback, lot width, and approximate height as the original structure
• Ground contact: blend the foundation grade naturally into the existing sidewalk/lawn edge
• Cast shadows that are consistent with the sun angle and time of day visible in the Street View photo
• Maintain exact perspective — apply correct foreshortening as if photographed from the same street-level camera position
• If neighboring buildings are visible at the sides, ensure the new structure fits naturally in scale between them

━━━ FINAL QUALITY BAR ━━━
• Photographic realism: no painterly effects, no cartoon shading, no obvious CGI artifacts
• Material fidelity: sharp, readable textures (wood grain, metal panels, glass reflections, masonry joints)
• Edge integration: crisp, natural building edges with no color fringing or blurring
• Depth of field: match the natural shallow-focus character of a standard street-level 35–50mm photograph
• Color coherence: the palette colors must be convincingly lit to match the ambient light in the surrounding scene

This image will be shown to real estate investors and municipal planning committees. It must be completely convincing.

Output: One seamless composite photograph. Do not include any captions, labels, watermarks, or annotations.`;

  // ── 4. Assemble Gemini request parts ──────────────────────────────────────
  const imageParts = [
    // Image 1: Street View — the immutable background canvas
    { inlineData: { mimeType: "image/jpeg", data: svBase64 } },
    // Images 2–N: Reframe product reference photos (if available)
    ...referenceImages.map((img) => ({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    })),
    // Prompt last — anchors the instruction to all preceding images
    { text: prompt },
  ];

  // ── 5. Call Gemini ─────────────────────────────────────────────────────────
  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: { apiVersion: "v1beta" },
  });

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: "user", parts: imageParts }],
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    // Return the first image part found
    for (const part of parts) {
      if (part.inlineData?.data) {
        return NextResponse.json({
          imageData: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
          streetViewBase64: svBase64,
          referenceImagesUsed: referenceImages.length,
        });
      }
    }

    // No image returned — surface Gemini's explanation
    const textPart = parts.find((p) => p.text);
    return NextResponse.json(
      {
        error:
          "Gemini did not return an image. The model may be unavailable for this API key or region.",
        detail: textPart?.text?.slice(0, 500) ?? undefined,
      },
      { status: 422 }
    );
  } catch (err: unknown) {
    console.error("[/api/render] Gemini error:", err);
    const message = err instanceof Error ? err.message : "Gemini image generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
