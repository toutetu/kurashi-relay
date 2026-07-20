# Phase A 家族共有トークン 実装指示書

更新日: 2026-07-19
実装: そのセッションで依頼を受けたAI
レビュー: 認証変更のため、実装者以外が1周だけ

> **運用更新(DR-033)**: 本文中の旧テスト・全品質ゲート条件より `AGENTS.md` の最小検証方針を優先する。
> 新しい自動テストと全テスト実行は完了条件にせず、動作確認1回と認証リスクの独立レビュー1周で完了する。

## 1. 目的と順序

`/api/health` 以外の個人データAPIを `X-Family-Token` で保護する。
フロント互換を先に完成させ、その後API保護を完成させる。フロント・APIは別ブランチ・別PRとし、
コミット・pushは行わず、完了報告までに対象経路を1回動作確認する。

### デプロイ順

1. フロントPRを先に完成させる。この時点ではAPIが401を返さないため、通常画面を妨げない。
2. フロントを本番へ反映し、401を受けたときに入力画面へ移れる状態を作る。
3. Laravel Cloudへユーザーが `FAMILY_TOKEN` を設定する。値はリポジトリへ書かない。
4. API PRを反映し、既存APIを保護する。
5. health 200、トークンなし401、正しいトークン200、公開フロントからの既存操作を本番確認する。

APIを先に保護すると公開中の旧フロントが全操作不能になるため、順序を逆転しない。

## 2. 既存の部分差分（必ず活かす）

巻き戻し、`git reset`、`git checkout --`、ファイル削除で破棄しない。内容を精査し、必要なら安全に修正する。

### フロント

- worktree: `C:/Users/r0110/AppData/Local/Temp/codex-kurashi-family-token-web`
- branch: `feat/family-token-web`
- 保存・ヘッダ付与、401通知、入力ダイアログ、設定画面、PUTの共通client化、テスト候補まで未コミットで存在する。
- 実測済み: typecheck PASS、lint PASS、新規2ファイル4テスト PASS。
- 未実施: 全85テスト、build、既存画面との統合確認、差分全体のCursor精査。

主な候補差分:

- `frontend/src/api/familyToken.ts`
- `frontend/src/api/client.ts`
- `frontend/src/features/auth/FamilyTokenProvider.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/features/musume/api/musume.ts`
- `frontend/src/App.tsx` / `main.tsx` / test wrapper
- API clientとProviderの新規テスト

### API

- worktree: `C:/Users/r0110/AppData/Local/Temp/codex-kurashi-family-token-api`
- branch: `feat/family-token-api`
- `backend/app/Http/Middleware/EnsureFamilyToken.php` だけが未コミットで存在する。
- ほかの登録、設定、route適用、テスト、整形は未実装。既存ファイルを変更する前にmiddleware候補を精査する。

想定する追加・変更先:

- `backend/app/Http/Middleware/EnsureFamilyToken.php`
- `backend/bootstrap/app.php`
- `backend/routes/api.php`
- `backend/config/kurashi.php`
- `backend/.env.example`
- `backend/phpunit.xml`
- `backend/tests/TestCase.php`
- `backend/tests/Feature/Api/FamilyTokenAccessTest.php`

### docs

- worktree: 元リポジトリ
- branch: `docs/development-plan-review`
- 計画変更を保持中。コードworktreeから変更しない。

## 3. フロント要件

- 共通API clientが、保存値があるときだけ全GET/POST/PATCH/PUT/DELETEへ `X-Family-Token` を付ける。
- 娘画面の独自PUTも共通clientへ統合し、認証漏れを0件にする。
- トークンは `localStorage` の端末内だけに保存し、利用不能時は同一タブのメモリへフォールバックする。
- 401時は保存済みの古い値を破棄し、全画面の「あいことば」入力ダイアログを開く。
- 必須入力中はダイアログを閉じられない。保存後はactive queryを再取得する。
- 設定画面から入力・変更・この端末から削除できる。値そのものは画面表示しない。
- トークンをソース、`VITE_*`、ビルド成果物へ固定埋込みしない。
- 44px以上、キーボード操作、dialog label、エラー通知、既存デザイントークンを守る。
- localStorage・401通知のテスト状態が他テストへ漏れない。

### 3.1 保存状態

- storage keyは機能固有の固定名1つに集約する。
- 入力前後の空白は除去し、空文字は保存しない。
- 保存成功後もトークン値をDOM、ログ、エラー文、URL、TanStack Query keyへ出さない。
- localStorage読取・書込・削除が例外になっても画面を壊さない。書込失敗時は同じタブのメモリだけで継続する。
- 端末から削除したら、メモリとlocalStorageの両方を破棄し、設定画面の状態表示を即時更新する。

### 3.2 API client

- `Headers`を使って既存の `Accept` / `Content-Type` を維持したまま `X-Family-Token` を追加する。
- token未保存時は空headerを送らず、`X-Family-Token` 自体を省略する。
- network error、AbortError、JSON不正、validation errorの既存処理を変えない。
- 401を受けたらレスポンス本文を既存 `ApiError` として返しつつ、再入力要求を一度通知する。
- active queryは保存後に再取得する。401になったmutationは自動再送せず、利用者が内容を確認して再操作する。
  認証失敗はサーバー側更新前に拒否されるため、再操作で二重保存しないことをAPIテストでも保証する。

### 3.3 入力ダイアログと設定

- 401由来の必須ダイアログは `role=dialog`、`aria-modal=true`、見出しとの関連付けを持つ。
- 401由来ではキャンセル不可。設定画面から開いた変更ダイアログはキャンセル可能。
- password inputを使用し、保存済み値を再表示しない。
- 空入力は日本語で同じダイアログ内に表示する。
- 設定画面には「未保存／この端末に保存済み」の状態、入力・変更、端末から削除の3状態を用意する。
- 200%表示、375px幅、キーボードTab、44px操作領域を崩さない。

## 4. API要件

- `EnsureFamilyToken` をLaravel middlewareとして登録し、`/api/health` 以外の既存APIへ適用する。
- CORSプリフライト（OPTIONS）は認証不要で通し、`X-Family-Token` headerを許可する。
- `FAMILY_TOKEN` 未設定・空文字なら保護APIは503（fail closed）。healthは200を維持する。
- トークンなし・不一致は401。比較は `hash_equals` を使う。
- 不正試行だけをIP単位でRate Limitし、上限後は429と `Retry-After` を返す。正しいトークンは失敗回数を解除する。
- JSONエラー形は `status`, `message`, `errors` を維持する。
- `config/kurashi.php`、`.env.example`、`phpunit.xml` を更新する。秘密値は書かない。
- テストでは明示的な固定テストトークンを使い、既存feature testは共通の正しいheaderで通す。
- feature testでhealth例外、なし401、不正401、正解200、未設定503、連続失敗429、CORSを検証する。

### 4.1 判定順序

1. healthまたはOPTIONSならそのまま次へ進める。
2. 設定値が空なら503を返す。
3. 正しいtokenならRate Limit状態を解除して次へ進める。直前に誤入力が上限へ達していても正しいtokenは通す。
4. 不正tokenならIP単位の失敗回数を確認し、上限前は401、上限後は429を返す。

標準値は5回/60秒とする。最初の5回は401、6回目から429とし、`Retry-After` を秒数で返す。
正しいリクエストをRate Limitの回数へ含めない。

### 4.2 エラー契約

401:

```json
{
  "status": "error",
  "message": "あいことばを確認してください。",
  "errors": {}
}
```

429:

```json
{
  "status": "error",
  "message": "試行回数が多すぎます。しばらく待ってからお試しください。",
  "errors": {}
}
```

503:

```json
{
  "status": "error",
  "message": "APIのアクセス保護が設定されていません。",
  "errors": {}
}
```

### 4.3 route・テスト互換

- healthだけをmiddleware groupの外へ置き、dashboard、tasks、task-records、rewards、musume、koekakeを保護する。
- 既存feature testは `phpunit.xml` の `test-family-token` を `tests/TestCase.php` から共通headerとして送る。
- 認証そのもののテストだけ `flushHeaders()` 等でheaderを外す。個別既存テストへ同じheader追加を大量複製しない。
- CORS testは `Access-Control-Request-Headers: X-Family-Token` を送り、許可headerに含まれることを確認する。
- config cache後も動くようmiddlewareから `env()` を直接読まず、config経由で取得する。

## 5. テストケース表

| 対象 | 条件 | 期待結果 |
|---|---|---|
| health | tokenなし | 200、既存JSON維持 |
| protected GET | tokenなし | 401 |
| protected POST | tokenなし | 401、DB件数不変 |
| protected API | 不正token | 401 |
| protected API | 正しいtoken | 既存の200/201応答 |
| protected API | `FAMILY_TOKEN` 未設定 | 503 |
| protected API | 不正5回→不正6回目 | 401×5→429 + Retry-After |
| protected API | 誤入力後に正しいtoken | 即時成功、失敗回数解除 |
| CORS OPTIONS | tokenなし、custom header要求 | 204、origin/header許可 |
| frontend client | 保存済みtoken | 全methodへheader付与 |
| frontend client | tokenなし | header省略 |
| frontend client | 401 | 保存値破棄、必須dialog |
| settings | 入力・変更・削除 | 状態表示と保存先が同期 |
| storage failure | get/set/remove例外 | クラッシュせずタブ内継続 |

## 6. 最小確認

- 画面で「あいことば」を1度入力し、保護された既存操作が成功することを確認する。
  画面を使えない場合だけ、正しい `X-Family-Token` を付けた代表的な `curl` 1本で代える。
- 全テスト、lint、typecheck、buildは標準では実行しない。既存テストの修正も完了条件にしない。
- 独立レビュー1周では、health以外の保護漏れ、秘密値混入、未設定時fail closed、復旧方法だけを確認する。
  指摘修正後の再レビューは、ユーザーが明示した場合だけ行う。

## 7. 完了報告形式

1. フロント／APIそれぞれの変更要点
2. 動作確認1回の内容と結果
3. 独立レビュー1周の重大指摘の有無
4. 本番でユーザーが設定する `FAMILY_TOKEN` と安全なデプロイ順
5. 未確認事項・残リスク

コミット・pushはしない。認証bypassは禁止する。
