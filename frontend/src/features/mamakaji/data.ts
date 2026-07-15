export type KajiTask = {
  id: string;
  emoji: string;
  label: string;
  done: boolean;
  tone: "rasp" | "cara" | "sage" | "plum";
};

export const INITIAL_KAJI: KajiTask[] = [
  { id: "shokki", emoji: "🍽️", label: "食器を洗った", done: true, tone: "rasp" },
  { id: "sentaku", emoji: "🧺", label: "洗濯を回して干した", done: false, tone: "sage" },
  { id: "nanashi", emoji: "✨", label: "名もなき家事をやった", done: false, tone: "plum" },
  { id: "soji", emoji: "🧹", label: "床に掃除機をかけた", done: false, tone: "cara" },
  { id: "yuhan", emoji: "🍳", label: "夕飯を作った", done: false, tone: "rasp" },
];

export const KAJI_CHALLENGE = { emoji: "🫧", label: "換気扇をさっと拭く" };

export const STAMP_SIZE = 10;
export const INITIAL_JAR = 6;
export const STREAK_DAYS = 4;
export const POINT_PER_STAMP = 100;
export const TICKET_COST = 250;
export const INITIAL_POINTS = 190;

export type Sweet = {
  id: string;
  emoji: string;
  name: string;
  country: string;
  flag: string;
  rare?: boolean;
  recipe: [string, string, string];
  mapNote: string;
  culture: string;
};

export const SWEETS: Sweet[] = [
  {
    id: "lamington",
    emoji: "🟫",
    name: "ラミントン",
    country: "オーストラリア",
    flag: "🇦🇺",
    recipe: [
      "スポンジを四角に切る",
      "チョコにくぐらせる",
      "ココナッツをまぶす",
    ],
    mapNote: "南半球の広い国、オーストラリア。",
    culture:
      "オーストラリアの定番おやつ。記念日にもよく食べる、一口サイズの人気者。",
  },
  {
    id: "macaron",
    emoji: "🌈",
    name: "マカロン",
    country: "フランス",
    flag: "🇫🇷",
    rare: true,
    recipe: [
      "卵白と砂糖を泡立てる",
      "アーモンド粉と合わせて絞る",
      "クリームをはさむ",
    ],
    mapNote: "ヨーロッパの国、フランス。",
    culture:
      "パリの菓子店の看板スイーツ。色ごとに味がちがう、小さな宝石。",
  },
  {
    id: "pannacotta",
    emoji: "🍮",
    name: "パンナコッタ",
    country: "イタリア",
    flag: "🇮🇹",
    recipe: [
      "生クリームと牛乳を温める",
      "ゼラチンを溶かす",
      "冷やし固める",
    ],
    mapNote: "長ぐつの形の国、イタリア。",
    culture:
      "「煮たクリーム」という意味。北イタリア生まれのつるんとしたデザート。",
  },
  {
    id: "mooncake",
    emoji: "🥮",
    name: "月餅",
    country: "中国",
    flag: "🇨🇳",
    recipe: ["あんを丸める", "皮で包んで型に入れる", "こんがり焼く"],
    mapNote: "日本のとなり、中国。",
    culture: "中秋節に家族で月を見ながら分け合う、まんまるのお菓子。",
  },
];

export function countCompletedKaji(tasks: KajiTask[]): number {
  return tasks.filter((task) => task.done).length;
}

export function pickRandomSweet(): Sweet {
  const index = Math.floor(Math.random() * SWEETS.length);
  return SWEETS[index] ?? SWEETS[0];
}

export function pointsPerKaji(): number {
  return POINT_PER_STAMP / STAMP_SIZE;
}

export function remainingPointsForTicket(points: number): number {
  return Math.max(0, TICKET_COST - points);
}

export function remainingKajiForTicket(points: number): number {
  const perKaji = pointsPerKaji();
  if (perKaji <= 0) return 0;
  return Math.ceil(remainingPointsForTicket(points) / perKaji);
}
