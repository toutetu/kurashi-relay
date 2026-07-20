# A3: 現行アクセス契約の記録

更新日: 2026-07-20  
基準commit: `8643a61561c2439a30d5b25722b8976ba442310d`（A2 merge後の `origin/main`）  
種別: docs / gate（code変更なし）

## 1. 結論

SPA移行中は、最新mainの認証・未認証動作を変えない。

- Sanctumを導入しない
- session認証やCSRFを追加しない
- `EnsureFamilyToken` をAPI middlewareへ再接続しない
- `X-Family-Token` 必須化を復活しない
- CORSを認証の代替と説明しない

アクセス保護の再設計は本移行とは別課題とする。A4 cutoverのcodeへ混ぜない。

## 2. 根拠コミット

`7a8391b fix(auth): remove family token gate` により、API routeからfamily-token gateが外された。

この判断を、残存するmiddlewareクラスやstale test（例: `FamilyTokenAccessTest`）で上書きしない。

## 3. API route snapshot

`php artisan route:list --path=api --json` の結果、API routeは **19本**。

| Method | URI | Action | middleware |
|---|---|---|---|
| GET\|HEAD | api/health | Api\HealthController | api |
| GET\|HEAD | api/dashboard | Api\DashboardController | api |
| GET\|HEAD | api/tasks | Api\TaskController@index | api |
| GET\|HEAD | api/task-records | Api\TaskRecordController@index | api |
| POST | api/task-records | Api\TaskRecordController@store | api |
| DELETE | api/task-records/{id} | Api\TaskRecordController@destroy | api |
| GET\|HEAD | api/rewards/summary | Api\RewardController@summary | api |
| GET\|HEAD | api/rewards/collections | Api\RewardController@collections | api |
| GET\|HEAD | api/musume/plan | Api\Musume\PlanController@show | api |
| PATCH | api/musume/plan/{id} | Api\Musume\PlanController@update | api |
| PUT | api/musume/plan/{id}/items | Api\Musume\PlanController@replaceItems | api |
| POST | api/musume/plan/{id}/reflection/complete | Api\Musume\PlanController@completeReflection | api |
| GET\|HEAD | api/koekake/musume-summary | Api\Koekake\MusumeSummaryController@show | api |
| GET\|HEAD | api/koekake/tasks | Api\Koekake\KoekakeTaskController@index | api |
| GET\|HEAD | api/koekake/tasks/{id} | Api\Koekake\KoekakeTaskController@show | api |
| POST | api/koekake/prompt-events | Api\Koekake\PromptEventController@store | api |
| DELETE | api/koekake/prompt-events/{id} | Api\Koekake\PromptEventController@destroy | api |
| PATCH | api/koekake/tasks/{id}/completion | Api\Koekake\CompletionController@update | api |
| POST | api/koekake/tasks/{id}/snooze | Api\Koekake\SnoozeController@store | api |

`backend/routes/api.php` にも middleware group や `EnsureFamilyToken` の付与はない。  
`bootstrap/app.php` のAPI middleware登録にもfamily-tokenは無い。

`EnsureFamilyToken` / `EnsureWebFamilyToken` クラス自体は残存するが、現行API routeへは接続されていない。

## 4. 現状の未認証動作（実測）

ローカル稼働中API（`http://127.0.0.1:8000`）で、`X-Family-Token` なしの事実を確認した。

| 操作 | 結果 |
|---|---|
| GET `/api/health` | 200 JSON success |
| GET `/api/dashboard` | 200 JSON success（401ではない） |
| POST `/api/task-records` | 201 作成成功（401ではない） |

つまり現行本番相当のAPIは、URLを知る第三者が未認証で個人データAPIの読取・書込を行える状態である。  
CORSはブラウザ制約であり、curl等の直接アクセスを防がない。

確認時に作成した検証用 `task-records`（id=6）は直後に DELETE で取り消した。

## 5. stale testとの関係

`backend/tests/Feature/Api/FamilyTokenAccessTest.php` は未認証GET/POSTを401と期待する。  
これは現行runtime（`7a8391b`以降）と不一致であり、A3ではテストを「正」として保護を復活させない。  
テスト修復はアクセス保護の別課題側で扱う。

## 6. 別課題（DR候補 / backlog）

必要ならSPA移行とは別に次を行う。

1. 新しいdesign decisionを作る（DR-024の将来方針更新を含む）
2. same-origin session / Sanctum / family-token 等を比較する
3. GETとwriteの保護範囲、CSRF、secret管理、失敗時UIを決める
4. API契約と本番環境を含む専用計画・専用branch・専用PRを作る
5. 未認証GET/write、認証後GET/write、401/419/429を独立検証する

ユーザーがセキュリティ上A4前の解決を必須と判断した場合は、本移行を停止して別課題完了を待つ。
