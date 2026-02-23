export interface ColorPaletteItem {
  value: string;
  label: string;
  description: string;
  swatches: string[];
}

export const COLOR_PALETTES: ColorPaletteItem[] = [
  {
    value: "warm-earth",
    label: "Warm Earth",
    description: "Terracotta, sand, and warm taupe with bronze accents",
    swatches: ["#C17F5A", "#D4B896", "#8B6E52", "#E8D5B7"],
  },
  {
    value: "coastal-calm",
    label: "Coastal Calm",
    description: "Soft greys, white, and weathered blue with crisp trim",
    swatches: ["#B8C9D4", "#EAEEF0", "#6E8FA0", "#D6E0E5"],
  },
  {
    value: "forest-modern",
    label: "Forest Modern",
    description: "Deep charcoal, sage green, and natural wood tones",
    swatches: ["#3D4A3E", "#7A9177", "#2C3030", "#B5C4AD"],
  },
  {
    value: "urban-contrast",
    label: "Urban Contrast",
    description: "Bold black and white with matte concrete and steel",
    swatches: ["#1A1A1A", "#F0F0F0", "#5A5A5A", "#C8C8C8"],
  },
  {
    value: "desert-sunrise",
    label: "Desert Sunrise",
    description: "Warm white, dusty rose, and burnt orange with clay accents",
    swatches: ["#F2E8DC", "#D9927A", "#C4714F", "#EDD5C0"],
  },
];
