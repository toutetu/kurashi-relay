# UI配色・密度ガイド

## 母向けカラーパレット

| 色     | トークン                                                              | 主な用途                             |
| ------ | --------------------------------------------------------------------- | ------------------------------------ |
| 赤     | `--mother-red` / `--mother-red-strong` / `--mother-red-soft`          | 現在の活動、変更・終了操作、重要度   |
| 黄     | `--mother-yellow` / `--mother-yellow-strong` / `--mother-yellow-soft` | クイック記録、待機、補助情報         |
| 青     | `--mother-blue` / `--mother-blue-strong` / `--mother-blue-soft`       | 予定、ナビゲーション、選択状態、情報 |
| 白     | `--surface`                                                           | 通常カード、入力面、余白             |
| 濃い紺 | `--text`                                                              | 本文、見出し、重要な数値             |

赤・黄・青は、カード上端の色帯、明るいアイコン背景、小さな状態チップ、選択状態に偏りなく使う。白い面を十分に残し、本文は濃い紺で読む。

## 娘向けカラーパレット

`--daughter-blue`、`--daughter-blue-strong`、`--daughter-purple`、`--daughter-purple-soft`、`--daughter-pink`、`--daughter-text` を使用する。水色と紫を基本に、リボン・月・星の装飾は控えめに使う。母向けの赤・黄・青の密度方針は娘向けカードへ持ち込まない。

## 文字・背景・状態

- 通常本文は `--text` と白または淡色背景を組み合わせる。
- 補助文は `--muted-text` を使い、背景との十分なコントラストを確保する。
- ボタンは通常・ホバー・押下・フォーカス・無効・処理中の状態を区別する。通常時は控えめな影、hover可能な端末では最大1pxの浮き、押下時は2px下移動・`scale(0.99)`・小さい影を使う。フォーカスは `--focus` の3pxアウトラインを使い、disabled時は移動も影も付けない。
- 成功・失敗・未保存などの処理結果は、押下表現だけでなく文言、状態表示、トーストを併用する。
- 重要・待機・予定などの状態は、色だけで表さない。アイコン、ラベル、数値、枠線または補助文を併用する。

## カード tone と密度

- `white`: 一般情報、対応事項
- `blue`: 予定、活動開始、ラストウォー
- `yellow`: クイック記録、時間の内訳
- `red`: 現在の活動、状態入力、予定への影響
- `daughter`: 娘の今日の作戦

`compact` はPCホームの要点表示に使う。余白・見出し・リスト行間を縮めるが、操作ボタンは44px以上を維持する。`regular` は詳細を読む画面や、十分な説明が必要なカードに使う。

### DashboardCard tone とトークン

| tone       | 背景                         | 枠線・上端アクセント                                | アイコン背景・色                                                 | 本文                   |
| ---------- | ---------------------------- | --------------------------------------------------- | ---------------------------------------------------------------- | ---------------------- |
| `neutral`  | `--card-neutral-background`  | `--card-neutral-border` / `--card-neutral-accent`   | `--card-neutral-icon-background` / `--card-neutral-icon-color`   | `--card-neutral-text`  |
| `red`      | `--card-red-background`      | `--card-red-border` / `--card-red-accent`           | `--card-red-icon-background` / `--card-red-icon-color`           | `--card-red-text`      |
| `yellow`   | `--card-yellow-background`   | `--card-yellow-border` / `--card-yellow-accent`     | `--card-yellow-icon-background` / `--card-yellow-icon-color`     | `--card-yellow-text`   |
| `blue`     | `--card-blue-background`     | `--card-blue-border` / `--card-blue-accent`         | `--card-blue-icon-background` / `--card-blue-icon-color`         | `--card-blue-text`     |
| `daughter` | `--card-daughter-background` | `--card-daughter-border` / `--card-daughter-accent` | `--card-daughter-icon-background` / `--card-daughter-icon-color` | `--card-daughter-text` |

カードは `--card-radius`、`--card-shadow` を共通で使う。影は右下方向へ薄く落とし、上側へ広がる影やカード全体を浮かせるhover表現は使わない。母向けの値と娘向けの値は別のトークンとして管理する。

### Button tone・variantと状態

各toneは `--button-{tone}-background`、`text`、`border`、`icon`、`hover-background`、`hover-text`、`hover-border`、`hover-icon`、`active-background`、`active-border`、`disabled-background`、`disabled-text` を持つ。Button、QuickActionButton、ScoreControlはこれらを共通利用する。

| variant   | 通常                       | hover（fine pointerのみ）                | active                 | disabled                           |
| --------- | -------------------------- | ---------------------------------------- | ---------------------- | ---------------------------------- |
| `solid`   | toneの通常背景・文字・枠線 | 少し濃いtone背景とコントラストを保つ文字 | toneのactive背景・枠線 | toneのdisabled背景・文字、操作不可 |
| `soft`    | tone背景を淡く混ぜる       | 背景と枠線を少し強くする                 | active背景・枠線       | toneのdisabled背景・文字、操作不可 |
| `outline` | surface背景とtone枠線      | 薄いtone背景と強い枠線                   | active背景・枠線       | toneのdisabled背景・文字、操作不可 |
| `ghost`   | 透明背景                   | 薄いtone背景のみ表示                     | active背景・枠線       | toneのdisabled背景・文字、操作不可 |

hoverは `@media (hover: hover) and (pointer: fine)` に限定する。hover時は色変更と最大1pxの上移動、active時は2px下移動・0.99倍・小さい影を使う。disabledとloadingはhover・activeの色変更や移動を行わず、focusリングはどの状態でも維持する。

## レスポンシブ基準

- 0〜1199px: ホームは「記録」「今日」のタブで一群ずつ表示する。
- 1200px以上: タブを表示せず、ホームの2段を別々の3列グリッドへ再配置する。同じ段のカードは自然な最大高へそろえる。
- 200%表示では縦スクロールを許可し、文字と操作領域を縮めて収めようとしない。

## 実装ルール

今回以降、Reactコンポーネントへ新しい直接カラーコードを書かない。`frontend/src/styles/tokens.css` の意味を持つトークンを使う。例外が必要な場合も、まずトークン追加を検討する。母向け・娘向けのトークン、カードtone、ボタン状態はこのガイドを基準にする。

母向けのホームと娘向けの専用ページを混在させない。ホームは赤・黄・青・白を使う母向けのポップな構成とし、娘の状態・今日の作戦は水色・紫・控えめな月や星を使う `/child-plan` に分ける。娘本人の入力、母の確認、母の観察は、色だけでなく文字でも区別する。
