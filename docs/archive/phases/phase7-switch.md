# Phase 7: Render フロント接続先切替 手順書

作成: 2026-07-17 / 状態: **✅ 切替完了・検証OK**(2026-07-17)

親指示書: `kurashi-relay_laravel-cloud_deployment_instructions.md` §7 Phase 7 / §8 ロールバック

## 確定値

| 区分 | 値 |
|---|---|
| 切替先(新) `VITE_API_BASE_URL` | `https://kurashi-relay-production-olnfy0.laravel.cloud` |
| 現在値(旧・ロールバック先) | `https://kurashi-relay-api.onrender.com` |
| フロント Static Site 名 | `kurashi-relay-web` |
| フロント公開URL | `https://kurashi-relay-web.onrender.com` |
| 切替先 API 稼働 | Laravel Cloud(Singapore / PostgreSQL 17.10) |

## 切替前チェック(2026-07-17 実測・すべてOK)

- `GET /api/health` → 200 `{"service":"kurashi-relay-api"}`(0.73s)
- `GET /api/dashboard`(Origin付き)→ 200 + `access-control-allow-origin: https://kurashi-relay-web.onrender.com`
- `OPTIONS /api/task-records` プリフライト → 204、`POST` 許可・`content-type,idempotency-key` 許可
- CORS はワイルドカードでなくフロントオリジンのみ許可(適正)
- フロント永続化コードは main 済み(PR #5 マージ済み)

## Render 操作手順(ご本人)

Render Dashboard → Static Site **`kurashi-relay-web`**:

1. **Environment** を開く
2. `VITE_API_BASE_URL` を **`https://kurashi-relay-production-olnfy0.laravel.cloud`** に変更 → **Save Changes**(末尾スラッシュなし)
3. **Manual Deploy → Clear build cache & deploy**(Vite はビルド時に env を焼き込むため再ビルド必須)
4. **Events / Logs** で `Deploy live` を確認
5. 旧 Render API `kurashi-relay-api` は**停止せず残す**(切り戻し用)

## 切替後の検証結果(2026-07-17・Fable が curl + ブラウザで実施)

| 項目 | 結果 |
|---|---|
| 配信JSへ新URL反映 | ✅ `index-BoKCY1fj.js` に `...laravel.cloud` あり・旧 `api.onrender.com` なし |
| 実オリジンからの API 疎通 | ✅ `GET /api/tasks?member=child` → 200(`kurashi-relay-web` オリジンの fetch が本文取得) |
| CORS | ✅ クロスオリジン fetch 成功=CORS OK(Console エラーなし)。※`acao` が JS で null は正常仕様 |
| 保存(POST) | ✅ 未完了タスク `shokki` を完了 → `record_id:5` が Postgres に採番(3→4→5) |
| 再読込復元 | ✅ リロード後も `食器を流しに運んだ（できた）` を維持 |
| 取消(DELETE) | ✅ 再度押下で record 削除・`done:false/record_id:null` に復元(テストデータは原状回復) |
| スマホ表示 | ✅ 375px で `/oshigoto` 正常レンダリング |
| 旧 Render API | ✅ 未停止のまま残置(切り戻し用) |

- 連打での二重加算は **Codex report-03 の既知バックログ(H2)** 側。本検証では未実施(修正フェーズで確認)。
- 現在の子タスク当日データ: `kigae`/`fuku` が完了済(record_id 3,4)= 過去テストの実データ。ゲージ「2/10」もこれを反映。
  実家庭利用の開始時に初期化したい場合は要判断(下記)。

## 事前の心づもり

接続後は**実DBの値=0始まり**。モックの見せかけ値(ゲージ6 / コイン400 / ポイント190 / 図鑑全収集)は
非永続のため表示されない。持ち越す場合は `reward_adjustments` へ実値投入が別途必要(要判断)。

## ロールバック(§8)

1. `VITE_API_BASE_URL` を **`https://kurashi-relay-api.onrender.com`** に戻す
2. Render フロントを再デプロイ → 旧画面表示を確認
3. Laravel Cloud のログ・DB を**消さずに**原因調査
4. 注意: 旧 Render API が DB 保存未対応なら、切替後に保存したデータは旧画面に出ない可能性

## 未対応(バックログ / 本切替の範囲外)

Codex report-03 の並行系不具合(重大3件+中3件)= `phase5-followup-fixes.md`・DR-010。
本番投入を優先しつつ、Phase 7 前後で潰す方針。
