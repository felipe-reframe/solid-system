import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/drive/folders
 * Returns the list of subfolders inside GOOGLE_DRIVE_PARENT_FOLDER.
 * Used by the frontend to populate the Building Type selector dynamically.
 */
export async function GET() {
  // 1. Require an authenticated session
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json(
      { error: "Unauthorized — please connect your Google account." },
      { status: 401 }
    );
  }

  const parentFolderId = process.env.GOOGLE_DRIVE_PARENT_FOLDER;
  if (!parentFolderId) {
    return NextResponse.json(
      { error: "GOOGLE_DRIVE_PARENT_FOLDER is not set in .env.local." },
      { status: 500 }
    );
  }

  try {
    // 2. Build authenticated Drive client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    oauth2Client.setCredentials({ access_token: session.accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2Client });

    // 3. List subfolders alphabetically
    const res = await drive.files.list({
      q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: "files(id, name)",
      orderBy: "name",
      pageSize: 50,
    });

    const folders = (res.data.files ?? []).map((f) => ({
      id: f.id!,
      name: f.name!,
    }));

    return NextResponse.json({ folders });
  } catch (err: unknown) {
    console.error("[/api/drive/folders] Error:", err);
    const message =
      err instanceof Error ? err.message : "Unexpected Drive API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
