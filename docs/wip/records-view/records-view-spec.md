# 実装指示書: 記録を見る最小画面(records-view)

- 判断の記録: DR-016(`docs/design-decisions.md`)
- 実装担当: Cursor(composer-2.5, fast: false)
- ブランチ: `feat/records-view-web`(フロントのみ。最新 main から切る)
- **前提: `feat/task-count-web`(`docs/wip/task-count/task-count-spec.md`)がマージ済みであること。**
  タスクの `count` / `last_record_id` フィールドを前提にする。

## 1. 目的

「記録できて、記録を見る」運用を始めるための、**閲覧専用の最小画面**。
母が「今日(あるいは昨日)それぞれ何を何回やったか」を見られればよい。
凝った集計・グラフは作らない。

## 2. 画面仕様

- ルート: `/records`。`frontend/src/App.tsx` の
  `<Route path="records" element={<PlaceholderPage page="records" />} />` を新ページに差し替える。
  ナビ導線(AppShell の「きろく」FAB)は既存のまま使える。
- ページ構成(上から):

  1. **日付ナビ**: `← 前の日 | 7月17日(金) | 次の日 →`
     - 初期表示は今日。「次の日」は今日より先へ進めない(未来日は disabled)
     - 今日以外を表示中は「きょうへもどる」リンクを出す
  2. **娘セクション**(見出し例「むすめ の きろく」)
  3. **母セクション**(見出し例「ママ の きろく」)

- 各セクションの中身:
  - タスクごとに1行: タスク名 + その日の回数(例「あいさつする ×3」)
  - **0回の行も表示する**が、色を薄くして目立たせない(「できていない」を責める見た目にしない。
    `docs/design-principles.md` の「せめない設計」参照)
  - セクション末尾に合計行: 「この日ぜんぶで ×N」(= summary の `today_done_count`)
- 閲覧専用。この画面からの記録追加・取り消しは**しない**。

## 3. データ取得

新しい API は作らない。既存 `GET /api/tasks?member=<child|mother>&date=YYYY-MM-DD` を
member 2種で並列 fetch する(react-query。既存 `useTasksQuery` は member 固定・当日前提なので、
`(member, date)` をキーにしたクエリを `features/records/` 側に用意するのがよい。
既存の zod スキーマ `tasksResponseSchema` を流用)。

- ローディング: 既存パターンに合わせたスケルトン or シンプルな「よみこみ中…」
- エラー: 既存の「せめない」エラーUIパターンを流用
  (例:「きろくをよみこめませんでした。もういちどためしてね」+ 再試行ボタン)。
  片方の member だけ失敗した場合も、成功した側は表示する。

## 4. デザイン

- 母向け画面なので B案v3 のトーン(`docs/design-principles.md` / `docs/ui-redesign-spec.md`)。
  既存の母側画面(mama-kaji 系)の見た目に寄せ、新しい色やコンポーネント体系を発明しない。
- モック無しで実装してよい。マージ前に Fable がデザインレビューし、実機で微調整する。

## 5. 実装ファイル(目安)

- `frontend/src/pages/RecordsPage.tsx`(新規)
- `frontend/src/features/records/`(クエリ・行コンポーネント。必要最小限)
- `frontend/src/App.tsx`(ルート差し替え)
- `frontend/src/pages/PlaceholderPage.tsx` から `records` エントリを削除

## 6. テスト・品質ゲート

- 主要ケースのテスト: 日付ナビで date クエリが変わる/0回の行が薄く表示される/
  未来日に進めない/エラー時に再試行できる
- lint / typecheck / test / build すべて緑

## 7. やらないこと(スコープ外)

- 週表示・月表示・グラフ・CSV出力
- タップ時刻(何時にやったか)の表示 → 将来の声かけレポート(K3)で検討
- この画面からの記録の追加・編集・取り消し
- 娘向けの見た目(この画面は母用。娘は従来どおり /oshigoto で見る)
