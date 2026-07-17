# くらしリレー
## Codex用 第1実装指示書
### Laravel REST API＋React SPA版 v1.0

作成日：2026-07-12  
対象フェーズ：第1実装  
実装方式：Laravel REST API＋独立React SPA  
リポジトリ方式：モノレポ  
今回の到達点：**Laravel APIから取得したダッシュボードデータを、Reactでレスポンシブ表示できる状態にする**

---

# 1. プロジェクトの目的

「くらしリレー」は、母と娘の生活を監視・評価するためのアプリではない。

本アプリの目的は、次の内容を可視化し、母だけに集中している生活支援を家族・学校・支援機関へ再配分することである。

- 娘への支援に母が使った時間
- 声かけ、学校連絡、腹痛対応、送迎、校内付き添いなどの支援内容
- 待機・拘束時間
- 支援後の回復時間
- 就労準備、在宅訓練、家事などの予定
- 予定と実績の差
- 予定が遅延・中断・中止・振替になった原因
- 娘本人の希望と、その日の作戦
- 家族・学校・支援者の担当と実施状況

記録量を増やすこと自体を目的にしない。少ない操作で生活の実態を記録し、支援者と相談するための材料を作る。

---

# 2. 作業開始前に読む資料

リポジトリ内に以下がある場合、必ず最初に読むこと。

```text
AGENTS.md
docs/product-plan.md
docs/codex-design-spec.md
docs/data-model.md
docs/wireframes/
```

この指示書と他資料が矛盾する場合、今回の実装範囲については本指示書を優先する。

仕様が不明確な場合は、大きな機能を追加せず、最小で安全な実装を選ぶこと。

---

# 3. 今回の実装方針

第1実装では、フロントエンドだけのモックではなく、Laravel APIとReact SPAの接続まで確認する。ただし、実装範囲を広げすぎない。

## 今回実装するもの

### バックエンド

1. Laravel APIプロジェクト
2. API共通レスポンス形式
3. ダッシュボード用API
4. ダミーデータを返すサービス層
5. API Resource
6. 日付パラメータのバリデーション
7. 例外時のJSONレスポンス
8. CORS設定
9. API Feature Test
10. ヘルスチェックAPI

### フロントエンド

1. React＋TypeScript＋Vite
2. React Router
3. TanStack Query
4. Tailwind CSS
5. lucide-react
6. レスポンシブ共通レイアウト
7. 母向けホームダッシュボード
8. 今日の予定と実績の比較画面
9. ダッシュボードAPIからのデータ取得
10. ローディング・エラー・再試行表示
11. 一部操作のローカル動作
12. コンポーネントテスト

### 開発基盤

1. モノレポ構成
2. ルートREADME
3. `.env.example`
4. 開発起動手順
5. lint
6. typecheck
7. test
8. build

---

# 4. 今回実装しないもの

以下は第2実装以降とする。

- ユーザー登録
- ログイン
- Laravel Sanctum認証
- Google OAuth
- Googleカレンダー連携
- データベースへの本保存
- 支援者アカウント
- 支援者別レポート
- PDF出力
- 期限付き共有URL
- 通知・メール送信
- Excel VBA連携
- GPS
- AIによる判断
- ラストウォー外部サービス連携
- 本番デプロイ
- 別ドメイン運用

第1実装のAPIデータは、Laravel側の固定ダミーデータまたは専用Fixtureから返す。React側だけに同じダミーデータを重複して持たせない。

---

# 5. 技術スタック

## バックエンド

```text
Laravel
PHP
REST API
API Resource
Form Request
PHPUnit
Laravel Pint
```

既存リポジトリにPestの規約がある場合はPestを使用してよい。新規作成時はLaravel標準のテスト構成に合わせる。

## フロントエンド

```text
React
TypeScript
Vite
React Router
TanStack Query
Tailwind CSS
lucide-react
Vitest
React Testing Library
ESLint
Prettier
```

## 実装条件

- TypeScript strict
- `any` を使用しない
- Reactは関数コンポーネント
- propsに型を付ける
- APIレスポンスに対応する型を定義する
- API通信をコンポーネント内へ直接散在させない
- APIクライアント、Query Hook、表示コンポーネントを分離する
- Controllerへ業務ロジックを詰め込まない
- LaravelのAPI Resourceでレスポンス形を管理する
- UI文言は日本語
- 日時表示は `Asia/Tokyo`
- APIの日時はISO 8601文字列
- モバイルファースト
- PC・タブレット・スマートフォンで同じデータを再配置する
- 端末ごとにページを複製しない

---

# 6. 推奨リポジトリ構成

```text
kurashi-relay/
├─ AGENTS.md
├─ README.md
├─ docs/
│  ├─ product-plan.md
│  ├─ codex-design-spec.md
│  ├─ data-model.md
│  ├─ codex-implementation-01.md
│  └─ wireframes/
├─ backend/
│  ├─ app/
│  │  ├─ Http/
│  │  │  ├─ Controllers/Api/
│  │  │  ├─ Requests/
│  │  │  └─ Resources/
│  │  ├─ Services/
│  │  └─ Data/
│  ├─ routes/api.php
│  ├─ tests/Feature/Api/
│  ├─ composer.json
│  └─ .env.example
├─ frontend/
│  ├─ src/
│  │  ├─ app/
│  │  ├─ api/
│  │  ├─ components/
│  │  ├─ features/
│  │  ├─ hooks/
│  │  ├─ pages/
│  │  ├─ styles/
│  │  ├─ types/
│  │  └─ main.tsx
│  ├─ package.json
│  ├─ vite.config.ts
│  └─ .env.example
└─ scripts/
```

ディレクトリ名は既存規約がある場合は合わせる。ただし、API通信層、Query層、表示コンポーネントの責務分離は維持する。

---

# 7. API設計

## 7.1 ヘルスチェック

```http
GET /api/health
```

### 正常レスポンス

```json
{
  "status": "ok",
  "data": {
    "service": "kurashi-relay-api"
  }
}
```

## 7.2 ダッシュボード取得

```http
GET /api/dashboard?date=2026-07-12
```

`date` を省略した場合は、アプリの基準日を使用する。

### レスポンス概要

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

## 7.3 API共通レスポンス

### 成功

```json
{
  "status": "success",
  "data": {},
  "meta": {}
}
```

### バリデーションエラー

```json
{
  "status": "error",
  "message": "入力内容を確認してください。",
  "errors": {
    "date": ["日付の形式が正しくありません。"]
  }
}
```

### サーバーエラー

```json
{
  "status": "error",
  "message": "データの取得中に問題が発生しました。"
}
```

内部例外の詳細やスタックトレースを本番向けレスポンスへ含めない。

---

# 8. ダッシュボードAPIのダミーデータ

## 8.1 現在の活動

```json
{
  "id": "activity-001",
  "title": "登校支援",
  "category": "school_support",
  "startedAt": "2026-07-12T08:12:00+09:00",
  "status": "running",
  "relatedPlanTitle": "娘の登校準備"
}
```

## 8.2 次の予定

```json
[
  {
    "id": "plan-001",
    "startAt": "2026-07-12T11:30:00+09:00",
    "endAt": "2026-07-12T12:30:00+09:00",
    "title": "学校への送迎・引き渡し",
    "category": "school_support",
    "source": "manual",
    "status": "planned"
  },
  {
    "id": "plan-002",
    "startAt": "2026-07-12T13:00:00+09:00",
    "endAt": "2026-07-12T17:00:00+09:00",
    "title": "在宅訓練",
    "category": "work_preparation",
    "source": "google",
    "status": "planned"
  },
  {
    "id": "plan-003",
    "startAt": "2026-07-12T17:30:00+09:00",
    "endAt": "2026-07-12T18:00:00+09:00",
    "title": "買い物",
    "category": "housework",
    "source": "manual",
    "status": "planned"
  }
]
```

## 8.3 クイック記録

```json
[
  {"type": "wake_prompt", "label": "起床の声かけ", "count": 3},
  {"type": "change_clothes_prompt", "label": "着替えの声かけ", "count": 2},
  {"type": "school_contact", "label": "学校へ連絡", "count": 1},
  {"type": "stomachache_support", "label": "腹痛対応", "count": 1},
  {"type": "transport", "label": "自転車で送迎", "count": 0},
  {"type": "school_handoff", "label": "引き渡し完了", "count": 0}
]
```

## 8.4 母・娘の状態

```json
{
  "mother": {"physical": 3, "mood": 2, "inputSource": "self"},
  "daughter": {"physical": 3, "mood": 3, "inputSource": "guardian_observation"}
}
```

## 8.5 娘の今日の作戦

```json
{
  "desiredOutcome": "短時間なら学校へ行きたい",
  "firstStep": "朝食を食べる",
  "requestedSupports": [
    "11時30分ごろの登校にしてほしい",
    "強く急かさないでほしい"
  ],
  "fallbackPlans": [
    "30分後にもう一度考える",
    "難しい場合は休む"
  ],
  "confidence": "slightly_anxious",
  "note": ""
}
```

## 8.6 時間のバランス

```json
{
  "sleepMinutes": 435,
  "waitingMinutes": 130,
  "activityMinutes": 225,
  "recoveryMinutes": 80
}
```

## 8.7 予定への影響

```json
{
  "onScheduleCount": 2,
  "delayedCount": 3,
  "interruptedCount": 1,
  "cancelledCount": 1,
  "movedToNightCount": 1,
  "lostMinutes": 130,
  "mainCauses": [
    {"label": "登校支援", "minutes": 60},
    {"label": "待機・拘束", "minutes": 50},
    {"label": "回復・休息", "minutes": 20}
  ]
}
```

## 8.8 次のアクション

```json
[
  {
    "id": "action-001",
    "title": "学校との面談の持ち物を確認する",
    "assignee": "母",
    "dueAt": "2026-07-12T09:30:00+09:00",
    "status": "not_started",
    "priority": "high"
  },
  {
    "id": "action-002",
    "title": "祖父母の次回宿泊日を相談支援へ確認する",
    "assignee": "相談支援",
    "dueAt": "2026-07-15T17:00:00+09:00",
    "status": "coordinating",
    "priority": "medium"
  },
  {
    "id": "action-003",
    "title": "夕食の準備",
    "assignee": "母",
    "dueAt": "2026-07-12T17:30:00+09:00",
    "status": "not_started",
    "priority": "medium"
  }
]
```

## 8.9 ラストウォー

```json
{
  "gameName": "ラストウォー",
  "plannedTasks": ["デイリーミッション", "連盟タスク", "資源回収"],
  "completedCount": 2,
  "totalCount": 3,
  "playMinutes": 35,
  "recoveryEffect": 4
}
```

---

# 9. 今日の予定と実績の比較データ

本画面は、第1実装の主要画面とする。

## 9.1 基本原則

```text
縦方向：時間の流れ
左側：予定
右側：実績
下部または右端：差分・原因
```

PCとタブレットでは左右比較を維持する。スマートフォンでは、同じデータを以下の順に縦積みする。

```text
予定
実績
差分
```

## 9.2 データ形式

```json
[
  {
    "timeRange": {
      "start": "2026-07-12T08:00:00+09:00",
      "end": "2026-07-12T09:00:00+09:00"
    },
    "plan": {
      "id": "plan-101",
      "title": "登校支援",
      "startAt": "2026-07-12T08:00:00+09:00",
      "endAt": "2026-07-12T09:00:00+09:00",
      "category": "school_support",
      "details": ["起床の声かけ", "着替えの声かけ", "学校への送迎・引き渡し"]
    },
    "actuals": [
      {
        "id": "entry-101",
        "title": "登校支援",
        "kind": "activity",
        "category": "school_support",
        "startAt": "2026-07-12T08:00:00+09:00",
        "endAt": "2026-07-12T08:50:00+09:00",
        "details": ["起床の声かけ", "着替えの声かけ", "学校への送迎・引き渡し"]
      }
    ],
    "difference": {
      "status": "delayed",
      "startDelayMinutes": 0,
      "plannedMinutes": 60,
      "actualMinutes": 50,
      "interruptionCount": 0,
      "lostMinutes": 10,
      "causes": ["起床・準備に時間"]
    }
  },
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
        "details": ["洗濯", "掃除機がけ", "片付け"]
      }
    ],
    "difference": {
      "status": "unplanned_activity",
      "startDelayMinutes": 0,
      "plannedMinutes": 0,
      "actualMinutes": 40,
      "interruptionCount": 0,
      "lostMinutes": 0,
      "causes": ["隙間時間を有効活用"]
    }
  },
  {
    "timeRange": {
      "start": "2026-07-12T10:00:00+09:00",
      "end": "2026-07-12T12:00:00+09:00"
    },
    "plan": {
      "id": "plan-102",
      "title": "在宅訓練",
      "startAt": "2026-07-12T10:00:00+09:00",
      "endAt": "2026-07-12T12:00:00+09:00",
      "category": "work_preparation",
      "details": ["ポートフォリオ制作"]
    },
    "actuals": [
      {
        "id": "entry-103",
        "title": "腹痛対応・待機",
        "kind": "waiting",
        "category": "stomachache_toilet_wait",
        "startAt": "2026-07-12T10:00:00+09:00",
        "endAt": "2026-07-12T10:40:00+09:00",
        "details": ["娘の腹痛対応", "トイレ待機"]
      },
      {
        "id": "entry-104",
        "title": "回復・休息",
        "kind": "recovery",
        "category": "after_school_support",
        "startAt": "2026-07-12T10:40:00+09:00",
        "endAt": "2026-07-12T11:10:00+09:00",
        "details": ["気持ちを整える"]
      }
    ],
    "difference": {
      "status": "cancelled",
      "startDelayMinutes": 0,
      "plannedMinutes": 120,
      "actualMinutes": 0,
      "interruptionCount": 0,
      "lostMinutes": 120,
      "causes": ["娘の腹痛対応", "待機・拘束", "回復"]
    }
  },
  {
    "timeRange": {
      "start": "2026-07-12T13:00:00+09:00",
      "end": "2026-07-12T15:00:00+09:00"
    },
    "plan": {
      "id": "plan-103",
      "title": "在宅訓練",
      "startAt": "2026-07-12T13:00:00+09:00",
      "endAt": "2026-07-12T15:00:00+09:00",
      "category": "work_preparation",
      "details": ["ポートフォリオ制作"]
    },
    "actuals": [
      {
        "id": "entry-105",
        "title": "在宅訓練",
        "kind": "activity",
        "category": "work_preparation",
        "startAt": "2026-07-12T13:00:00+09:00",
        "endAt": "2026-07-12T15:00:00+09:00",
        "details": ["ポートフォリオ制作"]
      }
    ],
    "difference": {
      "status": "on_schedule",
      "startDelayMinutes": 0,
      "plannedMinutes": 120,
      "actualMinutes": 120,
      "interruptionCount": 0,
      "lostMinutes": 0,
      "causes": []
    }
  }
]
```

## 9.3 予定がない時間の表示

Googleカレンダーまたは手入力予定がない時間は、予定欄に次を表示する。

```text
予定なし
この時間には予定が登録されていません
```

実績がある場合：

```text
予定外の活動
9:10～9:50 家事
```

実績もない場合：

```text
予定なし
実績記録なし
```

空白にはしない。「予定なし」と「読み込み失敗」を見た目で区別する。

---

# 10. フロントエンド画面

## 10.1 ルート

```text
/                         ホーム
/schedule-comparison      今日の予定と実績
/schedule                 今日の予定（仮画面）
/records                  記録（仮画面）
/child-plan               娘の希望（仮画面）
/support                  支援（仮画面）
/reports                  レポート（仮画面）
/settings                 設定（仮画面）
```

ホームと今日の予定と実績以外は、タイトルと「今後実装予定」の表示だけでよい。

## 10.2 API接続

TanStack QueryのQuery Hookを作成する。

```ts
useDashboardQuery(date)
```

コンポーネント内で直接 `fetch` を呼ばない。

推奨分離：

```text
api/client.ts
api/dashboard.ts
features/dashboard/queries/useDashboardQuery.ts
```

## 10.3 API Base URL

```env
VITE_API_BASE_URL=http://localhost:8000
```

URLの末尾スラッシュ差異を吸収する。

## 10.4 状態

以下を明示的に表示する。

- 初回ローディング
- 再取得中
- 正常表示
- APIエラー
- データなし
- 再試行ボタン

エラー時に画面全体を真っ白にしない。

---

# 11. デザイン仕様

## 11.1 全体

- 明るい
- かわいい
- 情報量が多くても読みやすい
- 人物イラストは原則使用しない
- アイコンを多用する
- アイコンと文字を併用する
- 花、星、月、リボンなど小さな装飾は使用可能
- 装飾は入力操作を妨げない
- 医療システムのように冷たくしない

## 11.2 母向け画面

母向け画面は、以下の4色を同じ程度の比重で使う。

```text
赤系
黄色系
青系
白系
```

### 色の役割

- 白：背景・余白・通常カード
- 青：予定・情報・ナビゲーション
- 黄：補助情報・注意・待機
- 赤：重要な変更・中断・期限・警告

赤をエラー専用にしすぎず、柔らかい赤やピンク寄りの色も使用する。

```css
:root {
  --mother-red: #ef767a;
  --mother-red-soft: #fff0f1;
  --mother-yellow: #f3c85b;
  --mother-yellow-soft: #fff8db;
  --mother-blue: #68a7e3;
  --mother-blue-soft: #edf6ff;
  --mother-white: #ffffff;
  --mother-bg: #fffdf9;
  --text-main: #28334a;
  --text-muted: #667085;
  --border: #dce5ef;
}
```

## 11.3 娘向け画面

娘向け画面は次の方針を維持する。

- 水色ベース
- 紫アクセント
- 軽いゴスロリ要素
- レース、リボン、月、星
- 人物イラストなし

第1実装ではホーム内の「娘の今日の作戦」カードだけに適用する。

---

# 12. レスポンシブ仕様

## スマートフォン

```text
0px～767px
1カラム
固定ヘッダー
下部ナビゲーション
```

予定実績比較は次の順に縦積みする。

```text
時刻
予定
実績
差分
```

## タブレット

```text
768px～1199px
2カラム
上部ヘッダー
下部ナビゲーション
```

タブレット横向きを主利用環境として最適化する。

予定実績比較は左右並びを維持する。

```text
時刻 | 予定 | 実績
      差分
```

## PC

```text
1200px以上
左サイドバー
上部ヘッダー
3カラム
```

予定実績比較は以下とする。

```text
時刻 | 予定 | 実績 | 差分
```

## 共通

- 横スクロールを発生させない
- タッチ対象44px以上
- 主要文字16px以上
- 200%拡大でも主要操作が可能
- カード間の余白を確保する
- 表が狭い場合は、列幅を無理に縮小せずレイアウトを縦積みに切り替える

---

# 13. ホームダッシュボード

## 13.1 現在の活動

表示：活動名、カテゴリ、開始時刻、経過時間、関連予定、状態。

操作：終了、一時停止、再開、別の活動へ切り替え。

第1実装では、操作結果はReactのローカル状態に反映する。APIへの更新保存は行わない。

## 13.2 クイック活動開始

- 就労準備
- 家事
- 登校支援
- 待機
- 回復・休息
- ラストウォー

操作はローカル状態でよい。

## 13.3 クイック記録

- 起床の声かけ
- 着替えの声かけ
- 学校へ連絡
- 腹痛対応
- 自転車で送迎
- 引き渡し完了

1タップで件数を増やす。5秒以内は取り消し可能にする。

## 13.4 母・娘の体調と気分

- 母の体調1～5
- 母の気分1～5
- 娘の体調1～5
- 娘の気分1～5
- 娘の入力者区分

入力者区分：娘本人、母が確認、母の観察。

第1実装ではローカル編集でよい。

## 13.5 娘の今日の作戦

表示：今日どうしたいか、最初に試すこと、大人にしてほしいこと、難しい場合の別案、自信の程度。

禁止表現：失敗、未達成、達成率、頑張り不足。

## 13.6 時間のバランス

- 睡眠
- 待機・拘束
- 活動
- 回復

## 13.7 予定への影響

- 予定どおり
- 遅れ
- 中断
- 中止
- 夜への振り替え
- 失われた時間
- 主な原因

## 13.8 次のアクション

- 内容
- 担当
- 期限
- 状態
- 優先度

## 13.9 ラストウォー

- 今日の予定
- 完了数
- 総数
- プレイ時間
- 回復評価

本人向けカードとして表示する。

---

# 14. バックエンド実装の責務

## Controller

- リクエストを受ける
- Requestの検証結果を受け取る
- Serviceを呼ぶ
- Resourceを返す

## Service

- ダミーデータの生成
- 日付条件の適用
- レスポンスに必要なデータの組み立て

## Resource

- JSONのキー名
- 日時表現
- null表現
- 配列構造

## Request

`date` の検証：

```text
nullable
date_format:Y-m-d
```

## Controllerへ直接書かないもの

- 大量の配列定義
- 表示用加工
- 日付計算
- カテゴリ判定
- 差分計算

---

# 15. フロントエンド型定義

```ts
export type ActivityCategory =
  | 'work_preparation'
  | 'housework'
  | 'school_support'
  | 'waiting'
  | 'recovery'
  | 'last_war';

export type ActivityStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'completed';

export interface CurrentActivity {
  id: string;
  title: string;
  category: ActivityCategory;
  startedAt: string;
  status: ActivityStatus;
  relatedPlanTitle?: string;
}

export type QuickLogType =
  | 'wake_prompt'
  | 'change_clothes_prompt'
  | 'school_contact'
  | 'stomachache_support'
  | 'transport'
  | 'school_handoff';

export interface QuickLog {
  type: QuickLogType;
  label: string;
  count: number;
}

export type Score = 1 | 2 | 3 | 4 | 5;

export type DaughterInputSource =
  | 'daughter'
  | 'mother_confirmed'
  | 'mother_observation';

export interface ConditionState {
  physical: Score;
  mood: Score;
  inputSource?: DaughterInputSource;
}

export interface TimeBalance {
  sleepMinutes: number;
  waitingMinutes: number;
  activityMinutes: number;
  recoveryMinutes: number;
}

export type DifferenceStatus =
  | 'on_schedule'
  | 'delayed'
  | 'interrupted'
  | 'cancelled'
  | 'moved_to_night'
  | 'unplanned_activity'
  | 'no_plan_no_record';

export interface ScheduleComparisonItem {
  timeRange: { start: string; end: string };
  plan: SchedulePlan | null;
  actuals: ActualEntry[];
  difference: ScheduleDifference;
}

export interface DashboardResponse {
  date: string;
  currentActivity: CurrentActivity | null;
  nextPlans: SchedulePlan[];
  quickLogs: QuickLog[];
  conditions: {
    mother: ConditionState;
    daughter: ConditionState;
  };
  childStrategy: ChildStrategy;
  timeBalance: TimeBalance;
  scheduleImpactSummary: ScheduleImpactSummary;
  actionItems: ActionItem[];
  lastWar: LastWarProgress;
  scheduleComparisons: ScheduleComparisonItem[];
}
```

ランタイムスキーマを導入する場合はZodを使用してよいが、第1実装では必須ではない。

---

# 16. テスト

## Laravel API

最低限、次をFeature Testで確認する。

1. `/api/health` が200を返す
2. `/api/dashboard` が200を返す
3. レスポンスに `status` と `data` がある
4. ダッシュボードに必要なキーが含まれる
5. 正しい日付を指定できる
6. 不正な日付で422を返す
7. `scheduleComparisons` に予定なし＋実績ありのデータが含まれる
8. 例外時にHTMLではなくJSONを返す

## React

最低限、次をテストする。

1. API取得中にローディングを表示する
2. API成功時にダッシュボードを表示する
3. API失敗時に再試行ボタンを表示する
4. 現在の活動が表示される
5. クイック記録で件数が増える
6. クイック記録を取り消せる
7. 母と娘の状態を区別して表示する
8. 娘の今日の作戦に禁止表現がない
9. 予定実績比較で左に予定、右に実績が表示される
10. 予定なし＋実績ありを「予定外の活動」と表示する
11. 予定なし＋実績なしを「実績記録なし」と表示する

API通信はMock Service Workerまたはテスト用mockで代替する。通信成功・失敗・空データを検証する。

---

# 17. アクセシビリティ

- ボタンに明確な名前
- アイコンのみのボタンに `aria-label`
- キーボードで主要操作が可能
- フォーカスリングを消さない
- モーダルはフォーカストラップ
- Escapeで閉じる
- 色だけで状態を伝えない
- 体調スコアはアイコンと数値を併用
- トーストは `aria-live="polite"`
- 表形式を使用する場合も、スマートフォンで意味が失われない
- 「予定」「実績」「差分」を見出しとして読み上げられるようにする

---

# 18. 開発起動方法

ルートREADMEへ次を記載する。

## バックエンド

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

## フロントエンド

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 開発URL例

```text
React:      http://localhost:5173
Laravel API: http://localhost:8000
```

CORSは開発環境の `http://localhost:5173` を許可する。

---

# 19. 品質確認コマンド

## Laravel

```bash
cd backend
php artisan test
./vendor/bin/pint --test
```

静的解析ツールが既存導入済みの場合は、それも実行する。

## React

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

すべて成功すること。

---

# 20. 受け入れ条件

## API

- `/api/health` が動く
- `/api/dashboard` が動く
- `date` パラメータを受け取れる
- 不正な日付は422
- API Resource経由のJSON
- Controllerが肥大化していない
- React用ダミーデータはLaravel側だけにある

## ホーム

- APIから取得して表示する
- ローディングがある
- エラー表示と再試行がある
- 母向け配色が赤・黄・青・白の4色
- 娘の作戦カードは水色＋紫
- 人物イラストなし
- アイコンを使用
- 主要カードがすべて表示される

## 予定と実績

- タブレット・PCで左に予定、右に実績
- 時間が上から下へ進む
- 差分と原因が見える
- 予定なしの時間も空白にしない
- 予定外の活動が見える
- 実績記録なしが見える
- スマートフォンでは予定→実績→差分の縦積み

## レスポンシブ

- 390pxで横スクロールなし
- 768pxで破綻しない
- 1024pxで左右比較が読みやすい
- 1440pxでサイドバー＋主要情報
- 200%拡大で主要操作が可能

## 品質

- Laravel test成功
- Pint成功
- React lint成功
- React typecheck成功
- React test成功
- React build成功

---

# 21. 実装手順

Codexは以下の順序で進めること。

1. リポジトリと既存ファイルを確認
2. 資料を読む
3. 実装計画を短く提示
4. backendとfrontendの基盤を作る
5. Laravelのヘルスチェックを作る
6. ダッシュボード用ServiceとAPI Resourceを作る
7. `/api/dashboard` を作る
8. APIテストを作る
9. ReactのAPIクライアントを作る
10. TanStack Queryを設定する
11. 共通レイアウトを作る
12. ホームダッシュボードを作る
13. 予定実績比較画面を作る
14. ローディング・エラー・再試行を作る
15. ローカル操作を実装する
16. Reactテストを作る
17. すべての品質確認コマンドを実行
18. 問題を修正する
19. 変更内容と残課題を報告する

---

# 22. 禁止事項

- Inertiaを導入しない
- Vueを導入しない
- Next.jsへ変更しない
- Supabaseを導入しない
- 第1実装で認証を追加しない
- Google Calendar APIを追加しない
- 本番デプロイを追加しない
- Controllerに固定データを直接大量記述しない
- Reactコンポーネントへ直接URL文字列を散在させない
- 端末別に同じ画面をコピーしない
- 娘の状態を「成功／失敗」だけで評価しない
- 母の空き時間を通所可能時間として自動判定しない
- ラストウォーの情報を支援者向け情報として扱わない
- 人物イラスト素材を追加しない
- 指示書にない大規模な抽象化を行わない

---

# 23. Codexへ送る実行依頼文

以下をCodexへ送ること。

```text
このリポジトリに「くらしリレー」の第1実装を行ってください。

最初に以下を必ず読んでください。

- AGENTS.md
- docs/product-plan.md
- docs/codex-design-spec.md
- docs/data-model.md
- docs/codex-implementation-01.md
- docs/wireframes/

今回の実装方式はLaravel REST API＋独立React SPAです。
Inertiaは使用しません。

今回のゴールは次のとおりです。

1. Laravel APIを起動できる
2. GET /api/health が動く
3. GET /api/dashboard?date=YYYY-MM-DD が動く
4. ReactがLaravel APIからデータを取得できる
5. 母向けホームダッシュボードをレスポンシブ表示できる
6. 今日の予定と実績を、タブレット・PCでは左に予定、右に実績として縦方向に比較できる
7. スマートフォンでは予定→実績→差分として縦積み表示できる
8. ローディング、エラー、再試行を表示できる
9. LaravelとReactのテスト、lint、typecheck、buildが成功する

重要事項：

- Laravel REST API
- React＋TypeScript＋Vite
- React Router
- TanStack Query
- Tailwind CSS
- lucide-react
- モノレポ
- APIデータのダミーはLaravel側に置く
- React側へ同じダミーデータを重複させない
- 認証、Sanctum、Google Calendar、DB保存、デプロイは今回実装しない
- 母向け画面は赤・黄・青・白を同じ程度に使う
- 娘の今日の作戦カードは水色＋紫
- 人物イラストは使わず、アイコンを積極的に使用する
- PC、タブレット、スマートフォンで同じコンポーネントを再配置する
- 既存コードがある場合は、構成と規約を確認してから変更する
- 既存機能を壊さない
- 仕様にない大きな機能を追加しない

作業手順：

1. リポジトリ構成と資料を確認する
2. 実装計画を短く提示する
3. backendとfrontendの基盤を構築する
4. Laravel APIを実装する
5. APIテストを実装する
6. ReactのAPI通信層とQuery Hookを実装する
7. ホームダッシュボードを実装する
8. 予定実績比較画面を実装する
9. Reactテストを実装する
10. Laravel test、Pint、React lint、typecheck、test、buildを実行する
11. 問題を修正する
12. 最後に変更ファイル、実行結果、残課題を報告する

不明点がある場合は、大きな機能を追加せず、最も小さく安全な実装を選んでください。
```

---

# 24. 実装完了時の報告形式

```text
## 実装内容
- ...

## API
- GET /api/health:
- GET /api/dashboard:

## 主な変更ファイル
- ...

## Laravel確認結果
- test:
- pint:

## React確認結果
- lint:
- typecheck:
- test:
- build:

## 画面確認
- 390px:
- 768px:
- 1024px:
- 1440px:
- 200%拡大:

## 未実装・次の課題
- ...

## 注意点
- ...
```

---

# 25. 第2実装への引き継ぎ

第1実装のレビュー後、次の順に進める。

1. UIレビューと修正
2. Laravelマイグレーション
3. モデル・Query Service
4. 活動記録のDB保存
5. クイック記録のDB保存
6. 予定と実績のDB保存
7. Laravel Sanctum認証
8. Googleカレンダー一方向取込
9. 支援者別レポート
10. 本番デプロイ
