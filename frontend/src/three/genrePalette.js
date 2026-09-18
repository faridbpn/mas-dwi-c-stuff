const PRESET_COLORS = {
  fiksi: "#5b8def",
  "non-fiksi": "#4caf6e",
  "self-help": "#f0a544",
  sejarah: "#a0522d",
  biografi: "#9b59b6",
  sains: "#00b8d9",
  bisnis: "#e74c3c",
};
const FALLBACK_PALETTE = ["#5b8def", "#4caf6e", "#f0a544", "#a0522d", "#9b59b6", "#00b8d9", "#e74c3c", "#c2185b"];

export const COMMON_GENRES = ["Fiksi", "Non-fiksi", "Self-help", "Sejarah", "Biografi", "Sains", "Bisnis"];

export function genreColor(genre) {
  const key = (genre || "").trim().toLowerCase();
  if (PRESET_COLORS[key]) return PRESET_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
}