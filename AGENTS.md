# AGENTS.md

## プロジェクト

このリポジトリは、母と娘の生活・支援・予定と実績を可視化する
Webアプリ「くらしリレー」のPoCです。

このアプリは、母や娘を監視・評価するためのものではありません。
母に集中している支援、待機・拘束、回復時間を見えるようにし、
家族・学校・支援機関との役割分担につなげることが目的です。

## 作業前に必ず読む資料

1. `docs/product-plan.md`
2. `docs/architecture.md`
3. `docs/codex-design-spec.md`
4. `docs/design-principles.md`
5. `docs/data-model.md`
6. `docs/api-contract-01.md`
7. 対象タスクの実装指示書
8. `docs/wireframes/README.md`

第1実装では `docs/codex-implementation-01.md` を優先してください。

## 採用技術

### バックエンド

- Laravel REST API
- PHP
- Laravel API Resource
- Form Request
- PHPUnitまたは既存規約に沿ったPest
- Laravel Pint

### フロントエンド

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Tailwind CSS
- lucide-react
- Vitest
- React Testing Library

## 構成

- `backend/`：Laravel REST API
- `frontend/`：独立したReact SPA
- `docs/`：仕様書とワイヤーフレーム
- 1リポジトリのモノレポ
- Inertiaは使用しない
- 第1実装では認証、DB永続化、Google Calendar、本番デプロイを行わない

## 実装ルール

- Laravel Controllerへ業務ロジックや大量の固定配列を直接書かない
- APIの表示形式はAPI Resourceで管理する
- 入力検証はForm Request等へ分離する
- Reactコンポーネント内へAPI通信を散在させない
- API Client、Query Hook、表示コンポーネントを分離する
- TypeScriptはstrict
- `any`を使用しない
- Reactは関数コンポーネント
- UI文言は日本語
- 日時はAPIではISO 8601、画面ではAsia/Tokyoとして表示する
- モバイルファースト
- PC・タブレット・スマートフォンで同じコンポーネントを再配置する
- 端末別に同じ画面を複製しない
- 人物イラストは原則使用しない
- アイコンと文字を併用する
- 色だけで状態を表現しない
- 共通Buttonと共通UIコンポーネントを優先する
- 操作可能な要素には一貫した押下フィードバックを付ける
- デザイントークンを使用し、新しい直接カラーコードを原則追加しない
- ホームでは頻度の高い操作を最優先する

## プロダクト上の重要ルール

- 娘本人の発言、母の観察、母の推測を混同しない
- 娘を「達成／失敗」の二択で評価しない
- 「未達成率」「頑張り不足」等の表現を使用しない
- 母の空き時間を自動的に通所可能時間と解釈しない
- 待機・拘束と回復を正式な生活時間として扱う
- 予定と実績の差は、原因となった支援・待機・回復と関連付ける
- ラストウォーの詳細を外部向けレポートに含めない
- 子どものセンシティブ情報を不用意に外部共有しない

## デザイン

### 母向け画面

赤・黄・青・白を同程度の比重で使用し、明るくかわいく、
情報量が多くても読みやすい画面にする。

### 娘向け画面

水色を基調に紫をアクセントとし、
リボン、レース、月、星などの軽いゴスロリ要素を使用できる。
人物イラストは使わない。

## 第1実装の範囲外

- Laravel Sanctum
- ログイン・ユーザー登録
- Google OAuth
- Google Calendar API
- DBへの本保存
- 支援者アカウント
- PDF出力
- 共有URL
- 通知・メール
- 本番デプロイ
- 外部ゲーム連携

## 品質確認

### Laravel

```bash
cd backend
php artisan test
./vendor/bin/pint --test
```

### React

```bash
cd frontend
npm run lint
npm run typecheck
npm run test
npm run build
```

失敗した状態で完了報告しないでください。

## 作業範囲の統制

- 指示書にない大規模機能を追加しない
- 仕様が曖昧な場合は最小で安全な実装を選ぶ
- 既存コードと規約を確認してから変更する
- 既存機能を壊さない
- 変更ファイル、確認結果、未実装事項を最後に報告する
