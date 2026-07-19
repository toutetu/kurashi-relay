export type Task = {
  id: string;
  emoji: string;
  label: string;
  praise: string;
  count: number;
  tone: "lav" | "peri" | "mint";
};

export type Zombie = {
  id: string;
  emoji: string;
  name: string;
  rare?: boolean;
};

export const INITIAL_TASKS: Task[] = [
  {
    id: "okita",
    emoji: "⏰",
    label: "自分で起きた",
    praise: "自分で起きられたね！",
    count: 0,
    tone: "lav",
  },
  {
    id: "kigae",
    emoji: "👚",
    label: "自分で着替えた",
    praise: "自分で着替えられたね！",
    count: 1,
    tone: "lav",
  },
  {
    id: "fuku",
    emoji: "👕",
    label: "脱いだ服をかごに入れた",
    praise: "お洗濯の準備、ばっちり！",
    count: 0,
    tone: "peri",
  },
  {
    id: "shokki",
    emoji: "🥛",
    label: "食器を流しに運んだ",
    praise: "食器を運べたね！",
    count: 0,
    tone: "mint",
  },
  {
    id: "kaban",
    emoji: "🎒",
    label: "カバンを棚に置いた",
    praise: "カバン、ちゃんと定位置！",
    count: 0,
    tone: "lav",
  },
  {
    id: "suito",
    emoji: "🧴",
    label: "水筒を流しに出した",
    praise: "水筒、出せたね！",
    count: 0,
    tone: "peri",
  },
];

export const CHALLENGE = { emoji: "🕯️", label: "明日の支度をする" };

export const STAMP_SIZE = 10;
// 「びんの中身」＝これまでの貯まり（積み上げ式・毎日リセットしない, 要件8）。
// 今日の少ないタスクでも満月（10個）に届くよう、前日までの累積を初期値に持つ。
export const INITIAL_JAR = 6;
export const CARRYOVER_START = 3;
export const STREAK_DAYS = 3;
export const COIN_PER_FULL_MOON = 100;

export const ZOMBIES: Zombie[] = [
  { id: "pierrot", emoji: "🤡", name: "サーカスのピエロ" },
  { id: "exec", emoji: "🪓", name: "処刑人" },
  { id: "prisoner", emoji: "⛓️", name: "囚人" },
  { id: "testsub", emoji: "🧟", name: "実験体" },
  { id: "doll", emoji: "🎎", name: "日本人形" },
  { id: "vampire", emoji: "🧛", name: "吸血鬼", rare: true },
  { id: "demon", emoji: "👹", name: "悪魔・部族" },
];

export function countCompletedTasks(tasks: Task[]): number {
  return tasks.filter((task) => task.count > 0).length;
}

export function pickRandomZombie(): Zombie {
  const index = Math.floor(Math.random() * ZOMBIES.length);
  return ZOMBIES[index] ?? ZOMBIES[0];
}

export function getMoonPhaseLabel(count: number): { emoji: string; name: string } {
  if (count <= 0) return { emoji: "🌑", name: "新月" };
  if (count < 3) return { emoji: "🌒", name: "三日月" };
  if (count < 5) return { emoji: "🌓", name: "上弦の月" };
  if (count < 8) return { emoji: "🌔", name: "十三夜" };
  if (count < STAMP_SIZE) return { emoji: "🌕", name: "ぼんやり満月" };
  return { emoji: "🌕", name: "満月" };
}

export type ZukanEntry = {
  zombie: Zombie;
  collected: boolean;
  photoUrl?: string;
};

export const INITIAL_ZUKAN: ZukanEntry[] = ZOMBIES.map((zombie) => ({
  zombie,
  collected: true,
}));

export type Ride = {
  id: string;
  name: string;
  place: string;
  placeEmoji: string;
  done: boolean;
};

export const RIDES_2025: Ride[] = [
  {
    id: "r1",
    name: "ホラー・ナイト・アカデミー ～絶叫の15年～",
    place: "グラマシーパーク",
    placeEmoji: "🎭",
    done: true,
  },
  {
    id: "r2",
    name: "ファクトリー・オブ・フィアー ～ゾンビ・ツアー～",
    place: "ステージ 22",
    placeEmoji: "👣",
    done: true,
  },
  {
    id: "r3",
    name: "18番地の魔女 ～感情と戯れる魔女の館～",
    place: "ステージ 18",
    placeEmoji: "🚪",
    done: true,
  },
  {
    id: "r4",
    name: "バイオハザード レクイエム ザ・ダイブ",
    place: "ステージ 18",
    placeEmoji: "🧪",
    done: false,
  },
  {
    id: "r5",
    name: "チェンソーマン・ザ・カオス 4-D",
    place: "シネマ 4-D シアター",
    placeEmoji: "🎬",
    done: true,
  },
  {
    id: "r6",
    name: "貞子の呪い ～ダーク・ホラー・ライド～",
    place: "スペース・ファンタジー",
    placeEmoji: "🎢",
    done: true,
  },
  {
    id: "r7",
    name: "King Gnu「SO BAD」×ハリウッド・ドリーム",
    place: "ハリウッド・ドリーム",
    placeEmoji: "🎢",
    done: true,
  },
  {
    id: "r8",
    name: "チェンソーマン×ハリドリ ～IRIS OUT～",
    place: "バックドロップ",
    placeEmoji: "🎢",
    done: false,
  },
  {
    id: "r9",
    name: "Ado「唱」×ハリウッド・ドリーム",
    place: "バックドロップ",
    placeEmoji: "🎢",
    done: true,
  },
  {
    id: "r10",
    name: "三代目 J SOUL BROTHERS「Rat-tat-tat」",
    place: "バックドロップ",
    placeEmoji: "🎢",
    done: false,
  },
  {
    id: "r11",
    name: "更衣室",
    place: "ステージ 18",
    placeEmoji: "🚪",
    done: true,
  },
];

export const LIMITED_ZOMBIE: Zombie = {
  id: "limited2025",
  emoji: "🎃",
  name: "2025年の限定ゾンビ",
  rare: true,
};

export type Goods = {
  id: string;
  emoji: string;
  name: string;
  price: number;
};

export const GOODS: Goods[] = [
  { id: "badge", emoji: "🧷", name: "ハミクマ 缶バッジ", price: 1000 },
  { id: "pouch", emoji: "👜", name: "ハミクマ ポーチ", price: 2600 },
  { id: "keychain", emoji: "🔑", name: "ハミクマ キーチェーン", price: 3100 },
  { id: "plush", emoji: "🧸", name: "ハミクマ ぬいぐるみ", price: 6000 },
];

export const INITIAL_COINS = 400;

export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function zukanCaptionLines(name: string): string[] {
  if (name === "サーカスのピエロ") return ["サーカスの", "ピエロ"];
  return [name];
}

export function remainingMoonCountForGoods(price: number, coins: number): number {
  return Math.ceil((price - coins) / COIN_PER_FULL_MOON);
}
