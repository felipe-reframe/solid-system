"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { AppSettings } from "@/app/page";
import type { ColorPaletteItem } from "@/lib/palettes";

interface OptionItem {
  value: string;
  label: string;
}

interface ConfigSidebarProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  buildingTypes: OptionItem[];
  buildingTypesLoading?: boolean;
  architectureStyles: OptionItem[];
  colorPalettes: ColorPaletteItem[];
}

export function ConfigSidebar({
  settings,
  onSettingsChange,
  buildingTypes,
  buildingTypesLoading = false,
  architectureStyles,
  colorPalettes,
}: ConfigSidebarProps) {
  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const selectedPalette = colorPalettes.find((p) => p.value === settings.colorPalette);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-0.5">
        <h4 className="font-semibold text-sm">Configuration</h4>
        <p className="text-xs text-muted-foreground">
          Customize your Reframe building parameters.
        </p>
      </div>

      <Separator />

      <div className="space-y-5">
        {/* Building Type */}
        <div className="space-y-1.5">
          <Label htmlFor="building-type" className="text-xs font-medium">
            Building Type
          </Label>
          <Select
            value={settings.buildingType}
            onValueChange={(v) => updateSetting("buildingType", v)}
            disabled={buildingTypesLoading || buildingTypes.length === 0}
          >
            <SelectTrigger id="building-type" className="h-8 text-sm w-full">
              <SelectValue
                placeholder={
                  buildingTypesLoading
                    ? "Loading…"
                    : "Connect Drive to load types"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {buildingTypes.map((type) => (
                <SelectItem
                  key={type.value}
                  value={type.value}
                  className="text-sm"
                >
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Architecture Style */}
        <div className="space-y-1.5">
          <Label htmlFor="arch-style" className="text-xs font-medium">
            Architecture Style
          </Label>
          <Select
            value={settings.architectureStyle}
            onValueChange={(v) => updateSetting("architectureStyle", v)}
          >
            <SelectTrigger id="arch-style" className="h-8 text-sm w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {architectureStyles.map((style) => (
                <SelectItem
                  key={style.value}
                  value={style.value}
                  className="text-sm"
                >
                  {style.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Color Palette */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Color Palette</Label>

          {/* Palette cards */}
          <div className="space-y-1.5">
            {colorPalettes.map((palette) => {
              const isSelected = settings.colorPalette === palette.value;
              return (
                <button
                  key={palette.value}
                  onClick={() => updateSetting("colorPalette", palette.value)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border bg-muted/20 hover:border-border/80 hover:bg-muted/40"
                  }`}
                >
                  {/* Swatch dots */}
                  <div className="flex items-center gap-1 shrink-0">
                    {palette.swatches.map((color, i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full border border-black/10 shadow-sm"
                        style={{
                          backgroundColor: color,
                          width: i === 0 ? "14px" : "10px",
                          height: i === 0 ? "14px" : "10px",
                        }}
                      />
                    ))}
                  </div>

                  {/* Label */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-[11px] font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {palette.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                      {palette.description}
                    </p>
                  </div>

                  {/* Selected indicator */}
                  {isSelected && (
                    <span className="shrink-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary">
                      <svg className="h-2 w-2 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Add ADU Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label
              htmlFor="adu-toggle"
              className="text-xs font-medium cursor-pointer"
            >
              Add ADU
            </Label>
            <p className="text-xs text-muted-foreground">
              Include an Accessory Dwelling Unit
            </p>
          </div>
          <Switch
            id="adu-toggle"
            checked={settings.addADU}
            onCheckedChange={(v) => updateSetting("addADU", v)}
          />
        </div>
      </div>
    </div>
  );
}
