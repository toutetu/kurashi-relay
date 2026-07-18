# Codexレビュー依頼: K2 娘用ホーム フロントエンド(PR2)

あなた(Codex)はコードレビュー/品質ゲート検証担当です。Cursorが実装した K2 フロントエンドを
**独立レビュー**し、品質ゲートを**自分で再実行**して合否を報告してください。コミット・pushはしない(レポートのみ)。

## 対象

- ブランチ: `feat/musume-frontend`(未コミット。作業ツリーの変更が対象)
- スペック(データ・API・完了条件の正): `docs/wip/musume-k2/musume-k2-spec.md` §7〜§8
- **デザインの正**: `docs/mockups/kurashi-musume-home.html`(色トークン・文言・カード構成)
- Cursor実装依頼書: `docs/wip/musume-k2/cursor-request-frontend.md`
- API実形の正 = バックエンド実装: `backend/app/Services/Musume/MusumePlanService.php`
  (`formatPlanResponse()` / `getSummary()`)
- 新規: `frontend/src/pages/MusumePage.tsx`・`frontend/src/features/musume/`(api/schemas/queries/utils/css/
  components 4点/テスト)・`frontend/src/features/koekake/components/KoekakeMusumeSummaryCard.tsx`
- 既存変更6件: `App.tsx`(ルート+2行)・`api/schemas/koekakeSchema.ts`(anytime)・`components/layout/AppShell.tsx`
  (ナビ+2行)・`pages/KoekakePage.tsx`(§7-5の2点)・`features/koekake/components/KoekakePhaseTabs.tsx`(4タブ対応)・
  `features/koekake/KoekakePage.test.tsx`(新API呼び出しヘルパー)

## やること

### 1. 品質ゲートの再実行(必ず自分で実行し件数付きで結果を貼る)

```
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

- lint / typecheck / test は緑必須(Cursor報告: 67 passed / 8 files)。
- **build**: Cursor環境では Windows ネイティブクラッシュ(exit code -1073740791・1994モジュール変換後)。
  既知の環境要因だが、**あなたの環境で必ず再試行**し、結果(成功 or 同一クラッシュ or 別エラー)を報告に明記する。
  ソース起因のbuildエラー(型エラー・import解決失敗等)なら重大として扱う。

### 2. スペック適合レビュー(重点)

- **API契約(バックエンド実装が正)**: `musumeSchema.ts` / `api/musume.ts` の型・パースが
  `formatPlanResponse()` / `getSummary()` の実レスポンス形と一致しているか
  (plan全体形・`review.completed_at`・`summary:null`・items カテゴリ別配列)。
- **DR-010**: mutation直列化+**サーバ応答のplan全体でキャッシュ確定**(楽観更新でサーバ値を上書きしていないか)。
  `features/koekake/queries.ts` のパターン踏襲。
- **§7-2**: 3カード構成・モード切替(PATCH mode)で3枚目カード/チップ/振り返り項目が切替・
  チップ保存は PUT items(カテゴリ置換・配列順)・「ママと決める」= PATCH state=with_mama・
  「今は決めない」=保存せず閉じる・「その他」1行自由入力。
- **§7-3**: 振り返り5行(夏/通常で切替)・complete POST・完了バッジは `review.completed_at` 非null判定。
- **§7-4**: おしごと入口は Link のみ(oshigoto側コード無変更)・メモは category='memo' の PUT items。
- **§7-5(母側・2点のみ)**: むすめの見通しカード(`summary:null` 時「まだ決めてないよ」中立表示)・
  anytimeタブ(**tasks?phase=anytime が1件以上ある時のみ表示**・0件=非表示)。
  **KoekakePage/koekake featureの既存ロジック(3タブ・カード・mutation直列化)に副作用が無いこと**。
- **§7-6 表示原則(必ず目視確認)**: 娘画面に声かけ回数を出さない・赤字/失敗色なし・「今は決めない」でも中立表示・
  文言は漢字混じり(全ひらがな禁止)・FR-M10禁止表現ゼロ(何回言ったら分かるの/まだできていない/約束を守って/
  ママが困る/ちゃんとしなさい/明日行くって言ったでしょ/できないと困るよ)。
- **デザイン(モック対照)**: 色トークンが `--msm-*` ローカルCSS変数として `musume.css` に移植され、
  画面固有カラーコードが component 内に散在していないか。文言・チップ構成がモックと一致するか。

### 3. テスト網羅(§8・vi.fn fetchモック・MSW不使用)

- plan取得と3カード表示 / チップ保存(PUT→サーバ応答確定) / ママと決める(PATCH)
- モード切替での表示切替 / 振り返りcomplete→バッジ
- 母側: musume-summary表示・null中立表示・anytimeタブ出し分け(0件非表示/1件以上表示)
- 既存 `KoekakePage.test.tsx` の変更が「新API呼び出しに対応するヘルパー追加」の範囲で、
  既存テストの意図を壊していないか。

### 4. Cursorの逸脱4点の妥当性判定

1. **登校時限チップ**: バックエンドenumは8値(other含む)だがモックは7チップ → モック優先で7択表示(otherは未表示)。
   スペック§7-2は「D-04の8択」と記載しており食い違いがある。**見た目はモックが正の原則**でモック優先は妥当か判定。
2. **「9:00よりあと」**: APIが `H:i` のみ受理のため `"09:00"` で送信し表示のみ「9:00よりあと」へマッピング
   (選択肢に9:00ちょうどが無いため衝突なし)。
3. **KoekakePhaseTabs / koekakeSchema への変更**: §7-5実現に必要な最小変更と言えるか。
4. **`api/client.ts` 未変更**: PUTを `musume.ts` ローカル `apiPut` で実装(既存ファイル変更制約のため)。

## 報告フォーマット

1. ゲート4種の実行結果(件数付き・buildの詳細必須)
2. 重大(マージ前に直すべき) / 軽微(後で可) / 指摘なし の3分類で所見
3. FR-M10・表示原則の監査結果 / モック対照の結果
4. 逸脱4点の判定
5. **マージ可否の総合判断**

コミット・pushはしない。レポートのみ。
