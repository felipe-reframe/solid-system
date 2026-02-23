# Reframe Feasibility Tool

An AI-powered web application that helps Reframe Systems and their clients instantly evaluate the feasibility of a new construction project on any US address — generating a photorealistic site rendering, local zoning analysis, and cost estimate in seconds.

---

## What It Does

Enter any US street address and the tool will:

1. **AI Site Rendering** — Fetches the current Google Street View photo and uses Google Gemini's image generation to composite a photorealistic rendering of a Reframe prefab building on the lot. Supports multiple architecture styles and exterior color palettes.

2. **Zoning Analysis** — Automatically researches the local zoning district, permitted uses, setbacks, maximum height, FAR, and lot coverage using Gemini with Google Search grounding.

3. **Cost Estimate** — Pulls building type specifications and pricing from a connected Google Drive folder, calculating a total project cost estimate with optional ADU addition.

4. **Before / After Toggle** — After rendering, users can switch between the original Street View photo and the AI-generated composite.

---

## Tech Stack

- **Next.js 14** (App Router) with TypeScript
- **Tailwind CSS** + [shadcn/ui](https://ui.shadcn.com/) for UI components
- **NextAuth.js v4** for Google OAuth authentication
- **Google Gemini** (`@google/genai`) for image generation and zoning research
- **Google Maps / Street View** for site photography
- **Google Drive API** for building type data and reference images

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Google Cloud project with the following APIs enabled:
  - Google Maps JavaScript API
  - Street View Static API
  - Places API
  - Google Drive API
  - Google Gemini API
- OAuth 2.0 credentials (for Drive access)
- A Gemini API key

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file at the root:

```env
# NextAuth
NEXTAUTH_SECRET=your-random-secret
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (for Drive access)
GOOGLE_CLIENT_ID=your-oauth-client-id
GOOGLE_CLIENT_SECRET=your-oauth-client-secret

# Google Maps (Street View + Places Autocomplete)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-maps-api-key

# Gemini
GEMINI_API_KEY=your-gemini-api-key

# Google Drive folder containing building-type subfolders
GOOGLE_DRIVE_PARENT_FOLDER=your-drive-folder-id
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Google Drive Setup

The tool uses a Google Drive folder as a lightweight CMS for building types and pricing:

```
Parent Folder (GOOGLE_DRIVE_PARENT_FOLDER)
├── Single Family (2-Story)/
│   ├── reference-front.jpg
│   ├── reference-side.jpg
│   └── ...
├── Bungalow/
│   └── ...
└── ...
```

- Each **subfolder** becomes a selectable Building Type in the UI
- **Images** inside each subfolder are used as reference photos for the Gemini rendering
- **Google Sheets or Docs** inside the folder can store pricing data (see `/api/drive/route.ts`)

Users must sign in with Google to access Drive data. Rendering and zoning analysis work without authentication.

---

## Configuration Options

Users can customize the rendering via the sidebar:

| Setting | Description |
|---|---|
| **Building Type** | Loaded from Google Drive subfolders (requires sign-in) |
| **Architecture Style** | Modern Minimalist, Contemporary, Traditional, Industrial, Scandinavian |
| **Color Palette** | 5 curated exterior color palettes with hex color references passed to Gemini |
| **Add ADU** | Adds 500 sq ft to cost estimate for an Accessory Dwelling Unit |

### Color Palettes

| Palette | Character |
|---|---|
| Warm Earth | Terracotta, sand, and warm taupe with bronze accents |
| Coastal Calm | Soft greys, white, and weathered blue with crisp trim |
| Forest Modern | Deep charcoal, sage green, and natural wood tones |
| Urban Contrast | Bold black and white with matte concrete and steel |
| Desert Sunrise | Warm white, dusty rose, and burnt orange with clay accents |

---

## Project Structure

```
app/
  page.tsx                      # Root page: all layout, state, and section components
  layout.tsx                    # Root layout with SessionProvider
  api/
    render/route.ts             # POST: Gemini image generation
    zoning/route.ts             # GET: Gemini zoning research
    drive/route.ts              # GET: Cost data from Drive
    drive/folders/route.ts      # GET: Building type list from Drive
    auth/[...nextauth]/route.ts # NextAuth handler
components/
  ConfigSidebar.tsx             # Settings panel (type, style, palette, ADU)
  AddressSearch.tsx             # Google Places autocomplete
  AuthButton.tsx                # Sign in/out
  SessionWrapper.tsx            # SessionProvider wrapper
  ui/                           # shadcn/ui primitives
lib/
  auth.ts                       # NextAuth authOptions
public/
  reframe-logo-mark.svg         # Reframe house mark logo
```

---

## Development Notes

See [CLAUDE.md](./CLAUDE.md) for detailed architecture decisions, common gotchas, and contributor guidelines.

---

## License

Proprietary — Reframe Systems. All rights reserved.
