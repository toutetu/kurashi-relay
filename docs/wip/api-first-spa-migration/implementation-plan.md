# API-first React SPA 移行 実装計画

更新日: 2026-07-20  
状態: Cursor 手動委譲用・実装待ち  
対象リポジトリ: `toutetu/kurashi-relay`  
調査基準: `origin/main` `3bd2673ac8bb182de278f984efc0190e49a30599`  
基準tree: `be5c819ce70f248c7d2c1a5daab196251d1e4ebf`  
アプリコード基準: `c134132ad580e0ef99f899b1befd703e73658db4`（以後のmain差分はdocs整理のみ）  
置き換える方針: DR-030 の Inertia 中心ハイブリッド構成  
新しい方針: React Router + TanStack Query + Laravel JSON API の同一オリジン構成

> この文書は、Cursorへ実装を手動委譲するための正本である。
> Cursorは、ユーザーが明示したPhaseだけを実装し、複数Phaseを一括実装しないこと。
> 特に、本番切替前にInertiaや旧SPAを削除してはならない。
> Inertia削除と `frontend/` 削除は、別Phase・別branch・別PRとして扱うこと。

---

## 0. Cursorへの委譲方法

### 0.1 最初に必ず守ること

Cursorは各Phaseの開始時に、次をこの順で行う。

1. リポジトリ直下の `AGENTS.md` を読む。
2. 本ファイルを最初から最後まで読む。
3. `git status -sb` で現在ブランチと未コミット変更を確認する。
4. `git fetch origin main` 後、その時点の `origin/main` から専用branchを作成し、`BASE_COMMIT`を記録する。
5. 対象Phaseの開始条件と対象外を確認する。
6. ユーザーが依頼したPhaseだけを実装する。
7. 完了条件を満たした時点で終了し、次Phaseへ自動で進まない。

### 0.2 Cursorが自動判断してはならない事項

次はユーザー確認なしに決めたり実行したりしない。

- 本番の認証方式
- 本番環境変数の変更
- Laravel Cloud / Render の停止または削除
- `frontend/` の物理削除
- Inertia packageと旧runtimeの物理削除
- DB migration、DB refresh、seed、本番データ操作
- API endpoint、request、response schemaの変更
- UI再設計、文言変更、機能追加
- mainへの直接push、PRのmerge
- Sanctum・session・CSRF・family-token middlewareの導入または再有効化
- Inertia削除と `frontend/` 削除を同一PRへ含めること

### 0.3 禁止コマンド・禁止操作

この移行では次を実行しない。

- `php artisan migrate:fresh`
- `php artisan migrate:refresh`
- `php artisan db:wipe`
- 本番DBへの `seed`
- `git reset --hard`
- 未コミット変更の破棄
- APIとDBを同時に作り直す変更
- 全テスト修復を目的にしたスコープ拡張

### 0.4 Cursorの停止条件

次の場合は推測で作業を広げず、変更を最小限で止めてユーザーへ報告する。

- 実装開始時の最新 `origin/main` が本書の調査基準から進み、対象ファイルまたはrouteが変わっている。
- `php artisan route:list --path=api --json` のAPI routeが19本でない。
- DB、API Controller、Request、Resource、Service、Modelを変更しないと進められない。
- Laravel CloudでNode/Vite buildが実行されるか確認できない。
- canonical URLまたは切替前後のoriginが不明である。
- Renderをロールバック先として残すか、廃止するか未決定である。
- 認証の再導入が必要になった。
- SPAからAPIを呼ぶとHTML、419、または現状にない401が返る。
- 未コミットのユーザー変更と対象ファイルが重なる。

### 0.5 1回の委譲で返す報告

Cursorは各Phaseの終了時に次だけを簡潔に報告する。

- 変更ファイル
- 実装した内容
- 実行した確認と結果
- 未実施事項
- ロールバック方法
- 次に着手可能なPhase

---

## 1. 決定概要

### 1.1 結論

Inertiaを廃止し、通常画面のデータ取得・更新をすべて既存JSON APIへ統一する。

ただし、独立React SPAとLaravel APIの2デプロイへ恒久的に戻すのではなく、
React SPAをLaravel Cloudから配信する。これにより次を同時に成立させる。

- React Routerによるクライアント側画面遷移
- TanStack Queryによるデータ取得・cache管理
- ZodによるAPI response検証
- 既存の楽観的更新、localStorage退避、online復帰時再送
- Laravel `/api/*` によるデータ取得・更新
- 同一オリジン
- 単一リポジトリ
- 単一デプロイ
- React production sourceの一本化

### 1.2 目標構成

```text
ブラウザ
  |
  | GET /, /records, /musume ...
  v
Laravel web catch-all
  |
  +--> spa.blade.php
         |
         +--> Vite React bundle
                |
                +--> React Router
                +--> TanStack Query
                +--> fetch /api/* (same origin)
                            |
                            v
                 Laravel API Controller
                            |
                 Service / Model / DB

Laravel --> Google Calendar等の外部API
```

### 1.3 最終ディレクトリ構成

```text
backend/
  app/
    Http/Controllers/Api/       # 維持
    Http/Requests/               # 維持
    Http/Resources/              # 維持
    Services/                    # 維持
  resources/
    js/
      main.tsx                   # SPA entry
      App.tsx                    # React Router routes
      api/                       # 維持
      components/                # 単一正本
      features/                  # 単一正本
      pages/                     # 単一正本
    views/
      spa.blade.php              # SPA root view
  routes/
    api.php                      # 維持
    web.php                      # SPA catch-all

frontend/                        # Render廃止承認後、A7で削除
backend/resources/js/inertia/    # SPA安定確認後、A6で削除
```

### 1.4 Reactの最終正本

最終正本は `backend/resources/js` とする。

理由:

- Laravel CloudのVite build対象に既に含まれている。
- 同一オリジン・単一デプロイを最小変更で実現できる。
- Laravelのasset manifestとBlade連携をそのまま利用できる。
- `frontend/` から `backend/public/` へ成果物をコピーする追加工程が不要になる。

ただし、現在は `frontend/src` の方が新しい実装を含む箇所がある。
Phase A1で差分を選別して `backend/resources/js` へ取り込み、以後 `frontend/` を凍結する。

---

## 2. 現状の事実

### 2.1 Git基準

- 調査日: 2026-07-20
- 調査時の最新 `origin/main`: `3bd2673ac8bb182de278f984efc0190e49a30599`
- 調査基準tree: `be5c819ce70f248c7d2c1a5daab196251d1e4ebf`
- アプリコードの最新変更基準: `c134132ad580e0ef99f899b1befd703e73658db4`
- `c134132` から `3bd2673` まではdocs整理だけで、backend/frontendの実装差分はない。
- family-token gateを外したcommit: `7a8391b72ee5579b892a721ccc7353e5f8effd41`

Cursorが実装を開始する時点では、必ずその時点の最新mainから新しいbranchを切る。
本書のcommit番号へcheckoutして実装してはならない。
`origin/main` が上記基準より進んでいる場合、変更された対象ファイルを再監査してから着手する。

### 2.2 Inertiaの利用実態

- Web/Inertia GET route: 19本
- API route: 19本（healthを含む）
- `InertiaPageController` の17画面は空propsでpage名だけを返す。
- Home、Musume、Koekake、Oshigoto、MamaKaji等の実データはTanStack QueryからAPI取得する。
- 通常更新もAPI mutationのままである。
- 利用可能なInertia formは実質0件である。
- SSRは無効である。

つまり現在のInertiaは、主に次だけを担当している。

- Laravel routeとReact page componentの対応
- Inertia Linkによる画面遷移
- Laravel CloudからのVite asset配信

このうちasset配信と同一オリジンAPIは、InertiaなしのReact SPAでも実現できる。

### 2.3 二重ソース

- `frontend/src`: 151ファイル
- `backend/resources/js`: 132ファイル
- backend側132パスはすべてfrontend側にも存在する。
- 改行差を除くと126ファイルが同一内容である。
- 6ファイルには実内容の差がある。
- `frontend/src` にだけ19ファイルがある。

本番Inertia bundleは `backend/resources/js` を利用する一方、TypeScript設定とReactテストは主に
`frontend/` にある。このため、旧SPA側のテストが通っても本番bundleの同一性を保証しない。

### 2.4 文書と実装の不一致

旧Inertia移行計画(`docs/archive/phases/inertia-migration/implementation-plan.md`)は
Gate 2未通過・Inertia未着手を前提としていたが、実装はすでに次まで進んでいる。

- Inertia基盤
- 全画面wrapper
- canonical URL切替
- Laravel Cloud向けasset bundle
- Inertia Link

新計画では、旧計画を履歴としてarchiveし、本書を進行中作業の正本にする。

### 2.5 認証の現状

最新mainでは、`7a8391b fix(auth): remove family token gate` によりfamily-token middlewareが
意図的にweb/API routeから外されている。一方、middleware、provider、storage code、一部testとdocsは残り、
runtimeと履歴が一致していない。

SPA移行ではこの現状動作を変えない。stale testを通すためにmiddlewareを戻したり、Sanctum/session/CSRFを
追加したりしない。アクセス保護の再設計は、別DR・別計画・別PR・別本番ゲートで行う。

---

## 3. スコープ

### 3.1 この移行で行うこと

- React Router SPAをLaravel Cloudから配信する。
- React production sourceを `backend/resources/js` へ一本化する。
- UI routeをReact Routerへ統一する。
- 既存データ取得・更新をすべて `/api/*` に統一する。
- API base URLを同一オリジン前提へ整理する。
- 移行中だけInertiaとSPAを設定で切り替え可能にする。
- 本番確認後にInertia関連コードを削除する。
- Renderロールバック不要の明示判断後に旧 `frontend/` を別PRで削除する。
- 古いInertia専用テストとdead codeを削除する。
- 恒久文書を最終構成へ同期する。

### 3.2 この移行で行わないこと

- DB schema変更
- migration追加・変更
- seed変更
- 本番データ移行
- API endpointの追加・削除・名称変更
- API request/response schema変更
- Service / Modelの業務ロジック変更
- UI再設計
- 文言変更
- 新機能追加
- Google Calendar連携の実装・削除
- Service Workerの新規実装
- 全テストの修復
- bundle code splitting
- Laravel Cloud / Renderの即時削除
- 認証方式の変更またはアクセス保護の再導入

### 3.3 移行中に守る不変条件

次は全Phaseで維持する。

- `/api/*` のmethod、path、payload、status codeを変えない。
- `idempotency_key`の生成・保存・再送方法を変えない。
- localStorage keyを変えない。
- offline queueを削除・初期化しない。
- task record作成と取消の順序制御を変えない。
- TanStack Queryのquery keyを理由なく変更しない。
- 日付はAsia/Tokyoを維持する。
- 既存19画面のURLを変えない。
- 現在のモバイル・PCレイアウトを変えない。
- Inertia削除前にSPAの本番確認を完了する。
- 現在の認証動作を変えない。
- Inertia削除後も、Render廃止の承認までは `frontend/` を凍結して残す。
- 切替前後でoriginが変わる場合、localStorageは自動移行されないものとして扱う。

---

## 4. 維持するURLとAPI

### 4.1 UI route一覧

次のURLはすべて維持する。

| URL | React component | 備考 |
|---|---|---|
| `/` | `HomePage` | ホーム |
| `/schedule-comparison` | `ScheduleComparisonPage` | 予定と実績 |
| `/schedule` | `PlaceholderPage` | 現在はplaceholder |
| `/records` | `RecordsPage scope=all` | 母向け記録 |
| `/records/musume` | `RecordsPage scope=child` | 娘向け記録 |
| `/mama-kaji` | `MamaKajiPage` | nested layout |
| `/mama-kaji/zukan` | `MamaKajiZukanPage` | nested layout |
| `/child-plan` | `ChildPlanPage` | 娘の状態・作戦 |
| `/mama-state` | `MamaStatePage` | 母の状態 |
| `/musume` | `MusumePage` | 娘ホーム |
| `/koekake` | `KoekakePage` | 声かけ |
| `/oshigoto` | `OshigotoPage` | 娘のおしごと |
| `/oshigoto/zukan` | `OshigotoZukanPage` | ゾンビ図鑑 |
| `/oshigoto/usj` | `OshigotoUsjPage` | USJチェック |
| `/summary` | `SummaryPage` | 今日のまとめ |
| `/last-war` | `LastWarPage` | ラストウォー |
| `/support` | `PlaceholderPage` | 現在はplaceholder |
| `/reports` | `PlaceholderPage` | 現在はplaceholder |
| `/settings` | `SettingsPage` | 設定 |

各URLで次を維持する。

- URL直接入力
- reload
- 戻る・進む
- query string
- active navigation表示
- モバイル下部navigation
- PC sidebar
- 404表示

### 4.2 API一覧

この移行では次をすべて残す。

| Method | Path | 主な利用 |
|---|---|---|
| GET | `/api/health` | health check |
| GET | `/api/dashboard` | Home |
| GET | `/api/tasks` | Oshigoto / MamaKaji / Records |
| GET | `/api/task-records` | Records timeline |
| POST | `/api/task-records` | task記録 |
| DELETE | `/api/task-records/{id}` | task取消 |
| GET | `/api/rewards/summary` | points / coin / gauge |
| GET | `/api/rewards/collections` | 図鑑 |
| GET | `/api/musume/plan` | 娘の見通し |
| PATCH | `/api/musume/plan/{id}` | 見通し更新 |
| PUT | `/api/musume/plan/{id}/items` | 見通し項目置換 |
| POST | `/api/musume/plan/{id}/reflection/complete` | 振り返り完了 |
| GET | `/api/koekake/musume-summary` | 母向け娘summary |
| GET | `/api/koekake/tasks` | 声かけ一覧 |
| GET | `/api/koekake/tasks/{id}` | 声かけ詳細 |
| POST | `/api/koekake/prompt-events` | 声かけ記録 |
| DELETE | `/api/koekake/prompt-events/{id}` | 声かけ取消 |
| PATCH | `/api/koekake/tasks/{id}/completion` | 完了状態 |
| POST | `/api/koekake/tasks/{id}/snooze` | 再通知 |

API endpointの整理や統合は、Inertia削除後の別判断とする。

---

## 5. Phaseとbranch/PRの原則

| Phase | 内容 | 種別 | 本番動作変更 | 削除 |
|---|---|---|---|---|
| A0 | 設計判断・文書同期・二重更新停止 | docs | なし | 旧計画をarchive |
| A1 | React source統合・SPA entry準備 | code | なし | なし |
| A2 | SPA配信基盤・runtime切替flag | code | defaultではなし | なし |
| A3 | 現行アクセス契約の記録・別課題化 | docs / gate | なし | なし |
| A4 | 本番SPA cutover | deploy | あり | なし |
| A5 | 本番安定確認 | operation | なし | なし |
| A6 | Inertia runtime・二重router削除 | code | なし | Inertiaのみ |
| A7 | Render廃止・旧frontend削除 | code / operation | あり得る | 旧frontend |
| A8 | 恒久文書同期・WIP archive | docs | なし | WIPをarchive |

原則:

- 1Phase = 1branch = 1PR = 1deploy単位とする。
- A3とA5はコード変更を伴わない。
- 各branchは、前Phaseがmainへmergeされた後の最新mainから切る。
- stacked branchにしない。
- code変更とdocsのみの変更を同じPRへ混ぜない。
- Cursorはcommit/pushを `AGENTS.md` に従って行うが、PR mergeは行わない。

推奨branch名:

- A0: `docs/api-first-spa-plan`
- A1: `feat/api-spa-source`
- A2: `feat/api-spa-runtime`
- A3: code branchなし。記録が必要ならA0/A8のdocsへ反映
- A4: `feat/api-spa-cutover`
- A6: `refactor/remove-inertia`
- A7: `refactor/remove-legacy-frontend`
- A8: `docs/api-spa-completion`

---

## 6. Phase A0: 設計判断と二重更新停止

### 6.1 目的

実装前に恒久文書の矛盾を解消し、旧Inertia方針へ戻らないようにする。

### 6.2 開始条件

- 本書がユーザーに確認されている。
- code変更を含めない。

### 6.3 変更対象

- `docs/design-decisions.md`
- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/api-contract.md`
- `docs/wip/inertia-migration/implementation-plan.md`
- `docs/archive/` 配下の適切な保存先

### 6.4 実装内容

1. DR-034として、API-first SPAへ方針変更したことを記録する。
2. DR-030は当時の判断として残し、DR-034が将来方針を置き換えると明記する。
3. 判断変更の理由を次で固定する。
   - テスト過重はDR-033とCursor中心実装で解消した。
   - 現Inertiaはprops/formをほぼ使わず、APIを全件維持している。
   - React source二重化の方が保守負担になった。
   - client主導のoffline再送・冪等処理を維持する。
4. architectureを本書1.2の構成へ更新する。
5. development planのGate 2未通過・Inertia未着手という記述を現在の履歴へ修正する。
6. API contractに「全endpoint維持、same-origin internal API」を記録する。
7. 旧Inertia移行計画をarchiveへ移し、「DR-034で中止」と先頭へ記録する。
8. 本書へのlinkを恒久文書から追加する。

### 6.5 完了条件

- 恒久文書に「今後Inertia props/formへ移す」という未修正記述がない。
- 本書とarchitecture/API contractが矛盾しない。
- code、package、lockfileに変更がない。

### 6.6 確認

- 変更箇所の見出しとlinkを目視確認する。
- `rg -n "Gate 2|Inertia I0|Inertia中心" docs` を実行し、残る記述が履歴・archiveだけであることを確認する。

### 6.7 ロールバック

docs PRをrevertする。runtimeへの影響はない。

### 6.8 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A0だけを実装してください。code/package/lockfileは変更せず、
DR-034、architecture、development-plan、api-contract、旧Inertia計画のarchiveを同期してください。
次Phaseへは進まないでください。
```

---

## 7. Phase A1: React source統合とSPA entry準備

### 7.1 目的

本番挙動を変えずに、Laravel側だけでReact Router SPAをtypecheck・buildできる状態を作る。

### 7.2 開始条件

- A0がmainへmerge済み。
- 最新mainからbranchを作成している。
- working treeがcleanである。
- 本番runtimeは引き続きInertiaである。

### 7.3 production sourceの統合方針

- 最終正本: `backend/resources/js`
- 参照元: `frontend/src`
- A1後の `frontend/`: ロールバック専用・編集禁止
- A1では `frontend/` を削除しない。
- A1ではInertia runtimeを削除・変更しない。

### 7.4 6つの実内容差分の解決

調査時点の差分を次のように扱う。

| 相対path | A1の採用方針 | 理由 |
|---|---|---|
| `api/schemas/oshigotoSchema.ts` | backend側の `task_title: z.string().optional()` とfallbackを維持し、必要ならfrontend側の`TaskRecordsData` exportだけ追加 | 移行時にAPI契約を狭めず、既存fallbackを失わないため |
| `components/ui/DashboardPrimitives.tsx` | A1ではbackend側を維持 | Inertia/Router両runtimeで使うため。A6でRouter専用へ簡略化する |
| `features/records/components/MemberRecordsSection.tsx` | frontend側の最新実装をbackendへ反映 | `RecordsMemberList`を使う最新UI |
| `features/records/components/RecordsTimelineList.tsx` | backend側の `task_title ?? task` fallbackを維持 | API欠損時にも表示を壊さないため |
| `features/records/components/RecordTaskRow.tsx` | frontend側をbackendへ反映 | `compact`対応を維持する |
| `inertia/components/InertiaSettingsContent.tsx` | backend側をA6まで維持 | frontend側は削除済みfamily-token説明を含む。最終的にはファイルごと削除する |

追加で、frontendにしかない
`frontend/src/features/records/components/RecordsMemberList.tsx` をbackend側へ追加する。

Cursorは調査時点から差分が増えている場合、機械的上書きを中止する。
新しい差分一覧とcommit履歴を報告し、ユーザー確認を待つ。

### 7.5 新規・移植ファイル

次をbackend側へ用意する。

- `backend/resources/js/App.tsx`
  - `frontend/src/App.tsx` のReact Router route定義を移植する。
- `backend/resources/js/main.tsx`
  - `frontend/src/main.tsx` を基にする。
  - QueryClient、BrowserRouter、MoodProviderを維持する。
  - FamilyTokenProviderは認証別課題の判断まで削除しない。
- `backend/resources/js/features/records/components/RecordsMemberList.tsx`
- `backend/tsconfig.json`
- `backend/tsconfig.app.json`
- `backend/tsconfig.node.json`
- `backend/vitest.config.ts`

Windowsのcase-insensitive filesystemでは `App.tsx` と `app.tsx` を同じdirectoryへ置けない。
そのため、SPA entry名は必ず `main.tsx` とし、root直下に `app.tsx` を作らない。

TypeScript/Vitest設定はfrontend版を丸ごとコピーせず、backendのpathへ合わせる。

- `tsconfig.app.json`: `baseUrl: "."`、`@/* -> resources/js/*`、`include: ["resources/js"]`
- appのtypes: `vite/client` と `vitest/globals`
- root `tsconfig.json`: app configとnode configだけを参照
- `tsconfig.node.json`: 実在する `vitest.config.ts` をincludeする
- `backend/vite.config.js` はrenameせず、Laravel Vite設定のまま維持する

### 7.6 test sourceの統合

`frontend/src` にだけある13 test fileと3 test helperは、`backend/resources/js` の同じ相対pathへ移植する。
ディレクトリ削除時にテスト資産を捨ててはならない。

- API client / family-token storage
- App route
- Button / DashboardCard / DashboardCards
- FamilyTokenProvider
- Koekake / Musume / Records
- Oshigoto persistence
- task-record query・再送判定
- `test/setup.ts`、`test/renderApp.tsx`、`test/fixtures/dashboard.ts`

`client.test.ts` のInertia session mode testは並行期間中は維持し、A6でruntime削除と同時に
same-origin API契約へ書き換える。移植直後は既知の失敗を記録し、全件成功をA1の条件にしない。

### 7.7 package変更

`backend/package.json`へ最低限次を追加する。

- script: `typecheck`
- `typescript`
- `@types/node`
- `@types/react`
- `@types/react-dom`
- `vitest`
- `jsdom`
- `@testing-library/jest-dom`
- `@testing-library/react`
- `@testing-library/user-event`

既存packageのmajor versionをこのPhaseで更新しない。
特に `frontend/package.json` / lockfileをbackendへ丸ごとコピーしない。
backendのVite 7、React plugin 5、Laravel Vite plugin 2を維持し、frontend側のVite 8/React plugin 6へ
同時upgradeしない。テストに必要な依存だけをbackendへ個別追加する。

`build` scriptをtypecheck込みへ変更する場合は、既存Inertia entryを含む全production sourceが
typecheckを通ることを確認する。大量の無関係な型修正が必要なら、`typecheck`を別scriptのままにし、
scope拡張を報告する。

### 7.8 A1で変更しないファイル

- `backend/routes/web.php`
- `backend/resources/views/app.blade.php`
- `backend/vite.config.js` のentry
- `backend/bootstrap/app.php`
- `backend/config/kurashi.php`
- `backend/routes/api.php`
- PHP Controller / Service / Model / Resource
- DB migration / seeder

### 7.9 完了条件

- `backend/resources/js/App.tsx`が19画面を定義している。
- `backend/resources/js/main.tsx`がBrowserRouterでAppを起動できる。
- recordsの最新UIがbackend側にある。
- backend側でtypecheckが通る。
- 現行Inertia buildが通る。
- backend側で移植したVitestを実行でき、既知baseline比で移行起因の新規失敗がない。
- 本番で使うVite entryはまだInertiaのままである。
- `frontend/`に変更がない。

### 7.10 最小確認

`backend/` で実行する。

```powershell
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

このPhaseでは移植したVitestを1回実行し、成功/失敗件数と既知失敗を記録する。
全PHPUnitとstale test全件修復は行わない。

### 7.11 ロールバック

A1 PRをrevertする。本番entry、route、DB、APIに変更はない。

### 7.12 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A1だけを実装してください。
backend/resources/jsを最終正本としてSPA entryとAppを準備し、
文書に指定した差分だけを統合してください。
routes、Blade、Vite entry、本番動作、API、DBは変更しないでください。
次Phaseへは進まないでください。
```

---

## 8. Phase A2: Laravel同一オリジンSPA配信基盤

### 8.1 目的

Inertiaを既定のまま残しつつ、設定変更だけでReact Router SPAへ切り替えられる状態を作る。

### 8.2 開始条件

- A1がmainへmerge済み。
- backend側SPA sourceがtypecheckできる。
- working treeがcleanである。

### 8.3 runtime切替設定

`backend/config/kurashi.php`へ次を追加する。

```php
'frontend' => [
    'mode' => env('FRONTEND_MODE', 'inertia'),
],
```

許可値は `inertia` と `spa` だけとする。
不正値は暗黙にspaへ切り替えず、起動時またはrequest時に明示的に失敗させる。

`.env.example`へ次を追加する。

```dotenv
FRONTEND_MODE=inertia
```

A2では既存 `INERTIA_*` 環境変数を削除しない。

### 8.4 SPA root view

`backend/resources/views/spa.blade.php`を新規作成する。

必須内容:

- `lang="ja"`
- charset
- viewport
- theme-color
- 現在と同じdescription
- title `くらしリレー`
- favicon
- `<div id="root"></div>`
- `@viteReactRefresh`
- `@vite(['resources/js/main.tsx'])`

Inertia directiveは入れない。

- `@inertia`
- `@inertiaHead`
- `title inertia`

`frontend/public/favicon.svg` は `backend/public/favicon.svg` へコピーする。

### 8.5 Vite設定

移行期間中だけ、`backend/vite.config.js` のinputを2本にする。

```js
input: [
  "resources/js/inertia/app.tsx",
  "resources/js/main.tsx",
]
```

refresh対象は `resources/js/**` と `resources/views/**` を含める。

A2ではInertia entryを削除しない。

### 8.6 web route

`backend/routes/web.php`を、frontend modeにより次のどちらかを登録する構造へ変更する。

- `inertia`: 現在のInertia route群
- `spa`: SPA root viewを返すweb catch-all

SPA catch-allは次を満たす。

- 4.1の19画面を直接開ける。
- 未知の通常画面URLもReact Routerの404へ渡せる。
- `/api` と `/api/*` を捕まえない。
- `/sanctum` を利用する場合は `/sanctum/*` を捕まえない。
- `/build/*`、`/storage/*`、`/favicon.svg` 等のpublic assetを邪魔しない。
- GET / HEADだけを対象にする。
- POST / PATCH / PUT / DELETEをSPA HTMLへ変換しない。

SPA shellはroute closureではなく、新規のinvokable
`backend/app/Http/Controllers/Web/SpaController.php` から `view('spa')` を返す。
route cacheとの相性を保ち、controllerへAPI処理やpage propsを追加しない。

catch-allのpath制約はLaravel側が外側anchorを付ける前提で、先頭 `^` / 末尾 `$` を付けない。
実装例は `->where('path', '(?!api(?:/|$)|build(?:/|$)|storage(?:/|$)).*')` とするが、
正規表現だけで安全を保証せず、route順序と実動確認の両方で検証する。
`Route::fallback()` でAPIまでSPA HTMLへ変換してはならない。

既存 `/app/{path}` bookmark互換redirectはA2では維持する。query stringを落とさず、
SPAのNotFoundへ吸わせない。

conditional routeはroute/config cacheへ焼き付く。`FRONTEND_MODE`変更時は再deploy、または
定められたcache再生成手順が必要であることをdeployment記録へ残す。

catch-allの正規表現だけを信用せず、次の実動確認を必須にする。

- `/api/health` がJSON
- 存在しない `/api/not-found` がJSON 404
- 存在しない `/not-found` がSPAの404画面

### 8.7 API client

`backend/resources/js/api/client.ts`を、Laravel配信SPAではsame-originを既定にする。

要件:

- 本番の既定API baseは `window.location.origin` または相対URL。
- `VITE_API_BASE_URL` が明示された場合は、その値を優先する。
- localhostのport 8000固定を本番既定にしない。
- `/api/*` pathを二重slashにしない。
- same-originでは `credentials: "same-origin"` を明示する。
- Render rollbackのcross-origin設定をA5まで壊さない。
- A2では `inertiaAuth.ts` とfamily token分岐をまだ削除しない。
- Laravel Cloudのbuild環境に古い `VITE_API_BASE_URL` が残っていないか確認する。
  Vite環境変数はbuild時にbundleへ固定される。
- Renderを残す間は既存CORS設定を削除しない。

Laravel Blade経由で開発する時は、ページoriginをLaravel側にする。
ViteのportへHTMLを直接開く運用は正としない。

### 8.8 A2で変更しないもの

- API endpoint
- PHP API Controller / Resource / Request
- Service / Model
- DB
- localStorage key
- query key
- idempotency処理
- UI componentの見た目
- 認証方式

### 8.9 完了条件

- `FRONTEND_MODE=inertia`で現行Inertia画面が表示される。
- `FRONTEND_MODE=spa`でReact Router SPAが表示される。
- 両entryが1回のVite buildで生成される。
- 19画面を直接reloadできる。
- APIがSPA catch-allに吸われない。
- same-originでdashboard GETが成功する。
- Render rollback用 `VITE_API_BASE_URL`を残している。

### 8.10 最小確認

```powershell
cd backend
npm.cmd run typecheck
npm.cmd run build
php artisan route:list
```

ローカルでfrontend modeを切り替え、最低限次を確認する。

- `/`
- `/records`
- `/records/musume`
- `/musume`
- `/koekake`
- `/oshigoto`
- `/oshigoto/usj`
- `/settings`
- `/not-found`
- `/api/health`
- `/api/not-found`

追加する `backend/tests/Feature/Web/SpaShellTest.php` では最低限、SPA modeのnested direct URL、
Inertia mode維持、`/api/not-found` JSON 404、asset prefix非捕捉を対象確認する。

A2では全PHPUnit/Vitestを必須にしない。

### 8.11 ロールバック

- `FRONTEND_MODE=inertia`へ戻す。
- 必要ならA2 PRをrevertする。
- API、DB、Inertia sourceは残っているためデータrollbackは不要。

### 8.12 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A2だけを実装してください。
FRONTEND_MODEの既定値はinertiaのまま、SPA Blade、dual Vite entry、
APIを除外するweb catch-all、same-origin API clientを実装してください。
認証方式、API契約、DB、UIは変更しないでください。
本番環境変数は変更せず、次Phaseへ進まないでください。
```

---

## 9. Phase A3: 現行アクセス契約の記録・別課題化

### 9.1 目的

SPA移行に認証再設計を混ぜず、最新mainのアクセス動作をそのまま維持する。

最新mainでは `7a8391b fix(auth): remove family token gate` により、API routeへfamily-token
middlewareが付いていない。残っているmiddlewareやstale testを根拠に、Cursorが独断で保護を
再有効化してはならない。

### 9.2 このPhaseで固定すること

- SPA移行中は現在の認証・未認証動作を変えない。
- Sanctumを導入しない。
- session認証やCSRFを追加しない。
- `EnsureFamilyToken` をAPI middlewareへ再接続しない。
- `X-Family-Token` 必須化を復活しない。
- CORSを認証の代替と説明しない。
- APIの公開範囲とリスクは明記するが、このPhaseで解決したと扱わない。

### 9.3 別課題へ分離する内容

アクセス保護が必要なら、SPA移行とは別に次を行う。

1. 新しいdesign decisionを作る。
2. same-origin session、Sanctum、family-token等を比較する。
3. GETとwriteの保護範囲、CSRF、secret管理、失敗時UIを決める。
4. API契約と本番環境を含む専用計画・専用branch・専用PRを作る。
5. 未認証GET/write、認証後GET/write、401/419/429を独立して検証する。

この別課題はA4 cutoverのcodeへ混ぜない。セキュリティ上A4前に解決が必須とユーザーが判断した場合は、
本移行を停止し、別課題の完了を待つ。

### 9.4 完了条件

- `routes/api.php` と `php artisan route:list --path=api --json` の現状を記録している。
- API routeが19本である。
- 現状の未認証GET/write動作を事実として記録している。
- `7a8391b` の判断をstale testで上書きしていない。
- 認証再設計を別backlog/issue/DR候補として記録している。
- code、package、lockfile、環境変数、本番runtimeに変更がない。

### 9.5 ロールバック

runtime変更はない。記録が誤っている場合だけdocsを修正する。

### 9.6 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A3の現状確認と記録だけを行ってください。
最新mainの認証動作を変更せず、Sanctum/session/CSRF/family-token middlewareを
導入・再有効化しないでください。API 19 routeと現状動作を報告し、
アクセス保護の再設計は別課題として残して終了してください。
```

---

## 10. Phase A4: 本番SPA cutover

### 10.1 目的

Inertiaを削除せず、production canonical frontendだけをReact Router SPAへ切り替える。

### 10.2 開始条件

- A2がmainへmerge・deploy済み。
- A3で現行アクセス契約と認証別課題が記録済み。
- `FRONTEND_MODE=inertia`で現行本番が動く。
- `FRONTEND_MODE=spa`をローカルまたはpreviewで確認済み。
- Laravel Cloudの現在の環境変数を控えている。
- 直前deployへ戻す方法を確認している。
- Render SPAまたは旧Inertia runtimeをrollback先として残している。
- Laravel Cloudのbuild logでnpm/Vite build実行を確認している。
- `public/build/manifest.json`に `resources/js/main.tsx` entryがある。
- production bundleに旧Render API URLやlocalhost URLが埋め込まれていない。
- API route snapshotが19本で、A2前からmethod・URI・actionが変わっていない。
- `backend/database/**` とAPI Controller/Request/Resource/Service/Modelの差分が0である。

### 10.3 origin・localStorage切替前ゲート

localStorageはkey名を維持してもoriginを越えて移らない。切替前に、現在URLと切替後URLの
scheme・host・portを記録し、同一originかどうか判定する。カスタムドメインを維持できるなら、
同一originでの切替を優先する。

originが変わる場合、ユーザーが次を手動で完了するまで切り替えない。

1. 旧URLをオンライン状態で開く。
2. 母・娘双方で未送信操作を再送し、次のqueueが空であることを確認する。
   - `kurashi:v1:mama:queue`
   - `kurashi:v1:musume:queue`
3. 記録がAPI/Recordsへ反映されたことを確認する。
4. 旧originのlocalStorageを手動削除しない。
5. 次の値は新originへ自動移行されず、初期化される可能性を了承する。
   - `kurashi:v1:*:*:snapshot`
   - `kurashi:v1:*:revealed`
   - `kurashi-relay:family-token`
   - `kurashi-relay:mood`
   - `kurashi-relay:sidebar-open`

queueが空にできない場合はcutoverを停止する。snapshotや表示状態より、未送信create/cancelと
idempotency keyの保全を優先する。

### 10.4 code変更

A4は原則として切替専用の小さいPRにする。

- production defaultをcodeでspaへ変えない。
- 環境変数 `FRONTEND_MODE=spa` で切り替える。
- 切替のためのUI修正やAPI修正を混ぜない。
- Laravelのconfig cache反映方法をdeploy記録へ残す。

外部環境変数の変更はユーザーがLaravel Cloud上で行う。
Cursorは外部環境を無断変更しない。

単なるruntime環境変数変更で即時切替できると仮定しない。`FRONTEND_MODE=spa` 設定後、
Laravel Cloudを再deployし、config/route cacheが新modeで再生成されたことを確認する。

### 10.5 切替直後の本番smoke

次を1周だけ確認する。

#### 配信・navigation

- [ ] `/` を直接開ける
- [ ] mobile menuを開閉できる
- [ ] PC sidebarを開閉できる
- [ ] React Router遷移でfull reloadしない
- [ ] 戻る・進むが動く
- [ ] `/records/musume`を直接reloadできる
- [ ] `/oshigoto/usj`を直接reloadできる
- [ ] 未知URLでアプリ内404が出る
- [ ] `/api/health`がJSONを返す
- [ ] 未知の`/api/*`がHTMLを返さない

#### Home

- [ ] dashboard dataを取得できる
- [ ] tab query stringが維持される
- [ ] 最新情報へ更新できる

#### Oshigoto / MamaKaji

- [ ] 娘のおしごとを1回記録できる
- [ ] 母の家事を1回記録できる
- [ ] 直前記録を取り消せる
- [ ] count、gauge、points/coinsが更新される
- [ ] 図鑑へ移動できる

#### offline / idempotency

- [ ] 通信失敗相当で操作がlocalStorage queueへ残る
- [ ] online復帰で再送される
- [ ] 同じidempotency keyで二重記録されない
- [ ] reload後も未送信queueを失わない

#### Records

- [ ] `/records`で母娘timelineを表示できる
- [ ] `/records/musume`で娘の回数を表示できる
- [ ] 前日へ移動できる
- [ ] 今日へ戻れる
- [ ] 詳細sheetを開閉できる

#### Musume

- [ ] 今日・明日の見通しを表示できる
- [ ] 見通し項目を保存できる
- [ ] 「ママと決めた」を保存できる
- [ ] 振り返りを完了できる
- [ ] Oshigotoへ移動できる

#### Koekake

- [ ] 一覧を取得できる
- [ ] 詳細を開ける
- [ ] 声かけを記録できる
- [ ] 声かけを取り消せる
- [ ] 完了状態を更新できる
- [ ] 再通知を保存できる
- [ ] 娘summaryを表示できる

### 10.6 完了条件

- 上記smokeにblocking failureがない。
- API/DBにmigrationやdata conversionを行っていない。
- Inertia runtimeは残っている。
- Renderと `frontend/` はロールバック用に残っている。
- originが変わる場合、旧originの母・娘queueを空にしてから切り替えた。
- rollback手順が実行可能である。

### 10.7 blocking failure

次のいずれかがあれば即時rollbackする。

- SPA rootが表示されない
- asset 404
- `/api/*`がSPA HTMLを返す
- direct route reloadが404
- task recordの二重作成
- offline queue消失
- cancel不能
- Musume/Koekakeの保存不能
- 認証loop
- 個人データが意図せず無認証公開される

### 10.8 ロールバック

1. `FRONTEND_MODE=inertia`へ戻す。
2. config cacheを反映する。
3. `/`と主要APIを確認する。
4. 必要なら直前deployへ戻す。

DB/API schemaは変わっていないため、DB rollbackはしない。

### 10.9 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A4のcutover準備と確認だけを行ってください。
Inertia、frontend、Renderは削除せず、DB/API/UIを変更しないでください。
外部環境変数は私が手動で変更します。切替後は本書のsmoke結果を報告し、
次Phaseへは進まないでください。
```

---

## 11. Phase A5: 本番安定確認

### 11.1 目的

cleanup前に、実際の日常利用でSPAが成立することを確認する。

### 11.2 期間

固定の長期観測は要求しない。次の2回でよい。

1. A4直後の本番smoke
2. 翌日の通常利用または日付が変わった後の再読込

### 11.3 確認項目

- [ ] 翌日のHome dateが正しい
- [ ] 当日のtask記録が当日へ入る
- [ ] 前日のRecordsを表示できる
- [ ] localStorage queueに古い未送信データが残っていない、または正しく再送される
- [ ] hard reload後もSPAを表示できる
- [ ] Laravel logに継続的なasset/API 404がない
- [ ] RenderまたはInertiaへ戻せる状態を維持している

### 11.4 完了条件

- blocking failureがない。
- ユーザーがA6 cleanup着手を明示する。

### 11.5 ロールバック

A4と同じく `FRONTEND_MODE=inertia`へ戻す。

A5はコード変更、commit、PRを作らない。

---

## 12. Phase A6: Inertia runtime・二重routerの削除

### 12.1 目的

SPAを唯一のproduction runtimeとし、Inertia runtime・package・二重router分岐を削除する。
Renderと旧 `frontend/` は、このPhaseではロールバック用に残す。

### 12.2 開始条件

- A5完了。
- ユーザーがA6着手を明示している。
- 最新mainから専用branchを作成している。
- 直前production releaseへ戻せる。
- Renderの自動deployと旧 `frontend/` がロールバック先として利用可能である。

### 12.3 削除境界

このPhaseで削除するのはLaravel側のInertia runtimeと、それにだけ必要な分岐・依存である。

- `frontend/` を削除しない。
- Renderの設定、自動deploy、serviceを停止しない。
- Render originのCORS許可を削除しない。
- 認証・family-tokenの現行動作を変更しない。
- API/DB/UIを変更しない。

`frontend/`削除はA7で別のユーザー承認、branch、PRとして行う。

### 12.4 PHP/Inertia削除候補

利用参照を確認したうえで削除する。

- `backend/app/Http/Controllers/Web/InertiaPageController.php`
- `backend/app/Http/Controllers/Web/RecordsController.php`
- `backend/app/Http/Requests/Web/RecordsIndexRequest.php`
- `backend/app/Http/Middleware/HandleInertiaRequests.php`
- `backend/app/Http/Middleware/EnsureInertiaEnabled.php`
- `backend/app/Support/InertiaPath.php`
- `backend/config/inertia.php`
- `backend/resources/views/app.blade.php`
- `backend/tests/Feature/Web/InertiaFoundationTest.php`
- `backend/tests/Feature/Web/RecordsPageTest.php`

`LegacyInertiaRedirectController.php` が `/app/{path}` bookmark互換に使われている場合は、
即削除しない。`InertiaPath`依存を外したgeneric redirectへ変更し、root URLへのredirectとquery stringを
維持する。互換URLを廃止する判断は別途行う。

次は認証別課題の範囲なので、利用が見えなくてもA6では削除・再接続・改修しない。

- `backend/app/Http/Controllers/Web/FamilyTokenController.php`
- `backend/app/Http/Middleware/EnsureWebFamilyToken.php`
- `backend/app/Http/Middleware/EnsureFamilyToken.php`
- `backend/app/Http/Requests/Web/FamilyTokenStoreRequest.php`
- family-token関連test
- `backend/resources/js/features/auth/FamilyTokenProvider.tsx`
- `backend/resources/js/api/familyToken.ts`

### 12.5 React/Inertia削除候補

- `backend/resources/js/inertia/` 全体
- `backend/resources/js/api/inertiaAuth.ts`
- `backend/resources/js/navigation/inertiaPath.ts`
- `backend/resources/js/features/dashboard/hooks/useInertiaDashboardTab.ts`

`AppPathContext.tsx` は利用箇所を確認する。
SPAのpath prefix用途がなくなれば削除し、単純なReact Router pathへ置き換える。

### 12.6 二重router分岐の簡略化

少なくとも次を確認し、Inertia import/branchだけを削除する。

- `components/ui/DashboardPrimitives.tsx`
- `pages/PlaceholderPage.tsx`
- `pages/HomePage.tsx`
- `features/musume/components/MusumeHome.tsx`
- `features/mamakaji/components/MamaKajiTabs.tsx`
- `features/oshigoto/components/OshigotoTabs.tsx`
- `navigation/AppPathContext.tsx`

最終的に次へ統一する。

- `Link` / `NavLink`: `react-router-dom`
- route state: React Router
- dashboard query string: `useSpaDashboardTab`
- application shell: `components/layout/AppShell.tsx`

### 12.7 package削除

backend側:

- npm: `@inertiajs/react`
- Composer: `inertiajs/inertia-laravel`

次は残す。

- `react-router-dom`
- `@tanstack/react-query`
- `zod`
- `react`
- `react-dom`
- Vite / Laravel Vite plugin

package削除後、lockfileを正規のpackage managerで更新する。
lockfileを手編集しない。

### 12.8 Laravel設定整理

- `backend/bootstrap/app.php` からHandleInertiaRequests登録を削除する。
- `inertia.enabled` aliasを削除する。
- `backend/routes/web.php`をSPA catch-allだけへ単純化する。
- `backend/vite.config.js`のinputを `resources/js/main.tsx` 1本にする。
- `backend/config/kurashi.php`からInertia設定を削除する。
- `.env.example`から `INERTIA_*` を削除する。
- `backend/phpunit.xml` の `INERTIA_*` test環境変数を削除する。
- `FRONTEND_MODE`とmode分岐を削除し、SPA routeだけを常時登録する。

Inertia package/code削除後の `FRONTEND_MODE=inertia` は機能しないため、flagを残してrollback手段に
見せてはならない。A6のrollbackはA5 releaseへのdeploy rollbackまたはPR revertで行う。

### 12.9 旧frontendの保持

`frontend/` 全体を凍結状態で残す。A6で変更するのは、Inertia削除後も必要なRender rollbackとの
互換性を維持するために不可避な場合だけとし、その場合も削除はしない。

最低限、次をA7まで保持する。

- `frontend/src`
- `frontend/public`
- `frontend/package.json` / `package-lock.json`
- Renderのbuild/start設定
- 最終成功deployとURLの記録

`frontend/src/api/client.test.ts` のInertia session mode部分は、backendへ移植したtest側だけを
same-origin契約へ更新する。family-token testは認証別課題まで維持する。

### 12.10 zero-reference gate

実行コードと現行testで次の参照が0件であることを確認する。

```powershell
rg -n "@inertiajs|Inertia::|inertia\.enabled|INERTIA_|InertiaPath|useInertiaDashboardTab|inertiaAuth" backend --glob "!vendor/**"
```

次は履歴としてarchive docsに残ってよい。

- `docs/archive/` の過去判断
- Git履歴

### 12.11 完了条件

- canonical production React sourceが `backend/resources/js` である。
- `frontend/`は凍結したRender rollback sourceとして残っている。
- Inertia PHP/React packageがない。
- Inertia runtime codeがない。
- Vite entryがSPA 1本である。
- 19画面のURLが維持される。
- `/api/*`が維持される。
- typecheckとbuildが通る。
- A4の主要smokeが通る。
- DB migrationが0件である。
- Render rollbackをまだ壊していない。

### 12.12 最小確認

```powershell
cd backend
npm.cmd run typecheck
npm.cmd run build
composer dump-autoload
php artisan route:list
```

全テスト実行は必須にしない。
削除と直接関係するtestだけ、存在する場合に実行する。

画面確認:

- `/`
- `/records`
- `/records/musume`
- `/musume`
- `/koekake`
- `/oshigoto`
- `/mama-kaji`
- `/settings`
- direct reload
- back / forward
- task記録1回と取消1回

### 12.13 ロールバック

A6前のproduction releaseへ戻す。

A6後は `FRONTEND_MODE=inertia` だけでは戻せないため、次を必ず保持する。

- A5時点のGit commit
- A5時点のLaravel Cloud release
- A5時点の環境変数記録
- Render rollback URL（停止判断前まで）

DBは変更していないため、DB rollbackは行わない。

### 12.14 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A6だけを実装してください。
A5完了済みです。Laravel側のInertia runtime/packageと二重router分岐だけを削除してください。
frontend、Render、family-token関連、認証、API、DB、UIは削除・変更しないでください。
次Phaseへは進まないでください。
```

---

## 13. Phase A7: Render廃止・旧frontend削除

### 13.1 目的

Laravel SPAが安定し、Render rollbackが不要になったことを人間が明示判断した後で、
旧 `frontend/` とRender運用を整理する。A6とは必ず別branch・別PRにする。

### 13.2 開始条件

- A6がmainへmerge・deploy済み。
- A6後の本番smokeと、翌日または日付変更後の通常利用が成功している。
- Laravel Cloudのrollback releaseとGit commitを記録している。
- ユーザーが「Render rollbackは不要」「frontend削除へ進む」と明示している。
- Renderの最終成功deploy、URL、自動deploy状態を記録している。
- Cursorが外部のRender serviceを無断で停止・削除しないことを確認している。

### 13.3 Renderの人間ゲート

`frontend/` を削除するPRをmergeする前に、ユーザーがRender側で自動deployを停止する。
これはrepository削除commitによってRender buildが自動実行され、失敗deployで最後のrollback先まで
壊すことを防ぐためである。

Render service自体を直ちに削除する必要はない。最終成功deployを短期保持する場合は、保持期限と
削除担当を記録する。停止・削除・課金変更はユーザーがRender画面で手動実施する。

### 13.4 削除前の最終semantic diff

Cursorは改行を正規化したsemantic diffで、次を再確認する。raw hash差だけで判断しない。

- `frontend/src/App.tsx` が `backend/resources/js/App.tsx` に統合済み。
- `frontend/src/main.tsx` が `backend/resources/js/main.tsx` に統合済み。
- `RecordsMemberList.tsx` とcompact/左右比較UIがbackendにある。
- `oshigotoSchema.ts` のoptional/fallback方針がbackendにある。
- frontend-onlyのproduction `.ts` / `.tsx` / `.css` が残っていない。
- `frontend/public/favicon.svg` 等の必要assetが `backend/public` にある。
- 13 test fileと3 test helperのうち、API-first後も有効なものがbackendへ移植済み。
- backend側でtestを削除した場合、削除理由がInertia runtime依存としてPRへ記録されている。

未統合のproduction codeまたは有効testが見つかった場合は、`frontend/`を削除せず停止する。

### 13.5 repository cleanup

上記gate完了後、専用PRで次を行う。

1. `frontend/` 全体を削除する。
2. `README.md`、`AGENTS.md`、`CLAUDE.md`、`backend/README.md` 等から旧frontend実行手順を削除する。
3. 現行運用で `MANIFEST.json` を使っている場合、staleな `frontend/.gitkeep` entryを整理する。
   履歴artifactとして使っていない場合は、無関係なmanifest再設計へ拡張しない。
4. Render origin専用CORS許可は、Render service不要の確認後だけ削除する。
5. Laravel Cloud、same-origin API、DB、UIの実装は変更しない。

### 13.6 完了条件

- `frontend/` がrepositoryにない。
- canonical React sourceとtest sourceがbackend側にある。
- Render自動deployがrepository削除commitで走らない。
- Renderの保持/停止/削除状態と担当が記録されている。
- backend typecheck、対象test、production buildが成功するか、既知baseline比で新規失敗がない。
- API route snapshot 19本と `backend/database/**` diff 0を維持している。
- Laravel SPAの主要操作とdirect reloadが成功する。

### 13.7 最小確認

```powershell
cd backend
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
php artisan route:list --path=api --json
```

repository rootで `rg -n "frontend/|Render" README.md AGENTS.md CLAUDE.md backend docs` を実行し、
残る参照が履歴、archive、または明示した運用記録だけであることを確認する。

### 13.8 ロールバック

- A7 PRをrevertして `frontend/` を復元する。
- 必要ならユーザーがRender自動deployを再有効化し、記録済みの最終成功commitをdeployする。
- Laravel productionはA6 releaseを維持する。
- DB rollbackは行わない。

### 13.9 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A7だけを実装してください。A6は本番確認済みで、Render自動deploy停止と
frontend削除を私が明示承認済みです。削除前semantic diffでproduction code・asset・
有効testの統合を確認し、未統合があれば削除せず停止してください。
Render外部serviceは操作せず、API、DB、UIは変更しないでください。
```

---

## 14. Phase A8: 完了文書同期とWIP archive

### 14.1 目的

実装後の構成を恒久文書へ反映し、本WIPを完了扱いにする。

### 14.2 開始条件

- A7がmainへmerge・deploy済み。
- production SPAが利用可能。
- rollback releaseが記録されている。

### 14.3 変更対象

- `docs/architecture.md`
- `docs/development-plan.md`
- `docs/api-contract.md`
- `docs/design-decisions.md`
- 本ファイル
- `docs/archive/` 配下の保存先

### 14.4 記録する内容

- A4 cutover日
- A5確認結果
- A6 cleanup commit/PR
- A7 frontend cleanup commit/PR
- 最終React source
- 最終Vite entry
- 最終web route方式
- API一覧
- 認証方式または認証なしの明示判断
- Render停止判断の状態
- rollback release
- 残課題

### 14.5 WIP処理

本ファイルを `docs/archive/phases/` 等の適切な保存先へ移す。
`docs/wip/api-first-spa-migration/` に完了済み文書を残さない。

### 14.6 完了条件

- 恒久文書が実コードと一致する。
- Inertiaを現行方針として説明する文書がない。
- 本WIPがarchiveされる。
- code/package/lockfileに変更がない。

### 14.7 Cursorへの手動依頼文

```text
AGENTS.mdと docs/wip/api-first-spa-migration/implementation-plan.md を読み、
Phase A8だけを実装してください。
実装済みの最終構成、cutover結果、認証判断、rollback情報を恒久文書へ同期し、
本WIPをarchiveしてください。code/package/lockfileは変更しないでください。
```

---

## 14. テスト・確認方針

### 14.1 基本方針

DR-033と `AGENTS.md` を優先し、全テスト通過を移行完了条件にしない。

- 新しい通常機能testは追加しない。
- stale test全件の修復をしない。
- 既存testが落ちているだけで、対象Phaseの動作確認を失敗扱いにしない。
- 対象コードが削除されたtestは、対応するcleanup Phaseで削除する。
- typecheckとbuildはsource統合・asset配信の直接確認なのでA1/A2/A6で実行する。
- 認証は高リスクなのでA3だけ対象確認を増やす。
- DBを変更しないためmigration testは追加しない。

### 14.2 Phase別の最小確認

| Phase | 必須確認 |
|---|---|
| A0 | docs link・矛盾確認 |
| A1 | backend typecheck + build |
| A2 | dual build + direct route + API JSON |
| A3 | 未認証/認証済みGET・write + browser 1回 + review 1周 |
| A4 | 本番smoke 1周 |
| A5 | 翌日または日付変更後の通常利用1回 |
| A6 | zero-reference + typecheck + build +主要操作1回 |
| A7 | docsと実装の一致確認 |

### 14.3 既知の現行test状態

調査時点では次の状態だった。

- frontend: 110件中92件成功、18件失敗
- backend: 107件成功、27件失敗、5件skip

失敗には次が混在する。

- 削除済みfamily-token route/middlewareを期待するstale test
- UI文言・構造変更に追随していないtest
- ローカルvendorがcomposer.lockへ追随しておらずInertia classがない環境差
- 現在の実装不具合候補

したがって、件数だけをarchitecture選択やPhase完了判定に使わない。

---

## 15. リスクと対策

| リスク | 発生Phase | 対策 | 検出方法 |
|---|---|---|---|
| 新しいfrontend実装を消す | A1/A6 | 6差分とfrontend-only production fileを個別確認 | normalized diff |
| `/api/*`がSPA HTMLになる | A2/A4 | catch-allからAPI除外 | `/api/not-found` JSON確認 |
| direct URLが404 | A2/A4 | web catch-all + BrowserRouter | 主要URL直接reload |
| asset manifestにSPA entryがない | A2/A4 | dual Vite input | production build/manifest確認 |
| localhost port 8000が本番に残る | A2 | same-origin default | build後の実通信確認 |
| Inertia/Router Linkが混在 | A6 | zero-reference gate | `rg @inertiajs` |
| offline queue消失 | A1-A6 | keyとqueue処理を変更しない | offline/online smoke |
| 二重task record | A4/A6 | idempotency処理を変更しない | 同key再送確認 |
| 認証なし公開 | A3/A4 | S/T/Nを明示選択 | 未認証GET/POST |
| CSRFでwrite不能 | A3/A4 | same-origin credentials/CSRF確認 | POST/PATCH/DELETE |
| config cacheでmodeが変わらない | A4 |反映手順を記録 | response source確認 |
| cleanup後に即時rollbackできない | A6 | A5 release/commit/envを保持 | rollback記録 |
| UI改善を混ぜて原因不明 | 全Phase | UI変更禁止 | diff review |
| DB変更を混ぜてrollback不能 | 全Phase | migration/seed禁止 | changed-file確認 |

---

## 16. ロールバック表

| Phase | runtime影響 | 主な戻し方 | DB操作 |
|---|---|---|---|
| A0 | なし | docs PR revert | なし |
| A1 | なし | code PR revert | なし |
| A2 | defaultではなし | `FRONTEND_MODE=inertia` / PR revert | なし |
| A3 | 認証のみ | 前deploy + env復元 | なし |
| A4 | SPAがcanonical | `FRONTEND_MODE=inertia` | なし |
| A5 | なし | A4と同じ | なし |
| A6 | Inertia削除済み | A5 releaseへdeploy rollback | なし |
| A7 | なし | docs PR revert | なし |

---

## 17. 移行全体の完了条件

次をすべて満たした時に完了とする。

- [ ] React production sourceが `backend/resources/js` の1か所だけ
- [ ] `frontend/` が削除済み
- [ ] Inertia PHP packageが削除済み
- [ ] Inertia React packageが削除済み
- [ ] Inertia route/controller/middleware/pageが削除済み
- [ ] Vite entryがSPA 1本
- [ ] React Routerで19画面を維持
- [ ] 19 API routeを維持
- [ ] same-origin `/api/*` 通信が成立
- [ ] `/api/*`がSPA catch-allに吸われない
- [ ] task記録・取消が動く
- [ ] offline queue・online再送・冪等性を維持
- [ ] Musume保存が動く
- [ ] Koekake保存・取消・再通知が動く
- [ ] Recordsの日付移動とtimelineが動く
- [ ] 認証方式または認証なし判断が明記されている
- [ ] DB migration/data conversionを実施していない
- [ ] A5 rollback releaseが記録されている
- [ ] 恒久文書が最終構成と一致
- [ ] 本WIPがarchive済み

---

## 18. 実行記録欄

各Phaseの実装者は完了時にここへ長文を追記しない。
完了情報は該当PRとA7の最終記録へ集約する。

| Phase | 状態 | branch / PR | 完了日 | 確認結果 | rollback |
|---|---|---|---|---|---|
| A0 | 完了 | `#59` | 2026-07-20 | 文書同期・archive完了 | docs revert |
| A1 | 完了 | `#60` | 2026-07-20 | SPA entry / typecheck / build | PR revert |
| A2 | 完了 | `#61` | 2026-07-20 | FRONTEND_MODE切替基盤 | mode=inertia |
| A3 | 実装済・PR待ち | `docs/api-access-contract` | 2026-07-20 | 19 route・未認証動作を記録 | docs revert |
| A4 | 未着手 |  |  |  | mode=inertia |
| A5 | 未着手 |  |  |  | mode=inertia |
| A6 | 未着手 |  |  |  | A5 release |
| A7 | 未着手 |  |  |  | docs/ops |
| A8 | 未着手 |  |  |  | docs revert |

---

## 19. 最初の実装依頼

本書作成直後にCursorへ依頼するのはPhase A0だけである。

```text
このリポジトリの AGENTS.md と
docs/wip/api-first-spa-migration/implementation-plan.md を全文読んでください。

今回はPhase A0だけを実装してください。
DR-034を追加し、architecture、development-plan、api-contractをAPI-first SPA方針へ同期し、
旧Inertia移行計画をarchiveしてください。

code、package、lockfile、DB、API、deploy設定には触れないでください。
完了条件を満たしたら、変更ファイル・確認結果・rollbackだけを報告して終了してください。
Phase A1以降へ自動で進まないでください。
```
