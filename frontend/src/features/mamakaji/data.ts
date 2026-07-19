export type KajiTask = {
  id: string;
  emoji: string;
  label: string;
  praise: string;
  count: number;
  tone: "rasp" | "cara" | "sage" | "plum";
};

export const INITIAL_KAJI: KajiTask[] = [
  {
    id: "shokki",
    emoji: "🍽️",
    label: "食器を洗った",
    praise: "食器、ぴかぴかになった！",
    count: 1,
    tone: "rasp",
  },
  {
    id: "sentaku",
    emoji: "🧺",
    label: "洗濯を回して干した",
    praise: "洗濯物、おひさまの香り！",
    count: 0,
    tone: "sage",
  },
  {
    id: "nanashi",
    emoji: "✨",
    label: "名もなき家事をやった",
    praise: "名もなき家事も、ちゃんと1個！",
    count: 0,
    tone: "plum",
  },
  {
    id: "soji",
    emoji: "🧹",
    label: "床に掃除機をかけた",
    praise: "床、きれいになった！",
    count: 0,
    tone: "cara",
  },
  {
    id: "yuhan",
    emoji: "🍳",
    label: "夕飯を作った",
    praise: "今日のごはんも、ありがとう！",
    count: 0,
    tone: "rasp",
  },
];

export type KajiChallenge = {
  emoji: string;
  label: string;
};

/** 日付（YYYY-MM-DD）から安定したインデックスを決め、同じ日は同じチャレンジにする */
export function pickDailyKajiChallenge(
  tasks: ReadonlyArray<KajiChallenge>,
  date: string,
): KajiChallenge | null {
  if (tasks.length === 0) return null;
  let seed = 0;
  for (let i = 0; i < date.length; i += 1) {
    seed = (seed * 31 + date.charCodeAt(i)) >>> 0;
  }
  return tasks[seed % tasks.length] ?? null;
}

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
  return tasks.filter((task) => task.count > 0).length;
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
