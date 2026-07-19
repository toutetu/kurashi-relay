# くらしリレー
## 第1実装 API契約 v0.1

# 1. 共通

Base URL：

```text
http://localhost:8000/api
```

日時：

- ISO 8601
- オフセット付き
- 例：`2026-07-12T08:12:00+09:00`

# 2. 成功レスポンス

```json
{
  "status": "success",
  "data": {},
  "meta": {}
}
```

# 3. エラーレスポンス

```json
{
  "status": "error",
  "message": "入力内容を確認してください。",
  "errors": {}
}
```

# 4. GET /api/health

```json
{
  "status": "success",
  "data": {
    "service": "kurashi-relay-api"
  }
}
```

# 5. GET /api/dashboard

Query：

```text
date=YYYY-MM-DD
```

省略時は基準日を使う。
不正な日付は422。

レスポンス：

```json
{
  "status": "success",
  "data": {
    "date": "2026-07-12",
    "currentActivity": {},
    "nextPlans": [],
    "quickLogs": [],
    "conditions": {},
    "childStrategy": {},
    "timeBalance": {},
    "scheduleImpactSummary": {},
    "actionItems": [],
    "lastWar": {},
    "scheduleComparisons": []
  },
  "meta": {
    "timezone": "Asia/Tokyo"
  }
}
```

# 6. scheduleComparisons

```json
{
  "timeRange": {
    "start": "2026-07-12T09:00:00+09:00",
    "end": "2026-07-12T10:00:00+09:00"
  },
  "plan": null,
  "actuals": [
    {
      "id": "entry-102",
      "title": "家事",
      "kind": "activity",
      "category": "housework",
      "startAt": "2026-07-12T09:10:00+09:00",
      "endAt": "2026-07-12T09:50:00+09:00",
      "details": [
        "洗濯",
        "掃除機がけ",
        "片付け"
      ]
    }
  ],
  "difference": {
    "status": "unplanned_activity",
    "startDelayMinutes": 0,
    "plannedMinutes": 0,
    "actualMinutes": 40,
    "interruptionCount": 0,
    "lostMinutes": 0,
    "causes": [
      "隙間時間を有効活用"
    ]
  }
}
```

# 7. DifferenceStatus

```text
on_schedule
delayed
interrupted
cancelled
moved_to_night
unplanned_activity
no_plan_no_record
```

# 8. 第1実装の更新操作

活動開始、クイック記録、体調変更等はReactのローカル状態だけに反映する。
更新APIは第2実装で追加する。

# 9. 現行のおしごと保存API

2026-07-19時点では、第2実装として次の更新APIが存在する。

```text
POST   /api/task-records
DELETE /api/task-records/{id}
```

`POST /api/task-records` の成功レスポンスは、報酬の有無にかかわらず同じJSON形を返す。
報酬が発生しない通常保存でも `data.revealed_reward` を省略せず `null` とする。

```json
{
  "status": "success",
  "data": {
    "record": {
      "id": 1,
      "member": "child",
      "task": "shokki",
      "record_date": "2026-07-19",
      "completed_at": "2026-07-19T19:30:00+09:00",
      "cancelled_at": null
    },
    "summary": {},
    "revealed_reward": null
  },
  "meta": {
    "timezone": "Asia/Tokyo",
    "deduplicated": false
  }
}
```

節目報酬が発生したときだけ、`revealed_reward` は
`type`、`item_slug`、`milestone_number`、`obtained_on` を持つオブジェクトになる。
同一 `idempotency_key` の再送は同じrecordを返し、`meta.deduplicated` を `true` とする。

# 10. Inertia移行時の契約方針

DB target schema完成後、通常Web画面はLaravel+Inertia+Reactへ段階移行する。移行が完了するまで、
本書の既存REST契約は有効であり、同じreleaseで一括削除しない。

Inertia I0で全18 endpointを次へ分類する。

- 通常画面の初期表示・通常formだけが利用: Inertia props/formへ移し、旧endpointは廃止候補。
- offline退避・再送、冪等性、Service Worker、通知に必要: 内部JSON APIとして残す。
- native appまたは外部clientへJSON提供が必要: versionと認証を明示して残す。

TanStack Query、Zod schema、API Resourceは一括削除せず、利用client、code reference、accessがなくなった
対象だけをI7で整理する。Google Calendar APIはLaravelから外部サービスを呼ぶ契約なので、この分類とは別に継続する。
