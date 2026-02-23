"use client";

import { Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

interface OptionItem {
  value: string;
  label: string;
}

interface SettingsMenuProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  buildingTypes: OptionItem[];
  buildingTypesLoading?: boolean;
  architectureStyles: OptionItem[];
}

export function SettingsMenu({
  settings,
  onSettingsChange,
  buildingTypes,
  buildingTypesLoading = false,
  architectureStyles,
}: SettingsMenuProps) {
  const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4" />
          {/* Dot indicator when ADU is enabled */}
          {settings.addADU && (
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 space-y-0.5">
          <h4 className="font-semibold text-sm">Configuration</h4>
          <p className="text-xs text-muted-foreground">
            Customize your Reframe building parameters.
          </p>
        </div>

        <Separator />

        <div className="p-4 space-y-5">
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
              <SelectTrigger id="building-type" className="h-8 text-sm">
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
              <SelectTrigger id="arch-style" className="h-8 text-sm">
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
      </PopoverContent>
    </Popover>
  );
}
