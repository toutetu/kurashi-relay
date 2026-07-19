# Cursor実装依頼: 夏休み対応 フロントエンド(PR2 `feat/musume-summer-frontend`)

あなた(Cursor composer-2.5)への実装依頼です。以下を厳密に守って実装してください。
**前提: バックエンドPR1(`feat/musume-summer-backend`)はマージ済み。**

## 正とするもの

1. **スペック**: `docs/wip/musume-summer/musume-summer-spec.md` の **§3・§6〜§8**。
2. **背景**: 同スペック §1 と `docs/design-decisions.md` の **DR-021**。
   「ママと決めた」が**未決定ではなく決定済み**を指すようになった点を必ず理解してから着手すること。
3. **API形はバックエンド実装が正**。型を書く前に必ず
   `backend/app/Services/Musume/MusumePlanService.php` の
   `formatPlanResponse()` と `getSummary()` を読み、実際のJSON形に型を合わせること。
   スペックと食い違ったら**バックエンド実装を正とし、その旨を報告**すること。

## 作業範囲: `frontend/` のみ

`backend/` と `docs/` は触らないでください。

## やること

### 1. 型・スキーマ(§7-3)

`src/features/musume/api/schemas/musumeSchema.ts`:
- カテゴリ enum に `tomorrow_plan` を追加。
- `planItemSchema` に `decided_with: z.enum(['mama']).nullable()`。
- plan から `today_state` / `tomorrow_items_state` / `start_state` を**削除**し、
  `start_decided_with` を追加。
- summary を §4-4 の形(`tomorrow_plans` + ネストした `decided_with` オブジェクト)に合わせる。

### 2. 決定状態は導出する(§3)

**`plan.*_state` への参照をすべて削除**し、次の規則で判定する:

| カード | 決定済みの条件 |
|---|---|
| いまから何する? | `items.today_task` が1件以上 |
| 明日なにする?(夏のみ) | `items.tomorrow_plan` が1件以上 |
| 明日 何がいる? | `items.tomorrow_item` が1件以上 |
| 明日 何時に起きる?(夏) | `wake_up_time` が非null |
| 何時間目から登校?(学校) | `school_start_period` が非null |

`src/features/musume/utils.ts` の `getTodayAnswer` / `getTomorrowItemsAnswer` /
`getStartAnswer` をこの規則に合わせて書き換える。

### 3. 新カード「🔮 明日 なにする?」(§6)

- **夏休みモード(`plan.mode === 'summer'`)のときだけ**、「🎒 明日 何がいる?」の**直上**に挿入。
  学校モードでは表示しない。
- `SUMMER_TOMORROW_PLAN_CHIPS = ["友達と遊ぶ","ゆっくりする","ママとお出かけ","塾に行く","宿題・勉強をする","その他"]`
  を `utils.ts` に追加。**複数選択可**。
- `OutlookSheetKind` に `"tomorrow_plan"` を追加し、`getPresetChips` / `getInitialSelected` /
  `buildInitialSelection` / タイトル・ヒントの分岐に足す。
- 「その他」の自由入力は**既存の `splitOtherTitle` + `msm-other-input` をそのまま使う**。
  新しい仕組みを作らないこと。

### 4. 「🎀 ママと決めた」ボタン(§7-1)

現状の「🎀 ママと決める」を置き換える。**意味が変わるので挙動も変わる**:

| ボタン | 挙動 |
|---|---|
| `これにする!` | 選択内容を保存。`decided_with` を送らない(= null) |
| `🎀 ママと決めた` | **選択内容を保存**し `decided_with: 'mama'` を付ける |
| `今は決めない` | 保存せず閉じる(現状のまま) |

- 現状の `onWithMama`(`PATCH` で state だけ書く)は**廃止**する。
- `handleSave(decidedWith: 'mama' | null)` の形に整理し、**保存処理を2本に分岐させないこと**。
  保存内容は2つのボタンで完全に同じで、違いは `decided_with` だけ。
- 起床時刻/登校時限カードでは `PATCH` に `start_decided_with: 'mama'` を
  `wake_up_time`(または `school_start_period`)と**同時に**載せる。
- 選択が空のまま「ママと決めた」を押した場合も `これにする!` と同じくクリア扱い。

### 5. 表示(§7-2)

- `decided_with === 'mama'` のカードは ans行の末尾に `🎀` を添える(例: `水筒・ぼうし 🎀`)。
- 母用 `src/features/koekake/components/KoekakeMusumeSummaryCard.tsx`:
  - `summary.decided_with.*` を見る形に変更。
  - **現状の `WITH_MAMA_LABEL` は「未決定」を意味する文言なので、意味が逆になる。必ず書き換える。**
    決定内容を隠して置き換えるのではなく、**内容を出したうえで** 🎀 を添えること。
  - 夏休みモードのとき「明日なにする?」(`summary.tomorrow_plans`)の行を追加。

### 6. テスト(§8・DR-017)

既存慣習(`vi.fn` の fetch モック。**MSWは使わない**)に従い
`MusumePage.test.tsx` / `queries.test.tsx` を改修し、§8の6項目を緑にする。

## 完了条件

- `frontend` で `npm run typecheck` / `npm run build` / `npm test -- --run` が**全緑**。
- `git grep -n "today_state\|tomorrow_items_state\|start_state\|with_mama"` が
  **`frontend/` 配下で0件**。

## 厳守事項

- `backend/` と `docs/` を変更しない。
- 新しいnpmパッケージを追加しない。
- 通信層は既存どおり**楽観更新せずサーバの返す plan 全体で上書き**(DR-008 / DR-010)。
- CSSは `--msm-*` のローカル変数作法を守り、色コードを直書きしない。
- おしごと・ままかじ・声かけの既存機能に手を入れない(むすめサマリー部分だけ §5 のとおり変更)。
- **`git commit` / `git push` をしない。**
- スペックと既存実装が食い違う箇所は勝手に判断せず**止めて報告**すること。
