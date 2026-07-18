# Phase 8: 安定確認と旧 Render API 停止 ランブック

作成: 2026-07-17 / 状態: **8a主要経路合格・観測継続 / 8b未着手**

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
  - Gate 0後の機能実装を進めるリスクは受容済み。旧Renderを停止する切り戻しリスクの受容とは分けて扱う。
- [ ] 実家庭で数日〜1週間、致命的な問題なく運用できた

**旧 Render API の削除は、停止とは別。ユーザーの明示的な確認なしに削除しない(§5-6 / §7 Phase 8-4)。**

### 2026-07-19 優先方針の更新

利用者は家庭内の2人で、主に操作するのは1人である。DR-028により、通常利用を妨げる問題は先に直す一方、
高速連打、応答逆転、特殊な通信断、日跨ぎ等の非致命な既知不具合は、機能面を作り切った後に対応する。
H1〜H3/M1〜M3は削除せずバックログへ残すが、Gate 0や次の機能実装を妨げない。
旧Render APIの停止・削除は別の運用判断であり、現時点ではロールバック先として残す。

---

## 8a. 安定確認チェックリスト

「誰が」列: **curl** = Codex にスモーク委譲(下記コマンド)/ **実機** = ユーザーが実端末で操作 / **観測** = 日をまたいで確認。

| # | 確認項目(§7 Phase 8) | 誰が | 合否基準 | 状態 |
|---|---|---|---|---|
| 1 | `/api/health` 応答 | curl | 200・`kurashi-relay-api` | ✅ 200 |
| 2 | **DB 休止復帰(Scale to Zero 300秒)後の初回アクセス** ※Phase 6 積み残し | curl | 6分以上放置 → 初回 GET/POST が成功。初回だけ遅くても**エラーにならない** | ✅ 6分30秒後 200 / 1.66秒 |
| 3 | 当日タスク取得 | curl | 200・child 5件/mother 一覧 | ✅ child 5件 / mother 5件 |
| 4 | 複数タスクの連続完了→取消 | curl | 各 201/200・集計が加減算で一貫・二重加算なし | ✅ `0→2→1→0`、全取消 |
| 5 | 同一操作の再送(冪等) | curl | `deduplicated:true`・件数/ポイント不変・同 record_id | ✅ 201→200・同ID |
| 6 | ポイント境界(母=単価スナップショット反映) | curl | points が加算/取消で正しく戻る | ✅ `0→10→0` |
| 7 | JST 日付切替(翌日 0時境界) | curl+観測 | 翌日の GET で当日分が空・前日分は前日日付で残る。`completed_at` が `+09:00` | 🟡 `+09:00` / `Asia/Tokyo`確認、日跨ぎ観測待ち |
| 8 | 朝・昼・夜の複数回利用 | 実機+観測 | 各時間帯で開いて完了→保存→再読込復元が動く | ⬜ |
| 9 | スマートフォンからの利用 | 実機 | 375px で `/oshigoto` 正常・完了/取消が保存される | 🟡 375px表示・公開画面保存・API取消/0件復元合格、実端末待ち |
| 10 | 未同期記録の再送(オフライン→復帰) | 実機 | 機内モードで完了→「あとで保存します」系表示→復帰後に保存される | 🟡 自動テスト合格、実機待ち |
| 11 | 10回達成の節目報酬 ※Phase 6 積み残し | 観測 | 実利用で10到達時にゾンビ/お菓子演出が発火(複数日かかる) | ⬜ |

> #10 は `phase5-followup-fixes` の並行系と関わる領域。**単発・順番どおり**なら動く想定。
> 連打・素早いトグルで崩れた場合は不具合(H2/M3)側であり、8a の合否ではなく follow-up 修正の対象として記録する。

### 2026-07-19 実施結果

- #1〜#6は本番Laravel Cloud APIで合格した。試験で作成したchild/motherのrecordはすべて論理取消し、
  childの対象タスク件数とmother pointsを0へ戻した。
- #7はPOST応答の `completed_at` が `+09:00`、`meta.timezone` が `Asia/Tokyo` であることまで確認した。
  翌日0時をまたぐ実観測は残っている。
- 6分30秒アイドル後の初回GETは200、総所要1.66秒だった。
- 375×812pxでは横スクロールがなく、タスク5件とモバイルナビを操作できた。
- `/oshigoto` の通常保存で検出した `revealed_reward` 省略問題はPR #33で修正し、本番APIで
  `revealed_reward: null`、公開フロントで0件→1件の保存成功とエラー非表示を確認した。
  試験record #8はAPIで取消し、再読込後0件へ戻ったことを確認した。
- 声かけ予定時刻の9時間ずれもPR #33で修正し、既存行が07:00、19:00等のJSTどおりへ補正された。
- HTTP 408/425/429の未送信操作保持と主要操作44px化はPR #34でmainへ反映した。
  自動バックオフ再送とH1〜H3/M1〜M2の根治はDR-028により機能完成後のバックログとする。
- 夏休みの「明日 なにする?」で「ゆっくりする」を「🎀 ママと決めた」として保存し、
  `/koekake` に「明日 なにする?: ゆっくりする 🎀」と表示されることを確認した。
  確認後は `tomorrow_plan` だけを空へ戻し、娘画面・母画面とも未決定表示へ復元した。
- フロントは85テスト、typecheck、lint、buildに合格した。通信断→「あとで保存します」→online再送は
  自動テストで合格しているが、機内モードを使う実端末確認は未実施である。

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

- **follow-up修正の扱い**: DR-028で非致命リスクを受容し、機能完成後に対応する。旧Render停止は別途判断する。
- **当日子タスクの過去テスト実データ**(`kigae`/`fuku` = record_id 3,4)を実家庭利用開始時に初期化するか。
  → 初期化する場合は Commands で対象 record を取消(または `phase6-results.md` の tinker delete)。
- **モックの見せかけ値**(ゲージ6/コイン400/ポイント190/図鑑全収集)は非永続=接続後は0始まり。
  持ち越すなら `reward_adjustments` へ実値投入が別途必要。

## 完了条件(Phase 8)

- 8a のチェックリストが合格し、実家庭で数日〜1週間、致命的問題なく運用できた。
- 旧 Render API を Suspend しても、フロントが Laravel Cloud だけで正常動作する。
- 旧 Render API の削除可否をユーザーが判断できる状態(設定は保存済み)。
