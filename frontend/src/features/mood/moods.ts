export const moods = [
  { id: "sakura", emoji: "🌸", label: "さくら" },
  { id: "ai", emoji: "💙", label: "あい" },
  { id: "sora", emoji: "💧", label: "そら" },
  { id: "mori", emoji: "🌿", label: "もり" },
  { id: "yoru", emoji: "🌙", label: "よる" },
] as const;

export type MoodId = (typeof moods)[number]["id"];
