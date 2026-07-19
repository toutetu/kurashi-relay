# 総合判断: マージ不可

品質ゲートはすべて通過しましたが、マージ前に直すべき重大事項が2件あります。commit・push・ファイル変更は行っていません。

## 1. 品質ゲート

| ゲート | 結果 |
|---|---|
| `npm run lint` | PASS — 0 errors / 0 warnings |
| `npm run typecheck` | PASS — TypeScript errors 0件 |
| `npm run test` | PASS — 8 files / 67 tests passed |
| `npm run build` 初回 | PASS — 1994 modules、1.14秒 |
| `npm run build` 再試行 | PASS — 1994 modules、770ms |

両buildとも生成物は同一です。

- JS: 519.64 kB（gzip 150.27 kB）
- CSS: 95.76 kB（gzip 16.87 kB）
- 500 kB超チャンク警告1件のみ
- Cursor報告のWindowsネイティブクラッシュは再現しませんでした

## 2. レビュー所見

### 重大（マージ前に修正）

1. 振り返り保存が失敗しても成功表示され、再試行できなくなる

[ReviewSheet.tsx:94](C:/Users/r0110/Documents/あきちゃんとママのアプリ/kurashi-relay-laravel-react-starter/frontend/src/features/musume/components/ReviewSheet.tsx:94) は非同期保存を待たず、直ちに`finished=true`として成功メッセージを表示し、1.6秒後に閉じます。親側で保存エラーになっても挙動は変わりません。

さらに`finished`が再オープン時にリセットされないため、失敗後に開き直しても「確認おわり!」が非表示になり、再試行できません。成功表示・タイマー開始は保存成功後だけに行い、再オープン時には状態をリセットする必要があります。

2. 娘側で変更した見通しが母側サマリーに最大30秒間反映されない

[queries.ts:70](C:/Users/r0110/Documents/あきちゃんとママのアプリ/kurashi-relay-laravel-react-starter/frontend/src/features/musume/queries.ts:70) と [queries.ts:89](C:/Users/r0110/Documents/あきちゃんとママのアプリ/kurashi-relay-laravel-react-starter/frontend/src/features/musume/queries.ts:89) のPATCH／PUT成功時はplanキャッシュだけを更新し、musume-summaryを無効化していません。summaryは30秒間fresh扱いです。

母画面を一度開く→娘画面で内容を決める→すぐ母画面へ戻ると、古い「まだ決めてないよ」等が残ります。全plan mutation成功時にsummaryをinvalidateする必要があります。

### 軽微（後で可）

- musume-summary取得エラーが`summary:null`と同じ扱いになり、「まだ決めてないよ」と誤表示されます。[KoekakePage.tsx:219](C:/Users/r0110/Documents/あきちゃんとママのアプリ/kurashi-relay-laravel-react-starter/frontend/src/pages/KoekakePage.tsx:219)
- PUTテストはサーバ応答をリクエストbodyから生成しているため、楽観更新を導入しても通る可能性があります。応答待ち中は未更新、応答値がリクエスト値と異なるケースを追加するとDR-010を確実に検証できます。[MusumePage.test.tsx:99](C:/Users/r0110/Documents/あきちゃんとママのアプリ/kurashi-relay-laravel-react-starter/frontend/src/features/musume/MusumePage.test.tsx:99)
- buildの519.64 kBチャンク警告は継続しています。

### 指摘なし

- frontend schemaは`formatPlanResponse()`／`getSummary()`の実レスポンス形と一致
- mutationは直列化され、楽観更新せずサーバ応答のplan全体でキャッシュ確定
- 3カード、モード切替、PUT／PATCH、メモ、おしごとLink、振り返り5項目は仕様どおり
- anytime拡張は必要範囲に限定され、既存Koekakeテストも全件通過
- MSW未使用、`any`未使用、oshigoto／child-plan側の変更なし

## 3. 表示原則・モック対照

- FR-M10禁止表現7種: 0件
- 娘画面の声かけ回数表示: 0件
- 赤字・失敗色・未達成評価: 0件
- 「今は決めない」: mutationせず閉じ、中立表示を維持
- 漢字混じりの文言: 適合
- `--msm-*`トークン15種はモックの明暗値と一致
- 画面固有の直接カラーコードはコンポーネント内にありません
- カード構成、主要文言、チップ構成はモック／仕様と一致

ただし、ブラウザ接続先がこの環境では利用できなかったため、実レンダリングのスクリーンショット・レスポンシブ目視確認は未実施です。HTML/CSS/DOMのソース対照による監査結果です。

## 4. 逸脱4点の判定

1. 登校時限7チップ: 妥当。見た目・文言は承認済みモック優先で、`other`非表示が正です。
2. 「9:00より あと」→`09:00`: 妥当。API制約上の変換で、モック文言とも一致します。
3. `KoekakePhaseTabs`／`koekakeSchema`変更: 妥当。anytime実現に必要な最小差分です。
4. `api/client.ts`未変更・ローカル`apiPut`: 妥当。通信処理はAPIモジュール内に閉じており、既存ファイル変更制約にも適合します。

重大2件を修正し、関連する失敗経路テストを追加してから再レビューが必要です。
