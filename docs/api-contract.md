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
