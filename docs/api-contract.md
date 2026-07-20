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

# 10. API-first SPA移行後の契約方針

DR-034 / DR-038により、通常Web画面も既存JSON APIを利用する。Inertia props/formへ移してendpointを廃止する方針は採らない。

維持方針:

- 本書の既存REST契約は有効であり、移行中にmethod、path、payload、status codeを変えない。
- 全endpointを維持し、same-origin internal APIとしてLaravelから配信するSPAが利用する。
- offline退避・再送、冪等性(`idempotency_key`)、Service Worker、通知に必要な契約も維持する。
- native appまたは外部clientへJSON提供が必要になった場合は、versionと認証を明示して残す。

TanStack Query、Zod schema、API Resourceは一括削除しない。利用client、code reference、accessがなくなった
対象だけを整理Phaseで扱う。Google Calendar APIはLaravelから外部サービスを呼ぶ契約なので、
この移行とは別に継続する。

移行完了記録: `docs/archive/phases/api-first-spa-migration/`

# 11. 現行アクセス契約

DR-042により、家族共有トークンで個人データAPIを保護する。

- `/api/health` は未認証のまま通す。
- それ以外の `/api/*` は `X-Family-Token`（`EnsureFamilyToken`）必須。
- トークン未設定は503、不一致は401、連続失敗は429。比較は `hash_equals`。
- フロントは端末内あいことば（半角英数字）を保存し、共通API clientがヘッダを付与する。
- Sanctum・ユーザー個別認証は導入しない（単一家庭の共有あいことば運用）。
- SPA移行当時の未認証公開の記録は DR-035 と
  `docs/archive/phases/api-first-spa-migration/access-contract-a3.md` に残す。
- 実装指示の保管: `docs/archive/specs/family-token/`。

# 12. Googleカレンダー接続（DR-046）

- `GET /api/calendar-connections/oauth/start` … 認可URLを返す（family-token 必須）。
- `GET /calendar/oauth/callback` … Googleリダイレクト先（ブラウザ、family-token ヘッダ不要。state で保護）。
- `POST /api/calendar-connections/{id}/sync` … refresh_token（または開発用 access token）で当日イベントを取得し、
  `calendar_events` / `calendar_event_versions` 経由で `planned_activities(source_type=google_calendar)` へ材料化。
- `DELETE /api/calendar-connections/{id}` … 接続解除（トークン破棄・非アクティブ化）。
- 環境変数: `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / 任意で `GOOGLE_REDIRECT_URI`。
