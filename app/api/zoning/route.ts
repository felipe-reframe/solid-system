import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Gemini model used for zoning analysis.
 * Requires Google Search Grounding to be available on this model.
 */
const GEMINI_MODEL = "gemini-2.0-flash";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ZoningData {
  district: string;
  description: string;
  permittedUses: string[];
  setbacks: { front: string; rear: string; side: string };
  maxHeight: string;
  maxFAR: string;
  lotCoverage: string;
  sources: string[];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json(
      { error: "Missing required query param: address" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured in .env.local." },
      { status: 500 }
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `You are a land-use and zoning research assistant. Use Google Search to look up the current zoning regulations for the following US address, then return the results as a JSON object.

Address: ${address}

Return ONLY a valid JSON object — no markdown fences, no extra text, no explanation. Use this exact schema:

{
  "district": "Zoning district code and full name (e.g. 'R-2 Two-Family Residential')",
  "description": "One or two sentence plain-English description of what this zone allows.",
  "permittedUses": ["Permitted use 1", "Permitted use 2", "Permitted use 3"],
  "setbacks": {
    "front": "X ft",
    "rear": "X ft",
    "side": "X ft"
  },
  "maxHeight": "X ft (X stories)",
  "maxFAR": "X.XX",
  "lotCoverage": "XX%",
  "sources": ["Source name or URL 1", "Source name or URL 2"]
}

Rules:
- Use real data from the municipality's zoning ordinance or official GIS portal.
- If a specific value cannot be determined, set it to "N/A".
- permittedUses should list 3–6 of the most relevant uses for residential/mixed-use zones.
- sources should reference the official municipal source(s) you found.
- Return valid JSON only — the response will be parsed by JSON.parse().`;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const raw = response.text ?? "";

    // Strip any accidental markdown code fences before parsing
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    // Extract the first JSON object from the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        {
          error:
            "Gemini did not return a parseable JSON object. Try again or check the raw preview.",
          rawPreview: raw.slice(0, 500),
        },
        { status: 422 }
      );
    }

    const zoningData: ZoningData = JSON.parse(jsonMatch[0]);
    return NextResponse.json(zoningData);
  } catch (err: unknown) {
    console.error("[/api/zoning] Error:", err);
    const message =
      err instanceof Error ? err.message : "Unexpected Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
