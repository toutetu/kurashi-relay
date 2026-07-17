# Phase 8: 安定確認と旧 Render API 停止 ランブック

作成: 2026-07-17 / 状態: **着手(安定確認フェーズ)**

親指示書: `kurashi-relay_laravel-cloud_deployment_instructions.md` §7 Phase 8 / §8 ロールバック
前フェーズ: `phase7-switch.md`(切替完了・検証OK)/ 未解決: `phase5-followup-fixes.md`(並行系 重大3+中3)

---

## 0. このフェーズの狙いと分割方針

Phase 8 は「一定期間、安全に運用できることを確認し、問題なければ旧 Render API を止める」フェーズ。
性質上、**一度に終わらない**(朝・昼・夜/翌日/休止復帰など時間をまたぐ観測が必要)。
そこで **8a(安定確認)と 8b(旧 Render 停止)に分け、8b は条件を満たすまで着手しない**。

### ⚠ 8b(旧 Render API 停止)を急がない理由 — ゲート条件

1. **旧 Render API は現行の唯一のロールバック先**(§8)。止めると環境変数を戻すだけでは復旧できず、
   Render 側で再開操作が必要になる=障害時の切り戻しが遅くなる。
2. **並行系の既知不具合(H1〜3 / M1〜3)が未修正**(`phase5-followup-fixes.md` / DR-010)。
   単発・順番どおりの操作は正しいが、**子どもの連打・モバイルの電波不安定**で顕在化しうる。
   実家庭利用が始まると、まさにこの条件を踏みやすい。

→ **決定(DR-011)**: 8a を先に回し、旧 Render は**残置のまま**。
以下の**すべて**が揃うまで 8b(停止)に進まない。

- [ ] 8a の安定確認が一通り合格(下記チェックリスト)
- [ ] follow-up 修正(最低でも重大 H1〜3)が本番反映済み、または**ユーザーが切り戻し不可リスクを明示的に受容**
- [ ] 実家庭で数日〜1週間、致命的な問題なく運用できた

**旧 Render API の削除は、停止とは別。ユーザーの明示的な確認なしに削除しない(§5-6 / §7 Phase 8-4)。**

---

## 8a. 安定確認チェックリスト

「誰が」列: **curl** = Codex にスモーク委譲(下記コマンド)/ **実機** = ユーザーが実端末で操作 / **観測** = 日をまたいで確認。

| # | 確認項目(§7 Phase 8) | 誰が | 合否基準 | 状態 |
|---|---|---|---|---|
| 1 | `/api/health` 応答 | curl | 200・`kurashi-relay-api` | ⬜ |
| 2 | **DB 休止復帰(Scale to Zero 300秒)後の初回アクセス** ※Phase 6 積み残し | curl | 6分以上放置 → 初回 GET/POST が成功。初回だけ遅くても**エラーにならない** | ⬜ |
| 3 | 当日タスク取得 | curl | 200・child 5件/mother 一覧 | ⬜ |
| 4 | 複数タスクの連続完了→取消 | curl | 各 201/200・集計が加減算で一貫・二重加算なし | ⬜ |
| 5 | 同一操作の再送(冪等) | curl | `deduplicated:true`・件数/ポイント不変・同 record_id | ⬜ |
| 6 | ポイント境界(母=単価スナップショット反映) | curl | points が加算/取消で正しく戻る | ⬜ |
| 7 | JST 日付切替(翌日 0時境界) | curl+観測 | 翌日の GET で当日分が空・前日分は前日日付で残る。`completed_at` が `+09:00` | ⬜ |
| 8 | 朝・昼・夜の複数回利用 | 実機+観測 | 各時間帯で開いて完了→保存→再読込復元が動く | ⬜ |
| 9 | スマートフォンからの利用 | 実機 | 375px で `/oshigoto` 正常・完了/取消が保存される | ⬜ |
| 10 | 未同期記録の再送(オフライン→復帰) | 実機 | 機内モードで完了→「あとで保存します」系表示→復帰後に保存される | ⬜ |
| 11 | 10回達成の節目報酬 ※Phase 6 積み残し | 観測 | 実利用で10到達時にゾンビ/お菓子演出が発火(複数日かかる) | ⬜ |

> #10 は `phase5-followup-fixes` の並行系と関わる領域。**単発・順番どおり**なら動く想定。
> 連打・素早いトグルで崩れた場合は不具合(H2/M3)側であり、8a の合否ではなく follow-up 修正の対象として記録する。

### Codex へのスモーク委譲コマンド(#1〜7)

対象 API: `https://kurashi-relay-production-olnfy0.laravel.cloud`
**本番 DB に書き込むため、テストで作成した record は最後に必ず取消(DELETE)してクリーンに戻す**
(後始末は `phase6-results.md` 末尾の tinker delete 手順も参照。ただし `migrate:fresh` は本番禁止)。

```bash
API="https://kurashi-relay-production-olnfy0.laravel.cloud"

# 1) health
curl -s -o /dev/null -w "health: %{http_code} (%{time_total}s)\n" "$API/api/health"

# 2) 休止復帰: 6分以上あけてから初回アクセスの成功と所要時間を計測
#    （直前に何もアクセスしていない状態で実行すること）
curl -s -o /dev/null -w "cold GET: %{http_code} (%{time_total}s)\n" "$API/api/tasks?member=child"

# 3) 当日タスク
curl -s "$API/api/tasks?member=child" | head -c 400; echo

# 4-5) 完了→再送(冪等)→取消 を1タスクで
KEY="phase8-smoke-$(date +%s)"
curl -s -X POST "$API/api/task-records" -H "Content-Type: application/json" \
  -d "{\"member\":\"child\",\"task\":\"shokki\",\"idempotency_key\":\"$KEY\"}" | head -c 400; echo   # 201, deduplicated:false
curl -s -X POST "$API/api/task-records" -H "Content-Type: application/json" \
  -d "{\"member\":\"child\",\"task\":\"shokki\",\"idempotency_key\":\"$KEY\"}" | head -c 400; echo   # 200, deduplicated:true, 同id

# ↑応答の record_id を控えて取消（$REC に置換）
# curl -s -X DELETE "$API/api/task-records/$REC" | head -c 400; echo   # 200, cancelled_at

# 6) 母ポイント経路（単価スナップショット）
KEYM="phase8-mom-$(date +%s)"
curl -s -X POST "$API/api/task-records" -H "Content-Type: application/json" \
  -d "{\"member\":\"mother\",\"task\":\"shokki\",\"idempotency_key\":\"$KEYM\"}" | head -c 400; echo
curl -s "$API/api/rewards/summary?member=mother" | head -c 300; echo
# ↑作成した mother record も取消して戻す

# 7) 日付境界: completed_at のオフセットが +09:00 かを確認（上の応答JSONで目視）
```

> 実際のタスクキー名(`shokki` 等)・POST パラメータ名は `oshigoto-persistence-backend-spec.md` /
> `oshigoto-persistence-frontend-spec.md` の契約に合わせること。Phase 6 で通った形と同じでよい。

Codex には**合否とコマンド出力の要点だけ**を報告させ、Fable はそれを読む(自分ではブラウザ/curl を回さない)。

---

## 8b. 旧 Render API の停止手順(ゲート通過後・ユーザー操作)

> **前提**: 上記ゲート条件をすべて満たしたことをユーザーが確認してから着手。

Render Dashboard → 旧 Web Service **`kurashi-relay-api`**:

1. **Suspend(停止)を使い、Delete(削除)はしない**。設定・環境変数は残す。
   - Render の無料 Web Service は一定期間で自動休止するが、明示 Suspend で確実に止める。
2. 停止後、フロント(`kurashi-relay-web`)が **Laravel Cloud だけで**正常動作することを再確認(実機)。
3. **一定期間(目安 1〜2週間)は Suspend のまま設定を保存**。この間に問題が出たら Resume で即戻せる。
4. 最終確認後、**削除するかどうかは改めてユーザーへ確認**してから(本ランブックでは削除しない)。

### 停止中のロールバック(もし Laravel Cloud で問題が出たら)

1. Render で `kurashi-relay-api` を **Resume**。
2. `kurashi-relay-web` の `VITE_API_BASE_URL` を `https://kurashi-relay-api.onrender.com` へ戻す → Clear build cache & deploy。
3. 注意: 旧 API は DB 保存未対応のため、Laravel Cloud 移行後に保存したデータは旧画面に出ない可能性(§8)。

---

## 要確認(ユーザー判断)

- **旧 Render 停止の前に follow-up 修正(H1〜3)を入れるか**、リスク受容で先に止めるか(DR-011 の分岐)。
- **当日子タスクの過去テスト実データ**(`kigae`/`fuku` = record_id 3,4)を実家庭利用開始時に初期化するか。
  → 初期化する場合は Commands で対象 record を取消(または `phase6-results.md` の tinker delete)。
- **モックの見せかけ値**(ゲージ6/コイン400/ポイント190/図鑑全収集)は非永続=接続後は0始まり。
  持ち越すなら `reward_adjustments` へ実値投入が別途必要。

## 完了条件(Phase 8)

- 8a のチェックリストが合格し、実家庭で数日〜1週間、致命的問題なく運用できた。
- 旧 Render API を Suspend しても、フロントが Laravel Cloud だけで正常動作する。
- 旧 Render API の削除可否をユーザーが判断できる状態(設定は保存済み)。
