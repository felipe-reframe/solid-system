"use client";

import { useState, useCallback, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { Sparkles, Loader2, AlertCircle, LogIn, RotateCcw } from "lucide-react";
import { AddressSearch } from "@/components/AddressSearch";
import { ConfigSidebar } from "@/components/ConfigSidebar";
import { AuthButton } from "@/components/AuthButton";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { COLOR_PALETTES } from "@/lib/palettes";

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface PlaceResult {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

export interface AppSettings {
  buildingType: string;
  architectureStyle: string;
  colorPalette: string;
  addADU: boolean;
}

interface DriveData {
  buildingType: string;
  docName: string;
  squareFootage: number;
  priceEstimate: number;
  pricePerSqft: number;
  referenceImages: { id: string; name: string; mimeType: string }[];
}

interface ZoningData {
  district: string;
  description: string;
  permittedUses: string[];
  setbacks: { front: string; rear: string; side: string };
  maxHeight: string;
  maxFAR: string;
  lotCoverage: string;
  sources: string[];
}

interface RenderData {
  imageData: string;
  mimeType: string;
  streetViewBase64: string;
}

// ─── Static option data ───────────────────────────────────────────────────────

const ARCHITECTURE_STYLES = [
  { value: "modern-minimalist", label: "Modern Minimalist" },
  { value: "contemporary", label: "Contemporary" },
  { value: "traditional", label: "Traditional" },
  { value: "industrial", label: "Industrial" },
  { value: "scandinavian", label: "Scandinavian" },
];


// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

// ─── Sidebar: Cost Estimate section ──────────────────────────────────────────

function SidebarCostSection({
  loading,
  error,
  data,
  isSignedIn,
  addADU,
}: {
  loading: boolean;
  error: string | null;
  data: DriveData | null;
  isSignedIn: boolean;
  addADU: boolean;
}) {
  // ADU adjustment: +500 sq ft when enabled
  const aduSqft = addADU ? 500 : 0;
  const adjustedSqft = data ? data.squareFootage + aduSqft : 0;
  const adjustedTotal = data ? adjustedSqft * data.pricePerSqft : 0;

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span className="text-base">💰</span> Cost Estimate
      </h4>

      {/* Not signed in */}
      {!isSignedIn && (
        <div className="rounded-lg bg-muted/40 border border-dashed border-border p-3 flex flex-col items-center gap-2 text-center">
          <LogIn className="h-4 w-4 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground">
            Connect Google Drive to load cost data
          </p>
          <Button
            size="sm"
            variant="outline"
            className="text-xs mt-0.5 h-7"
            onClick={() => signIn("google")}
          >
            Connect Drive
          </Button>
        </div>
      )}

      {/* Loading */}
      {isSignedIn && loading && (
        <div className="h-16 rounded-lg bg-muted/40 flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Fetching Drive data…
        </div>
      )}

      {/* Error */}
      {isSignedIn && !loading && error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="line-clamp-3">{error}</span>
        </div>
      )}

      {/* Data */}
      {isSignedIn && !loading && data && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
          {/* Total */}
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] text-muted-foreground">Est. Total</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(adjustedTotal)}
            </span>
          </div>

          {/* Breakdown */}
          <div className="space-y-1 border-t border-border/50 pt-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{formatNumber(data.squareFootage)} sq ft</span>
              <span className="text-muted-foreground/60">×</span>
              <span>{formatCurrency(data.pricePerSqft)} / sq ft</span>
            </div>
            {/* ADU line — only when enabled */}
            {addADU && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-primary/80">+ 500 sq ft ADU</span>
                <span className="text-primary/80">{formatCurrency(500 * data.pricePerSqft)}</span>
              </div>
            )}
          </div>

          {/* Total sqft when ADU is on */}
          {addADU && (
            <div className="flex items-center justify-between text-[11px] border-t border-border/50 pt-1.5 font-medium">
              <span className="text-muted-foreground">Total</span>
              <span>{formatNumber(adjustedSqft)} sq ft</span>
            </div>
          )}

          {data.referenceImages.length > 0 && (
            <p className="text-[10px] text-primary/70 border-t border-border/50 pt-1.5">
              ✓ {data.referenceImages.length} reference image
              {data.referenceImages.length !== 1 ? "s" : ""} found
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar: Schedule section (mock) ────────────────────────────────────────

function SidebarScheduleSection() {
  const today = new Date();
  const completion = new Date(today);
  completion.setDate(today.getDate() + 91);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span className="text-base">📅</span> Schedule
        <span className="ml-auto text-[9px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
          Est.
        </span>
      </h4>

      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">Project Start</span>
          <span className="font-medium">{fmt(today)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] border-t border-border/50 pt-2">
          <span className="text-muted-foreground">Est. Completion</span>
          <span className="font-semibold text-primary">{fmt(completion)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] border-t border-border/50 pt-2">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium">91 days</span>
        </div>
      </div>

      <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
        Estimated timeline — subject to permitting and site conditions.
      </p>
    </div>
  );
}

// ─── Sidebar: Zoning Analysis section ────────────────────────────────────────

function SidebarZoningSection({
  loading,
  error,
  data,
}: {
  loading: boolean;
  error: string | null;
  data: ZoningData | null;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm flex items-center gap-2">
        <span className="text-base">📋</span> Zoning Analysis
      </h4>

      {/* Loading */}
      {loading && (
        <div className="h-16 rounded-lg bg-muted/40 flex items-center justify-center gap-2 text-muted-foreground text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Researching zoning…
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex gap-2 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span className="line-clamp-3">{error}</span>
        </div>
      )}

      {/* Data */}
      {!loading && data && (
        <div className="space-y-2.5">
          {/* District */}
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5">
            <p className="text-[11px] font-semibold text-primary truncate">
              {data.district}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
              {data.description}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-1 text-center">
            {[
              { label: "Height", value: data.maxHeight },
              { label: "FAR", value: data.maxFAR },
              { label: "Lot Cov.", value: data.lotCoverage },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-md bg-muted/40 border border-border p-1.5"
              >
                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">
                  {label}
                </p>
                <p className="text-[11px] font-medium truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Setbacks */}
          <div className="rounded-md bg-muted/30 border border-border p-2 space-y-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium">
              Setbacks
            </p>
            <div className="grid grid-cols-3 gap-1 text-center text-[10px]">
              {[
                { label: "Front", value: data.setbacks.front },
                { label: "Rear", value: data.setbacks.rear },
                { label: "Side", value: data.setbacks.side },
              ].map(({ label, value }) => (
                <div key={label}>
                  <span className="text-muted-foreground">{label}: </span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Permitted uses */}
          {data.permittedUses.length > 0 && (
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide font-medium mb-1">
                Permitted Uses
              </p>
              <ul className="space-y-0.5">
                {data.permittedUses.slice(0, 4).map((use) => (
                  <li
                    key={use}
                    className="text-[10px] text-muted-foreground flex gap-1.5 items-start"
                  >
                    <span className="mt-0.5 text-primary/60">•</span>
                    <span className="line-clamp-1">{use}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.sources.length > 0 && (
            <p className="text-[9px] text-muted-foreground/50 truncate">
              Source: {data.sources[0]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Left pane: Site Rendering / Hero ────────────────────────────────────────

function MainPane({
  selectedPlace,
  renderLoading,
  renderError,
  renderData,
  onPlaceSelect,
  onReset,
}: {
  selectedPlace: PlaceResult | null;
  renderLoading: boolean;
  renderError: string | null;
  renderData: RenderData | null;
  onPlaceSelect: (place: PlaceResult) => void;
  onReset: () => void;
}) {
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    if (renderData) setShowOriginal(false);
  }, [renderData]);

  const hasRendering = !renderLoading && renderData;

  // ── Rendered image view ──────────────────────────────────────────────────
  if (hasRendering) {
    return (
      <div className="relative w-full h-full flex flex-col">
        {/* Before / After toggle */}
        <div className="absolute top-4 left-4 z-10 flex gap-1 p-0.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border shadow-lg">
          <button
            onClick={() => setShowOriginal(false)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              !showOriginal
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            After
          </button>
          <button
            onClick={() => setShowOriginal(true)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              showOriginal
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Before
          </button>
        </div>

        {/* Full-pane image */}
        <div className="flex-1 overflow-hidden">
          <img
            key={showOriginal ? "before" : "after"}
            src={
              showOriginal
                ? `data:image/jpeg;base64,${renderData.streetViewBase64}`
                : `data:${renderData.mimeType};base64,${renderData.imageData}`
            }
            alt={showOriginal ? "Original Street View" : "AI site rendering"}
            className="w-full h-full object-cover animate-in fade-in duration-300"
          />
        </div>

        {/* Bottom bar: address + new search + disclaimer */}
        <div className="shrink-0 px-4 py-3 bg-background/80 backdrop-blur-sm border-t border-border flex items-center gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex h-2 w-2 shrink-0 rounded-full bg-primary" />
            <span className="text-xs text-muted-foreground truncate">
              {selectedPlace?.address}
            </span>
          </div>
          {/* New search button */}
          <button
            onClick={onReset}
            className="shrink-0 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-muted/50"
          >
            <RotateCcw className="h-3 w-3" />
            New search
          </button>
          <span className="shrink-0 text-[10px] text-muted-foreground/40 hidden md:block">
            AI visualization — illustrative only
          </span>
        </div>
      </div>
    );
  }

  // ── Hero / loading view ──────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-16">
      <div className="w-full max-w-xl space-y-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
          <Sparkles className="h-3 w-3" />
          AI-Powered Site Analysis
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Assess the Feasibility of Your{" "}
            <span className="text-primary">Reframe</span>{" "}
            Project
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Enter any US address to generate a photorealistic site rendering,
            local zoning analysis, and cost estimate — in seconds.
          </p>
        </div>

        {/* Address search */}
        <AddressSearch onPlaceSelect={onPlaceSelect} />

        {/* Analyzing state — with option to cancel */}
        {selectedPlace && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-2 duration-300">
              <span className="flex h-2 w-2 rounded-full bg-primary" />
              <span>
                Analyzing{" "}
                <span className="text-foreground font-medium">
                  {selectedPlace.address}
                </span>
              </span>
            </div>
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Change address
            </button>
          </div>
        )}

        {/* Rendering loading state */}
        {selectedPlace && renderLoading && (
          <div className="rounded-xl bg-card border border-border p-6 flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-300">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <div className="space-y-1 text-center">
              <p className="text-sm font-medium text-foreground">Generating site rendering…</p>
              <p className="text-xs opacity-60">Usually takes 15–30 seconds</p>
            </div>
          </div>
        )}

        {/* Rendering error */}
        {selectedPlace && renderError && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 flex gap-3 text-sm text-destructive text-left">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="line-clamp-4">{renderError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status: sessionStatus } = useSession();
  const isSignedIn = sessionStatus === "authenticated" && !!session;

  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    buildingType: "",
    architectureStyle: "modern-minimalist",
    colorPalette: "warm-earth",
    addADU: false,
  });

  const [buildingTypes, setBuildingTypes] = useState<{ value: string; label: string }[]>([]);
  const [buildingTypesLoading, setBuildingTypesLoading] = useState(false);

  const [driveData, setDriveData] = useState<DriveData | null>(null);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  const [zoningData, setZoningData] = useState<ZoningData | null>(null);
  const [zoningLoading, setZoningLoading] = useState(false);
  const [zoningError, setZoningError] = useState<string | null>(null);

  const [renderData, setRenderData] = useState<RenderData | null>(null);
  const [renderLoading, setRenderLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // ── Load building types from Drive folders ────────────────────────────────
  useEffect(() => {
    if (!isSignedIn) {
      setBuildingTypes([]);
      setSettings((prev) => ({ ...prev, buildingType: "" }));
      return;
    }
    let cancelled = false;
    setBuildingTypesLoading(true);
    fetch("/api/drive/folders")
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (res.ok && Array.isArray(json.folders)) {
          const types = (json.folders as { id: string; name: string }[]).map(
            (f) => ({ value: f.name, label: f.name })
          );
          setBuildingTypes(types);
          setSettings((prev) =>
            prev.buildingType ? prev : { ...prev, buildingType: types[0]?.value ?? "" }
          );
        }
      })
      .catch((err) => console.error("[buildingTypes]", err))
      .finally(() => { if (!cancelled) setBuildingTypesLoading(false); });
    return () => { cancelled = true; };
  }, [isSignedIn]);

  const handlePlaceSelect = useCallback((place: PlaceResult) => {
    setSelectedPlace(place);
  }, []);

  // ── Reset — clears all state and returns to hero ───────────────────────────
  const handleReset = useCallback(() => {
    setSelectedPlace(null);
    setDriveData(null);    setDriveError(null);
    setZoningData(null);   setZoningError(null);
    setRenderData(null);   setRenderError(null);
  }, []);

  // ── Fetch Drive data ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlace || !isSignedIn || !settings.buildingType) return;
    let cancelled = false;
    setDriveLoading(true); setDriveError(null); setDriveData(null);
    fetch(`/api/drive?buildingType=${encodeURIComponent(settings.buildingType)}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setDriveError(json.error ?? "Unknown Drive error.");
        else setDriveData(json as DriveData);
      })
      .catch((err: Error) => { if (!cancelled) setDriveError(err.message); })
      .finally(() => { if (!cancelled) setDriveLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPlace, settings.buildingType, isSignedIn]);

  // ── Fetch Zoning data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlace) return;
    let cancelled = false;
    setZoningLoading(true); setZoningError(null); setZoningData(null);
    fetch(`/api/zoning?address=${encodeURIComponent(selectedPlace.address)}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setZoningError(json.error ?? "Unknown zoning error.");
        else setZoningData(json as ZoningData);
      })
      .catch((err: Error) => { if (!cancelled) setZoningError(err.message); })
      .finally(() => { if (!cancelled) setZoningLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPlace]);

  // ── Fetch Site Rendering ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlace) return;
    let cancelled = false;
    setRenderLoading(true); setRenderError(null); setRenderData(null);
    fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: selectedPlace.address,
        lat: selectedPlace.lat,
        lng: selectedPlace.lng,
        buildingType: settings.buildingType,
        architectureStyle: settings.architectureStyle,
        colorPalette: settings.colorPalette,
      }),
    })
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          const detail = json.detail ? ` — ${json.detail}` : "";
          setRenderError((json.error ?? "Unknown render error.") + detail);
        } else setRenderData(json as RenderData);
      })
      .catch((err: Error) => { if (!cancelled) setRenderError(err.message); })
      .finally(() => { if (!cancelled) setRenderLoading(false); });
    return () => { cancelled = true; };
  }, [selectedPlace, settings.buildingType, settings.architectureStyle, settings.colorPalette]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <APIProvider apiKey={apiKey}>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">

        {/* ── Header ── */}
        <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-border/60 bg-background/90 backdrop-blur-md z-50">
          {/* Logo lockup — mark + wordmark */}
          <div className="flex items-center gap-3">
            {/* Reframe house mark */}
            <img
              src="/reframe-logo-mark.svg"
              alt=""
              aria-hidden="true"
              className="h-9 w-auto"
            />
            {/* Wordmark */}
            <div className="flex flex-col leading-none gap-0.5">
              <span className="font-semibold text-[17px] tracking-tight leading-none text-foreground">
                Reframe
              </span>
              <span className="text-[9px] font-medium tracking-[0.22em] text-muted-foreground uppercase leading-none">
                Systems
              </span>
            </div>
            {/* Divider + tool label */}
            <div className="hidden sm:block h-4 w-px bg-border/60 mx-1" />
            <span className="hidden sm:block text-muted-foreground/70 text-sm">
              Feasibility Tool
            </span>
          </div>

          <div className="flex items-center gap-3">
            {sessionStatus !== "loading" && <AuthButton />}
          </div>
        </header>

        {/* ── Body: Left pane + Right sidebar ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left: Main pane ── */}
          <main className="flex-1 overflow-hidden">
            <MainPane
              selectedPlace={selectedPlace}
              renderLoading={renderLoading}
              renderError={renderError}
              renderData={renderData}
              onPlaceSelect={handlePlaceSelect}
              onReset={handleReset}
            />
          </main>

          {/* ── Right: Always-visible sidebar ── */}
          <aside className="w-80 shrink-0 border-l border-border/60 overflow-y-auto bg-card/30 flex flex-col">

            <div className="p-5 space-y-5 flex-1">
              {/* Configuration */}
              <ConfigSidebar
                settings={settings}
                onSettingsChange={setSettings}
                buildingTypes={buildingTypes}
                buildingTypesLoading={buildingTypesLoading}
                architectureStyles={ARCHITECTURE_STYLES}
                colorPalettes={COLOR_PALETTES}
              />

              {/* Results — shown after address is selected */}
              {selectedPlace && (
                <>
                  <Separator />

                  {/* Cost Estimate with ADU adjustment */}
                  <SidebarCostSection
                    loading={driveLoading}
                    error={driveError}
                    data={driveData}
                    isSignedIn={isSignedIn}
                    addADU={settings.addADU}
                  />

                  <Separator />

                  {/* Schedule (mock — always 91 days) */}
                  <SidebarScheduleSection />

                  <Separator />

                  {/* Zoning Analysis */}
                  <SidebarZoningSection
                    loading={zoningLoading}
                    error={zoningError}
                    data={zoningData}
                  />
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </APIProvider>
  );
}
