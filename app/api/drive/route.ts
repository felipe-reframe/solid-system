import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";

// ─── Constants ───────────────────────────────────────────────────────────────

const PRICE_PER_SQFT = 300;

// ─── Square footage parser ────────────────────────────────────────────────────

function parseSquareFootage(text: string): number | null {
  const patterns = [
    /square\s*footage[:\s]+(\d[\d,]*)/i,
    /sq\.?\s*ft\.?[:\s]+(\d[\d,]*)/i,
    /(\d[\d,]*)\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet|sf)\b/i,
    /(?:total|floor|gross|living)\s*area[:\s]+(\d[\d,]*)/i,
    /\b(\d[\d,]{2,})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ""), 10);
      if (num >= 100 && num <= 99_999) return num;
    }
  }
  return null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // buildingType is now the exact Drive folder name (e.g. "Bungalow", "Single Family (2-Story)")
  const buildingType = searchParams.get("buildingType");

  if (!buildingType) {
    return NextResponse.json(
      { error: "Missing required query param: buildingType" },
      { status: 400 }
    );
  }

  // 1. Verify session
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Unauthorized — please connect your Google account." },
      { status: 401 }
    );
  }

  // 2. Get the parent folder ID (single env var)
  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER;
  if (!parentFolderId) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_PARENT_FOLDER is not set in .env.local." },
      { status: 500 }
    );
  }

  try {
    // 4. Build authenticated Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 5. List subfolders inside the parent folder
    const subfoldersRes = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      pageSize: 50,
    });

    const subfolders = subfoldersRes.data.files ?? [];

    // 6. Find the subfolder whose name matches buildingType (case-insensitive)
    const subfolder = subfolders.find(
      (f) => f.name?.toLowerCase() === buildingType.toLowerCase()
    );

    if (!subfolder?.id) {
      const available = subfolders.map((f) => f.name).join(", ");
      return NextResponse.json(
        {
          error: `Subfolder "${buildingType}" not found in Drive. Available folders: ${available || "none"}`,
        },
        { status: 404 }
      );
    }

    const subfolderFolderId = subfolder.id;

    // 7. Find Google Docs inside the matched subfolder
    const docsRes = await drive.files.list({
      q: `'${subfolderFolderId}' in parents and mimeType='application/vnd.google-apps.document' and trashed=false`,
      fields: "files(id, name)",
      pageSize: 10,
      orderBy: "modifiedTime desc",
    });

    const docs = docsRes.data.files ?? [];
    if (docs.length === 0) {
      return NextResponse.json(
        {
          error: `No Google Docs found in the "${subfolder.name}" subfolder. Add a Doc with square footage info to that folder.`,
        },
        { status: 404 }
      );
    }

    // 8. Export the most-recently-modified doc as plain text
    const doc = docs[0];
    const exportRes = await drive.files.export(
      { fileId: doc.id!, mimeType: "text/plain" },
      { responseType: "text" }
    );
    const docText = exportRes.data as string;

    // 9. Parse square footage
    const squareFootage = parseSquareFootage(docText);
    if (!squareFootage) {
      return NextResponse.json(
        {
          error:
            "Could not find a square footage value in the document. Make sure it contains text like '2,500 sq ft' or 'Square Footage: 2500'.",
          docPreview: docText.slice(0, 300),
        },
        { status: 422 }
      );
    }

    // 10. Calculate price estimate
    const priceEstimate = squareFootage * PRICE_PER_SQFT;

    // 11. Grab reference images from the same subfolder (used in Phase 4)
    const imagesRes = await drive.files.list({
      q: `'${subfolderFolderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: "files(id, name, mimeType)",
      pageSize: 5,
      orderBy: "name",
    });

    return NextResponse.json({
      buildingType,
      subfolderName: subfolder.name,
      docName: doc.name,
      squareFootage,
      priceEstimate,
      pricePerSqft: PRICE_PER_SQFT,
      referenceImages: imagesRes.data.files ?? [],
    });
  } catch (err: unknown) {
    console.error("[/api/drive] Error:", err);
    const message = err instanceof Error ? err.message : "Unexpected Drive API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
