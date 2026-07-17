# Codex依頼: records-view(記録を見る画面)のレビューと品質ゲート実行

## 状況

- ブランチ `feat/records-view-web`(チェックアウト済み)。作業ツリーに **未コミット** の変更がある。
  Cursor(composer-2.5)が `docs/wip/records-view/records-view-spec.md` に基づいて実装した。
- 対象: `git status` で見える frontend 配下の変更(App.tsx / oshigotoSchema.ts /
  OshigotoPersistence.test.tsx / PlaceholderPage.tsx / utils/date.ts /
  features/records/ 一式 / pages/RecordsPage.tsx)。
- **ファイルを変更しないこと**(レビューと検証のみ。コミットもしない)。

## やること

### 1. 品質ゲートの実行(frontend/ で)

```
npm run lint
npm run typecheck
npm run test
npm run build
```

### 2. スペック適合レビュー

`docs/wip/records-view/records-view-spec.md` を読み、diff がスペックを満たすか確認:

- `/records` ルート差し替え・PlaceholderPage の records エントリ削除
- 日付ナビ(前日/翌日/きょうへもどる・未来日 disabled)
- 娘/母の2セクション・0回の行は薄く表示・合計行(today_done_count)
- 閲覧専用(この画面から記録の追加・取り消しをしていないこと)
- 片方の member のみ失敗時も成功側は表示されること
- スペック§6のテスト4ケースの実在と妥当性

### 3. コードレビュー(セカンドオピニオン)

特に以下の観点:

- `frontend/src/utils/date.ts` の `shiftTokyoDate` / `isTokyoDateAfter` の正しさ
  (Asia/Tokyo固定・月跨ぎ/年跨ぎ)
- `oshigotoSchema.ts` の `count` / `last_record_id` 追加が既存の /oshigoto 画面
  (トグルUIのまま)を壊さないか
- react-query のキー設計(`["tasks", member, date]`)が既存 `useTasksQuery` と衝突しないか
- バグ・型の穴・アクセシビリティの明確な問題

## 報告

`docs/wip/records-view/codex-review-report-records-view.md` に以下を書く:

1. 品質ゲート4項目の合否(コマンド出力の要約付き)
2. スペック適合の合否(項目別)
3. 指摘事項(重大 / 中 / 軽微に分類。なければ「なし」)
4. 総合判定: **マージ可 / 修正必要**
