# CLAUDE.md — Reframe Feasibility Tool

This file documents lessons learned, architectural decisions, and contributor guidance for the Reframe Feasibility Tool. Future AI agents and human contributors should read this before making changes.

---

## Project Overview

A Next.js 14 web application that lets users enter any US address and instantly receive:
- A photorealistic AI site rendering (Google Street View + Gemini image generation)
- Local zoning analysis (Gemini-powered research via Google Search grounding)
- Cost estimate (pulled from Google Drive folder structure)
- Project schedule estimate

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | NextAuth.js v4 (Google OAuth) |
| AI | Google Gemini (`@google/genai`) |
| Maps | `@vis.gl/react-google-maps` |
| Drive | Google Drive API v3 via `googleapis` |
| Deployment | Vercel (recommended) |

---

## Architecture Decisions

### 1. Google Drive as CMS for Building Types
- Building types are Google Drive subfolder names under a configured parent folder (`GOOGLE_DRIVE_PARENT_FOLDER`)
- Images inside each subfolder are used as reference photos for Gemini rendering
- This means non-engineers can add new building types by creating a folder in Drive
- **Lesson**: Always handle Drive fetch failures gracefully — proceed without reference images rather than failing the whole render

### 2. Gemini Image Generation
- Uses `gemini-3-pro-image-preview` via `v1beta` API version
- The model ID and API version **must** be passed correctly; wrong values silently fail
- Use `httpOptions: { apiVersion: "v1beta" }` when constructing `GoogleGenAI`
- Response modalities must explicitly include `["IMAGE", "TEXT"]`
- Always surface Gemini's text response when no image is returned — it often contains a helpful explanation

### 3. Street View as Background
- Fetch Street View at `640x480`, `fov=75`, `pitch=2`, `source=outdoor`
- These parameters give the best balance of building detail and minimal distortion
- Convert to base64 immediately and pass as the first inline image to Gemini
- **Lesson**: Street View returns a gray "no imagery" image (not an error) if no panorama exists at a location — handle this gracefully

### 4. Prompt Engineering for Photorealistic Composites
- Frame Gemini as a **licensed architect and visualization specialist** — this dramatically improves output quality
- Structure the prompt with clear sections: INPUT IMAGES, TASK, PRESERVE, COLOR PALETTE, BUILDING SPEC, QUALITY BAR
- The "what not to modify" section is as important as "what to generate" — be explicit about preserving sky, street, neighbors, infrastructure
- Provide color palette as both a semantic description and hex color references
- Always tell the model to adapt colors to real-world lighting (no flat swatches)

### 5. Color Palettes
- Palettes are defined client-side in `app/page.tsx` (`COLOR_PALETTES`) and server-side in `app/api/render/route.ts` (`COLOR_PALETTE_LABELS`)
- They must be kept in sync — if you add a palette, add it to both places
- The palette value (slug) is the shared key
- Palette swatches are rendered as color dots in the UI; first dot is largest (dominant color)

### 6. Authentication Flow
- Google OAuth via NextAuth.js
- The `accessToken` is stored in the JWT session and used server-side to call Drive
- Drive API calls are non-blocking for the render — if auth fails, render proceeds without reference images
- `session.accessToken` typing requires a custom `types/next-auth.d.ts` extension

### 7. State Management
- All app state lives in the root `page.tsx` component using `useState`
- Settings (`AppSettings`) flow down through props; no global state manager needed at this scale
- Changes to `selectedPlace`, `architectureStyle`, `colorPalette`, or `buildingType` trigger new API calls via `useEffect`
- **Lesson**: Be careful about `useEffect` dependency arrays — missing a setting key means the render won't re-trigger when that setting changes

---

## File Structure

```
app/
  page.tsx              # Root component: all state, layout, section components
  layout.tsx            # Root layout with SessionWrapper
  globals.css           # Global Tailwind styles
  api/
    render/route.ts     # POST /api/render — Gemini image generation
    zoning/route.ts     # GET /api/zoning — Gemini zoning research
    drive/route.ts      # GET /api/drive — Cost data from Drive
    drive/folders/route.ts  # GET /api/drive/folders — Building type list
    auth/[...nextauth]/route.ts  # NextAuth handler
components/
  ConfigSidebar.tsx     # Configuration panel (building type, style, palette, ADU)
  AddressSearch.tsx     # Google Places autocomplete
  AuthButton.tsx        # Sign in / sign out button
  SessionWrapper.tsx    # NextAuth SessionProvider wrapper
  ui/                   # shadcn/ui primitives
lib/
  auth.ts               # NextAuth authOptions
public/
  reframe-logo-mark.svg # Official Reframe house logo mark (green)
  logo-full.svg         # Older full wordmark (kept for reference)
types/
  next-auth.d.ts        # Extended NextAuth types (accessToken on session)
```

---

## Environment Variables

```env
NEXTAUTH_SECRET=           # Required: random secret for NextAuth JWT signing
NEXTAUTH_URL=              # Required: full URL of the app (e.g. http://localhost:3000)
GOOGLE_CLIENT_ID=          # Google OAuth client ID
GOOGLE_CLIENT_SECRET=      # Google OAuth client secret
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # Google Maps API key (Street View + Places)
GEMINI_API_KEY=            # Google Gemini API key
GOOGLE_DRIVE_PARENT_FOLDER=  # Drive folder ID containing building-type subfolders
```

---

## Common Gotchas

1. **Gemini model availability**: The `gemini-3-pro-image-preview` model requires allowlisting. If unavailable, the API returns a text error instead of an image — always check `parts` for text when no image is found.

2. **Drive folder casing**: Folder matching is case-insensitive (`toLowerCase()` on both sides). Keep this when adding new matching logic.

3. **Street View "grey image"**: Google returns HTTP 200 with a grey placeholder image when no panorama exists. Check image content or add metadata API call to detect this.

4. **NextAuth JWT size**: Storing the full access token in the JWT can hit cookie size limits if the token is large. If sessions break, consider storing tokens server-side.

5. **Color palette sync**: `COLOR_PALETTES` (client) and `COLOR_PALETTE_LABELS` (server) must be kept in sync. If a palette is selected but not found server-side, it falls back gracefully to the slug.

6. **Render re-triggering**: The render `useEffect` depends on `[selectedPlace, buildingType, architectureStyle, colorPalette]`. Adding new render-influencing settings requires adding them to this array.

7. **shadcn/ui imports**: Components are in `components/ui/`. Do not import from `@/components` directly for primitives — use the full path.

---

## Future Work / Roadmap Ideas

- **Permit research**: Integrate with local permit databases or planning department APIs
- **3D site model**: Generate a top-down site plan alongside the street rendering
- **Multiple renders**: Generate renders for different times of day or seasons
- **PDF export**: Package zoning + render + cost estimate into a shareable PDF
- **Saved searches**: Let signed-in users save and revisit address analyses
- **Mobile responsiveness**: Current layout is desktop-first; needs responsive breakpoints for mobile
- **Real cost data**: Replace the Drive-based estimates with a live pricing API
- **ADU rendering**: Currently the ADU toggle only adjusts cost; it should also affect the render prompt

---

## Contributor Guidelines

1. Keep the prompt in `api/render/route.ts` well-structured — sections separated by `━━━` headers improve readability and Gemini comprehension
2. Test renders with a variety of address types: urban row houses, suburban lots, rural properties
3. Do not add client-side API keys or secrets — all sensitive calls go through Next.js API routes
4. Keep `AppSettings` in `app/page.tsx` as the single source of truth for configurable render parameters
5. When adding new sidebar sections, follow the existing pattern: separate section component function, props-driven, no internal state
6. Run `npm run build` before committing to catch TypeScript errors early
