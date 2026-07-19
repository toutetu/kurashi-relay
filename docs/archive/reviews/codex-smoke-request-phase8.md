# Codex スモーク依頼: Phase 8-a 安定確認(curl 実行)

Fable からの依頼。**あなた(Codex)が curl を実行し、合否と出力要点だけを報告**してください。
Fable は自分では叩かず、あなたのレポートを読みます(委譲方針)。

- 親: `docs/archive/phases/phase8-stability-and-render-stop.md`(8a チェックリスト #1〜7)
- API 契約: `docs/archive/specs/oshigoto-persistence-backend-spec.md` §5
- 前フェーズ実証: `docs/archive/phases/phase6-results.md`(単発系は合格済み)

## 対象と大前提

- 対象 API(本番): `https://kurashi-relay-production-olnfy0.laravel.cloud`(`/api/*` のみ。ルート `/` は404が正常)
- **本番 DB に書き込む**。作成した record は**必ず最後に DELETE で取消し、元のクリーンな状態へ戻す**こと。
- **既存の当日データを消さない**。child は `kigae`/`fuku` が完了済(過去テスト由来 record_id 3,4)なので、
  スモークでは**それらに触れない別タスク**(child=`shokki`、mother=`shokki`)を使う。
- `migrate:fresh`・テーブル全削除は**本番で禁止**。後始末は各 record の DELETE のみで行う。

## 実行内容(#1〜7)

`$API` を上記 URL に置いてそのまま実行できます。DELETE 用に応答 JSON の `data.record.id` を控えてください。

```bash
API="https://kurashi-relay-production-olnfy0.laravel.cloud"

# #1 health
curl -s -o /dev/null -w "health: %{http_code} (%{time_total}s)\n" "$API/api/health"

# #2 休止復帰（Scale to Zero 300秒）: このコマンドの直前に 6分以上 API へアクセスしない状態を作り、
#    「冷えた初回」の成否と所要時間を計測する。エラーにならなければ合格（初回だけ遅いのは可）。
curl -s -o /dev/null -w "cold GET: %{http_code} (%{time_total}s)\n" "$API/api/tasks?member=child"

# #3 当日タスク取得（child / mother）
curl -s "$API/api/tasks?member=child"  | head -c 500; echo
curl -s "$API/api/tasks?member=mother" | head -c 500; echo

# #4-5 完了→再送（冪等）→取消　（child=shokki を使用）
KEY="phase8-smoke-$(date +%s)"
echo "== POST #1 (expect 201, meta.deduplicated:false) =="
curl -s -X POST "$API/api/task-records" -H "Content-Type: application/json" \
  -d "{\"member\":\"child\",\"task\":\"shokki\",\"idempotency_key\":\"$KEY\",\"source\":\"web\"}" ; echo
echo "== POST #2 same key (expect 200, meta.deduplicated:true, 同 record.id) =="
curl -s -X POST "$API/api/task-records" -H "Content-Type: application/json" \
  -d "{\"member\":\"child\",\"task\":\"shokki\",\"idempotency_key\":\"$KEY\",\"source\":\"web\"}" ; echo
# ↑応答の data.record.id を REC に控える
# echo "== DELETE (expect 200, cancelled_at) =="
# curl -s -X DELETE "$API/api/task-records/$REC" ; echo

# #6 母ポイント経路（単価スナップショット=完了1回で points +10）
KEYM="phase8-mom-$(date +%s)"
echo "== mother POST (expect 201, points 反映) =="
curl -s -X POST "$API/api/task-records" -H "Content-Type: application/json" \
  -d "{\"member\":\"mother\",\"task\":\"shokki\",\"idempotency_key\":\"$KEYM\",\"source\":\"web\"}" ; echo
curl -s "$API/api/rewards/summary?member=mother" ; echo
# ↑作成した mother record.id を RECM に控えて DELETE
# curl -s -X DELETE "$API/api/task-records/$RECM" ; echo
curl -s "$API/api/rewards/summary?member=mother" ; echo   # 取消後 points が戻ることを確認

# #7 日付境界: 上の応答 JSON の completed_at が "+09:00" オフセット、meta.timezone が Asia/Tokyo か目視
```

## 合否の見方

| # | 合格基準 |
|---|---|
| 1 | 200・`{"service":"kurashi-relay-api"}` |
| 2 | 冷えた初回 GET が 200(所要秒を記録。エラー/タイムアウトなら不合格) |
| 3 | child=5タスク・mother一覧が返る(既存 done 状態は壊れていない) |
| 4 | POST#1=201・`meta.deduplicated:false`・`data.record.id` 採番 |
| 5 | POST#2=200・`meta.deduplicated:true`・**同一 record.id**(二重加算なし) |
| 6 | mother summary の `points` が POST で +10、DELETE 後に元へ戻る |
| 7 | `completed_at` が `+09:00`・`meta.timezone`=`Asia/Tokyo` |

## 後始末(必須)

- スモークで作成した child(`shokki`)・mother(`shokki`)の record を**両方 DELETE で取消**。
- 最後に `curl -s "$API/api/tasks?member=child"` と mother を再取得し、
  **スモーク前と同じ状態(shokki は done:false)に戻ったこと**を確認して報告。
- `kigae`/`fuku`(record_id 3,4)は**触っていないこと**を明記。

## 報告フォーマット

```
## Phase 8-a スモーク結果
- #1 health: [OK/NG] (code, 秒)
- #2 cold-start: [OK/NG] (code, 秒 / 直前アイドル時間)
- #3 tasks GET: [OK/NG] child N件 / mother N件
- #4 POST#1: [OK/NG] (code, deduplicated, record.id)
- #5 再送: [OK/NG] (code, deduplicated, 同id?)
- #6 mother points: [OK/NG] (POST後 / DELETE後)
- #7 JST: [OK/NG] (offset, timezone)
- 後始末: [完了/未] 作成recordを全取消・kigae/fuku不変
- 総合: [合格/要対応] + 気づき
```

出力は**要点と JSON の該当行のみ**でよいです(全文貼り付け不要)。
