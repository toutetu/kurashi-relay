# AGENTS.md

## エージェントの役割分担

このプロジェクトは複数のAIエージェントで分業する。

| 役割 | 担当 |
|---|---|
| 要件定義 | ChatGPT |
| デザイン・設計・実装指示書・差分レビュー | Claude (Fable) |
| 実装 | Cursor **Composer 2.5** 又は **Cursor Grok 4.5**(第一候補) |
| 実装の控え・セカンドオピニオン・コードレビュー | Codex |

運用ルール:

- 実装依頼は `docs/wip/<機能>/` に実装指示書(仕様書)を置いて渡す
- 複数のエージェントに同じ作業ツリーを同時に触らせない
- git commit / push: Cursor/Codex は明示的な指示があるときのみ。Fable は区切りごとに自律実行してよい(「ブランチ運用」参照)
- ビルド・テストを通してから完了報告する(勝手なワークアラウンドで「通した」ことにしない。例: ビルドスクリプトの差し替えは禁止)

## ブランチ運用

- **1ブランチ = 1デプロイ単位**。main は自動デプロイ(バックエンド→Laravel Cloud、フロント→Render)。
  1マージ = 本番反映なので、1回で出す「意味のかたまり」を1つに絞る。
- **バックエンドとフロントは必ず別ブランチ・別PR**にする(マイグレーションと画面を同じPRに混ぜない)。
- **必ず最新 main から切る**。他の feature ブランチに相乗りしない(過去にK0がfrontendブランチに乗った失敗例あり)。
- **命名**: `<type>/<domain>-<topic>`。type = `feat` / `fix` / `chore` / `docs` / `refactor`。
  例: `feat/koekake-api`・`feat/koekake-web`・`chore/k0-migration`・`docs/koekake-plan`。
- **コード変更と docs のみの変更は混ぜない**(docs だけなら `docs/*` ブランチ)。ブランチは短命に保ち、大きくなったら分割。
- commit/push は区切りごとに自律実行してよい。PR作成と main マージはユーザー確認後。

## ドキュメント運用(2層 + 進行中)

docs の無限増殖を防ぐため、ライフサイクルで置き場所を分ける。

- **恒久層 `docs/` 直下 =「今の正」**: design-principles / design-decisions / architecture / data-model /
  api-contract / product-plan / 各 plan / ui 系ガイド。上書き更新し、版番号(-2,-3…)で増やさない。重要な変更は DR に残す。
- **運用リファレンス `docs/ops/`**: デプロイ手順など繰り返し使う運用文書。
- **進行中 `docs/wip/`**: 未完のフェーズ runbook・スモーク依頼・実装指示書・バックログなど。完了したら archive へ。
- **完了保管 `docs/archive/`**: 実装・検証が済んだ作業用 docs(レビュー依頼/報告・使い捨て spec・完了フェーズ・委譲指示書)。
  `reviews/` `specs/` `phases/` `requirements/` `design/` などで軽く分類。経緯を辿れるように残すだけで日常は見ない。
- **例外(資産・ログ)**: `docs/mockups/`(恒久層から「正解の見た目」として参照される)・`docs/icons/`・
  `docs/logs/`(日報)は恒久扱いの資産・ログ置き場。archive へ移さない。
- **結論は DR に蒸留**。archive は「経緯」、DR(`docs/design-decisions.md`)は「決定」。
  archive を消しても DR を辿れば判断が復元できる状態を保つ。

### 新機能の 提案 → 実装 → 完了 の流れ

1. **提案・計画**: `docs/<機能>-plan-NN.md`(恒久層)に計画を書く。設計判断は DR で記録。
2. **実装指示書 / レビュー依頼 / スモーク依頼**: `docs/wip/<機能>/` に置いて Cursor/Codex へ渡す(1タスク1フォルダ)。
3. **完了(マージ済み)**: `docs/wip/<機能>/` を `docs/archive/<分類>/` へ移動。plan の該当項目に「完了」を追記し、結論は DR へ。

## プロジェクト

このリポジトリは、母と娘の生活・支援・予定と実績を可視化する
Webアプリ「くらしリレー」のPoCです。

このアプリは、母や娘を監視・評価するためのものではありません。
母に集中している支援、待機・拘束、回復時間を見えるようにし、
家族・学校・支援機関との役割分担につなげることが目的です。

## 作業前に必ず読む資料

1. `docs/product-plan.md`
2. `docs/architecture.md`
3. `docs/design-principles.md`
4. `docs/data-model.md`
5. `docs/api-contract.md`
6. 対象タスクの実装指示書(`docs/wip/<機能>/` 配下)

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
- ホームでは頻度の高い操作を最優先する(入力ファースト)
- PCホームは `home-grid`(grid-template-areas)で管理する: 左2列=「きろくする」、右1列=「きょうのようす」、現在の活動は上部のNowBar
- カード自身へ固定幅、個別col-span、max-widthを設定しない
- UIの並び順を変更した場合は設計文書も更新する

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

2026-07のB案v3リニューアル以降、ビジュアルは
`docs/design-principles.md` の「B案v3 ビジュアルシステム」に従う。
実装レベルの詳細は `docs/ui-redesign-spec.md`、見た目の正解は
`docs/mockups/home-b3.html` を参照。

### 共通(母向け画面の基調)

- カードは白、枠線はヘアライン。色はアイコンチップ・バッジ等の小部品だけに使う
- メインカラーは「きぶんカラー」(5テーマ、`--primary` 系トークン)でユーザーが切替える
- 太字は数字と見出しだけ。かわいさは丸み・押し心地・小さな演出で出す(色数では出さない)

### 娘向け画面

B案v3を土台に、娘のアイデンティティカラー(藤 `--fuji`)をアクセントに使う。
月、星、リボンなどの軽いゴスロリ要素は小さな装飾アイコンとして使用できる。
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

## セッション運用とトークン節約(Fable向け)

Fable(Claude)は高価なため、次のルールでトークンを節約する。

### セッション切り替え
- セッションが長くなったら(大きな区切りが済んだとき、または文脈が肥大して要約が始まる前に)、
  **Fableからユーザーへセッション切り替えを提案する**。長い文脈の持ち回りは毎ターン課金される。
- 切り替え前に必ず「引き継ぎ」を残す: 進行状況はメモリと docs/(スペック・設計方針)へ、
  実装はコミットへ。次セッションはそれらを読めば再開できる状態にする。

### トークン節約の分業
- コードを書く作業は原則すべて Cursor(composer-2.5)へ委譲する。小さな修正・アニメ調整も含む。
  Fableが直接書いてよいのは1〜数行のトリビアルな修正か、委譲がブロックされた時のみ。
- 難所・強い推論が必要な箇所は Codex 上位モデルへエスカレーションしてよい。
- 指示は docs/*.md に精密なスペックとして書き、CLIへは「そのファイルを読んで実装せよ」と
  1行プロンプトで渡す(複数行プロンプトは.cmdラッパーが切る)。
- Fableの役割: スペック書き・差分レビュー(`git diff --stat`+要所のみ読む)・実機検証・デザイン判断。
- 大きなファイルの全文読み込みや、チャットへの長いコード貼り付けをしない。
  探索・全文読みは委譲先(Cursor/Codex)にやらせる。
- コミットは確認不要で区切りごとに自律実行(conventional commits)。push/PRはユーザー確認後。

### 各エージェントが自動で読む資料
- Cursor / Codex: この AGENTS.md を毎回読む。
- Fable(Claude Code): CLAUDE.md と自身の永続メモリを毎回読む(AGENTS.mdは自動では読まれない)。
  Fable向けの恒常ルールは CLAUDE.md にも記載する。
