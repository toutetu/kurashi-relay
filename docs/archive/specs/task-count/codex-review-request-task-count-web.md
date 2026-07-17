# Codex依頼: task-count-web(カウントUI化)のレビューと品質ゲート実行

## 状況

- ブランチ `feat/task-count-web`(チェックアウト済み)。レビュー対象は
  **コミット ab30b16(カウント方式化)+ 作業ツリーの未コミット差分(クイック記録方式へのUI改修)** の合成。
  つまり `git diff main`相当(コミット済+未コミット)の frontend 変更全体。
- 実装は Cursor。スペックは `docs/wip/task-count/task-count-spec.md` §4 と、
  その見た目指定を上書きする `docs/wip/task-count/task-count-ui-quickcards.md`。
- **ファイルを変更しないこと**(レポートファイルの新規作成のみ可。コミットもしない)。

## やること

### 1. 品質ゲートの実行(frontend/ で)

```
npm run lint
npm run typecheck
npm run test
npm run build
```

**注意**: 直前の実行で `vite build` が exit code -1073740791(0xC0000409)でクラッシュした報告がある
(`tsc -b` は通過)。build は**2回まで再試行**し、失敗が再現する場合はエラー出力の要点
(スタックトレース・落ちたモジュール)をレポートに含めること。今日それ以前の records-view レビュー時は
同環境で build 成功していた。

### 2. スペック適合レビュー

- 行UI: 行全体ボタン=タップで常に+1 / 「N件」ピル(0件はグレー・count-bumpアニメ)/
  丸「+」アイコン / +1フライアニメ / 行内「−」ボタンが無いこと
- 取り消し: +1後に下部トースト「(タスク名)を1件記録しました[取り消す]」・5秒自動消去・
  連打でタイマーリセット・「取り消す」で decrementTask
- 色: おしごと=--osh-*系 / ママ家事=--mkj-*系(ダッシュボードの--primary-*を持ち込んでいないこと)
- スキーマ: taskSchema が count / last_record_id になり done / record_id が削除されていること。
  既存 /records 画面(count 参照)が壊れていないこと

### 3. コードレビュー(セカンドオピニオン。特に重点)

- `useTaskPersistence.ts` の増減ロジック:
  - incrementTask: 毎回新しい冪等キーで enqueue・楽観 count+1・gauge+1
  - decrementTask: 未送信の最新 pending create を除去(API不要)→ 無ければ last_record_id へ cancel。
    連続「−」時の last_record_id null ケース・cancel 確定後の refetch 収束の妥当性
  - オフライン→復帰(flushQueue)での順序保証・二重送信の穴
- OshigotoPage / MamaKajiPage のトースト実装(タイマーのクリーンアップ・undo の二重発火防止)
- CheerOverlay(既存演出)の onUndo とトーストの「取り消す」が併存することによる二重取り消しの可能性
- テストの妥当性(トースト経由の取り消し・5秒消去・count減算)

## 報告

`docs/wip/task-count/codex-review-report-task-count-web.md` に:

1. 品質ゲート4項目の合否(build は再試行結果と、失敗時はエラー要点)
2. スペック適合の合否(項目別)
3. 指摘事項(重大 / 中 / 軽微)
4. 総合判定: **マージ可 / 修正必要**(build が環境要因と判断できる場合はその根拠も)
