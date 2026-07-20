# Inertia移行 実装計画

> **DR-034で中止(2026-07-20)**  
> 本計画は進行中の正本ではない。Inertia中心ハイブリッド構成への移行方針はDR-034で置き換えられ、
> 以降の作業正本は `docs/wip/api-first-spa-migration/implementation-plan.md` とする。
> 本文は当時の判断と実装経緯を残す履歴として保管する。

更新日: 2026-07-19
状態: **中止・archive済み**(旧: 計画確定、DB target schema完成後に着手)
根拠: DR-030 / DR-031(将来方針はDR-034が置き換え)

> **運用更新(DR-033)**: 本文中の旧テスト・全品質ゲート・PRごとの反復レビュー条件より `AGENTS.md` を優先する。
> 各移行sliceは画面操作1回または `curl` 1本で完了し、I6など復旧コストが高い変更だけレビューを1周行う。

## 1. 目的

Laravel APIと独立React SPAの二重実装・二重テスト・二重デプロイを段階的に終了し、
家庭で必要な機能を短い周期で追加して実運用から回収できる構成へ移す。

目標のハイブリッド構成:

```text
ブラウザ
  ↓ same origin / session
Laravel routes + middleware
  ├─ Inertia response / form redirect → React pages
  └─ 必要性が明確なJSON API → offline再送 / Service Worker / 通知 / 外部client
  ↓
既存Service / Model / 統合後DB

Laravel ──外部API client──> Google Calendar API
```

## 2. 移行原則

- 家族共有トークンの本番保護を先に完了する。移行を理由に個人データの無認証公開を延長しない。
- Phase C、Phase D1、Phase Eで統合後DBの箱を先に作り、DB統合とInertiaコードを同時進行しない。
- DB migration/seed確認後は、二重書込、新旧比較、本番安定観測を待たずInertia I0へ進む。
- 数週間の一括作り直しにせず、各段階をLaravel Cloudへデプロイ可能な縦切りにする。
- 現行ReactのUI、デザイントークン、業務コンポーネントと、LaravelのService/Modelを再利用する。
- 移行済み経路から重複コード・重複テストを外す。既存テストを先に一括削除しない。
- TanStack Query、Zod、API Resourceは用途がなくなった対象だけを段階的に整理する。
- Render SPAとREST APIは移行中のロールバック先として残し、停止と削除を別リリースにする。
- 実装はComposer 2.5、独立レビューは別セッションのGrok 4.5 Highが行う。

## 3. 対象外

- UIの全面再デザイン
- DB schema変更、backfill、DB refreshの実行
- 支援者アカウント、Google OAuth、通知、PDFの同時実装
- 既存テーブルの整理
- 高速連打・オフライン処理をInertia標準フォームだけへ無理に置き換えること

Google Calendar APIはLaravelが外部サービスを利用する処理であり、Inertia移行によって廃止しない。
接続・同期機能は別Phase・別PRで継続できる。

## 4. Inertia移行開始ゲート

次を満たすまでI0を開始しない。

- `activity_definitions`、共通出来事、人物参加、結果、取消、予定接続、回答履歴のtarget schemaがある。
- 必須制約、FK、index、Seederが定義され、空または検証用DBでmigration/seedが通る。
- 既存少量データをexportして残すか、明示確認後にrefreshするか決まっている。
- refreshを選ぶ場合はバックアップと実行手順がある。実行は別タスクで明示承認を得る。
- DB schema作業とInertia作業が別Phase・別PRに分かれている。

不要な開始条件:

- 数日間のDB安定観測
- 旧新テーブルの二重書込
- 全件backfillと新旧集計比較
- 旧テーブルの物理削除

## 5. API分類方針

I0で18 endpointを1件ずつ棚卸しし、次の3分類を確定する。

| 分類 | 判断基準 | 移行方針 |
|---|---|---|
| Inertiaへ移す | 通常Web画面の初期表示、画面遷移、通常フォームだけが利用 | Laravel route + Inertia props/formへ移し、旧APIは停止候補 |
| 内部APIとして残す | offline退避・再送、冪等性、高速連打、Service Worker、通知に必要 | 同一オリジンJSON endpointとして維持 |
| 将来client向けに残す | native appや外部clientへJSONを提供する明確な用途がある | version/認証/契約を明示して維持 |

現在のWeb画面しか利用しておらず、Inertia置換後にアクセス・参照がないendpointだけを廃止候補にする。

## 6. 移行ステージ

### I0: 設計確定

開始条件: Inertia移行開始ゲートを通過している。

- Laravel、React、TypeScript、Viteとの互換性を確認し、採用するInertiaのメジャーバージョンを明記する。
- 18 endpointを前節の3分類へ割り当てる。
- ページごとにURL、読取元、更新先、React component、Query Hook、Zod、テスト、利用頻度を一覧化する。
- 移行中のURL、認証、session、CSRF、deploy、rollback方針を決める。
- 現行の別PR規則、移行中の例外、I6後の単一deploy規則を確定する。

完了条件:

- 採用versionと互換性根拠が記録される。
- 全endpointと全画面に移行先または残す理由がある。
- I2で試す読取画面が1つ決まる。
- URL、認証、branch/PR、自動deploy、rollbackの矛盾がない。

ロールバック条件: docsのみのPhaseなのでコードrollbackはない。未決事項が残ればI1を開始せず計画を改訂する。

### I1: Inertia基盤

開始条件: I0完了。DB変更を同じPRへ含めない。

- Laravelアプリ内にInertia middleware、root template、Vite entry、React/TypeScript実行基盤を作る。
- Reactコードの配置先を `backend/resources/js` 等へ統合する。
- 共通レイアウト、エラー表示、ページタイトル、CSRF、セッション、asset buildを成立させる。
- 既存APIとRender SPAにはまだ手を入れず、最小ページを別URLで公開してデプロイを確認する。

完了条件:

- Laravel CloudでInertiaページが表示され、Vite assetが配信される。
- ローカルと本番で同じbuild手順が通る。
- 既存SPA/APIへ切り戻せる。

ロールバック条件: 新しいInertia入口だけを無効化し、Render SPAと既存APIを正のまま維持できる。

### I2: 読み取り画面の試験移行

開始条件: I1の最小ページとasset buildがLaravel Cloudで動く。

- I0で選んだ低リスクな読取中心画面を1つ移す。
- UIを再設計せず、既存React component、CSS、design tokenを再利用する。
- API GETからInertia propsへ切り替える。
- 表示、URL、戻る・進む、reload、mobile、200%表示を確認する。
- 旧画面のURLまたは切替手段を残す。

完了条件:

- 旧画面と同じ実データを表示し、主要表示が欠けない。
- browser navigationとreloadで状態が破綻しない。
- Laravel feature testと必要最小限のReact testが通る。

ロールバック条件: Inertia routeを旧Render画面または既存API利用画面へ戻してもDB変更を必要としない。

### I3: 共通シェルと画面遷移

開始条件: I2が受入確認済みで、旧画面へ戻せる。

- AppShell、共通layout、navigationをInertiaへ移す。
- React RouterからLaravel server route + Inertia Linkへページ単位で移す。
- 同一リリースですべてのrouteを切り替えない。
- 移行中のactive navigation、404、validation error、scroll/focusを定義する。

完了条件:

- 移行済みページ間をInertia navigationできる。
- 未移行ページへ旧URLで移動できる。
- 直接URL、reload、戻る・進むが動く。

ロールバック条件: page単位で旧Router/Render routeへ戻せる。共通shell全体の一括rollbackを要求しない。

### I4: 更新画面とフォーム

開始条件: I3の共通shellとpage単位rollbackが成立している。

- 通常フォームをInertia formと既存Form Requestへ移す。
- Laravel validation errorを画面へ直接返す。
- 読み込み中、連打防止、成功・失敗、未保存表示を維持する。
- offline退避、再送、楽観的更新、冪等性が必要な記録操作は内部APIとして残す。
- 特にタスク記録、取消、声かけの既存動作を退行させない。

完了条件:

- 通常formの保存、validation、二重送信防止がLaravel feature testで確認できる。
- APIとして残す操作に理由、認証、idempotency contractがある。
- Serviceへ分離済みの業務ロジックをControllerへ戻していない。

ロールバック条件: 移行sliceごとに旧画面/APIへ戻せる。新旧書込を同時に行う場合は二重記録を防ぐ。

### I5: 認証移行

開始条件: I4で主要な通常Web更新がLaravel routeへ移っている。

- 公開API保護として導入した家族共有トークンは、移行中も最小構成で維持する。
- 通常Web画面はLaravel session認証へ移す。
- 残存APIは利用clientに応じてsession+CSRFまたは専用tokenを選ぶ。
- 家族共有トークンを削除する場合は、利用中APIがないことを確認し別リリースで行う。
- token値をInertia props、HTML、JS bundle、logへ出さない。

完了条件:

- 未認証の通常Webアクセスが保護され、session失効・CSRF・誤入力がテストされる。
- 残存APIごとに認証方式が決まっている。
- 現行Render SPAのrollback期間は `X-Family-Token` を利用できる。

ロールバック条件: session認証を戻しても、家族共有トークンで旧SPA/APIを保護した状態へ戻せる。

### I6: 単一デプロイへの切替

開始条件: 主要画面、通常form、session認証がLaravel Cloudで利用できる。

- Laravel CloudでPHPとReact/Vite成果物を一緒にbuild・配信する。
- 本番URLを同一オリジンへ統合する。
- `main` 更新時の自動deploy対象、watch path、build command、asset pathを移行する。
- Render SPAは停止せずrollback先として保持する。
- 本番smoke、実端末確認、一定期間の切替後観測を行う。
- Render停止と削除を分け、停止・削除はそれぞれ明示判断とする。

完了条件:

- 通常Web画面がLaravel Cloudの単一deployで動く。
- CORSや `VITE_API_BASE_URL` に依存しない主要導線が成立する。
- 自動deployの対象と失敗時rollback手順が文書化される。
- Renderへ戻す操作を確認できる。

ロールバック条件: Renderの旧URLと既存APIを再び正にできる。DB schemaを同時rollbackしない。

### I7: 旧境界コードの整理

開始条件: 対象画面の移行、本番確認、rollback期間が終わり、旧endpointアクセスとコード参照が0件。

整理候補:

- 不要になったReact Router設定
- API client / Query Hook / API response専用Zod schema
- API Resource / CORS / `VITE_API_BASE_URL`
- 旧Render向け設定 / 不要なREST endpoint

TanStack Query、Zod、API Resourceを一括削除しない。残存APIまたはclient-side validationで用途があるものは残す。
旧APIの停止と削除、Renderの停止と削除を同じリリースで行わない。

完了条件:

- 削除対象のaccess、code reference、test dependencyが0件。
- 自動test、本番確認、backup/rollback手順がある。
- 残すAPIに利用client、認証、契約が明記される。

ロールバック条件: 停止段階では再有効化できる。物理削除は停止期間終了後の別リリースだけで行う。

## 7. 最小検証

- 各移行sliceの完了条件は、対象画面を1度操作するか、代表的な `curl` 1本が成功することだけとする。
- 新しい自動テストは書かず、既存テスト、Pint、typecheck、buildの全件実行も標準では行わない。
- 既存テストが壊れていても対象sliceが動けば修正は任意・後回しでよい。
- I6の配信切替など復旧コストが高い変更だけ、rollbackと設定漏れを独立レビュー1周で確認する。

## 8. ブランチ・PR・自動デプロイルール

- **Gate 2通過前**: 現行規則を維持する。backendとfrontendは別branch/PR、Laravel CloudとRenderへ別deploy。
- **I0**: docs branch/PRだけ。package・code・deploy設定を変更しない。
- **I1〜I5**: `feat/inertia-<slice>` の1branch/1PRを1つのLaravel deploy単位として扱える。
  `backend/resources/js` 等のserver/client変更は同居できるが、DB schema変更、UI redesign、旧Render削除を混ぜない。
- **I6**: deploy設定専用PRに分ける。機能追加と同じPRにしない。main更新時のLaravel Cloud/Renderの
  自動deploy、watch path、build pathを明示し、切替承認後にmergeする。
- **I6安定後**: 通常のInertia pageは単一deployの1branch/1PR。残存APIも同じLaravel deploy単位だが、
  大きなmigrationは引き続き別PRにする。旧Renderの修正・停止は専用PRに分ける。

各PRはそのセッションの担当AIが実装し、動作確認1回で完了する。
独立レビューはI6、認証、DBスキーマなど高リスクなsliceだけ1周行い、再レビューは標準にしない。

## 9. 移行全体の完了条件

- 家庭で使う主要画面がLaravel Cloudの同一オリジン・単一デプロイで動く。
- 主要更新がsession/CSRFで保護され、秘密値がブラウザへ配布されない。
- 通常機能追加でAPI契約・fetch mock・2PRを毎回必要としない。
- 移行済み画面の重複API client/Query Hook/テストが残っていない。
- 残すAPIと廃止候補が分類され、残すAPIには利用client・認証・契約がある。
- 旧Render SPAと不要な旧REST APIを停止でき、復旧手順がある。

## 10. 未決事項（I0で確定）

- 採用するInertiaのメジャーバージョンとLaravel/React/Vite互換性
- 18 endpointの個別分類
- I2で最初に移す読取画面
- session認証の具体方式と家族共有トークンからの切替条件
- Laravel CloudのNode build、asset配信、watch path
- Render停止までの観測期間
