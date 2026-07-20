# A4: 本番SPA cutover 手順

更新日: 2026-07-20  
基準commit: `1639b1f6f5f2c5d759ab8ba15ad37368419d5f2f`  
種別: deploy / operation（本番codeのdefaultは変えない）

## 1. 目的

Inertia runtimeは残したまま、production canonical frontendだけを
`FRONTEND_MODE=spa` でReact Router SPAへ切り替える。

## 2. 開始条件チェック（2026-07-20）

| 条件 | 結果 |
|---|---|
| A2 merge済み | OK（`#61`） |
| A3 アクセス契約記録済み | OK（`#62` / DR-035） |
| API route 19本 | OK（`php artisan route:list --path=api --json`） |
| A2以降の DB / API Controller・Request・Resource・Service・Model 差分 | 0（docsのみ） |
| local Vite build に `resources/js/main.tsx` entry | OK |
| local production bundle に `localhost:8000` / onrender URL埋込み | 検出なし |
| codeでproduction defaultをspaへ変更 | しない（既定はinertiaのまま） |
| Inertia / `frontend/` / Render 削除 | しない |

ローカルで `FRONTEND_MODE=spa` のroute登録は `SpaShellTest` と `route:list --name=spa` で確認済み。  
本番切替そのものはLaravel Cloudの環境変数変更 + 再deployが必要。

## 3. origin / localStorage ゲート（切替前にユーザー確認）

現在の本番URLと切替後URLの scheme・host・port を記録する。

- 同一origin（推奨）: localStorage keyはそのまま使える
- origin変更あり: 切替前に母・娘双方のqueueを空にする
  - `kurashi:v1:mama:queue`
  - `kurashi:v1:musume:queue`
- queueが空にできない場合はcutover停止
- 旧originのlocalStorageは手動削除しない
- snapshot / mood / family-token 等は新originへ自動移行されない可能性がある

## 4. ユーザーがLaravel Cloudで行う切替

Cursorは外部環境変数を変更しない。次はユーザー作業。

1. 現行値を控える
   - `FRONTEND_MODE`（未設定なら実質 `inertia`）
   - 直前deployの識別子
2. Laravel Cloudへ環境変数を追加/更新する
   - `FRONTEND_MODE=spa`
3. **再deployする**（env変更だけではroute/config cacheが古いままのことがある）
4. deploy後にconfig/routeが新modeで効いていることを確認する
   - `/` が SPA shell（`id="root"`、Inertia `@inertia` ではない）
   - `/api/health` が JSON

### rollback

1. `FRONTEND_MODE=inertia` へ戻す
2. 再deploy（またはconfig/route cache再生成）
3. `/` と `/api/health` を確認
4. 必要なら直前deployへ戻す

DB rollbackは不要。

## 5. 切替直後smoke（1周）

本番URLで確認し、結果をこの節へ追記する。

### 配信・navigation

- [x] `/` を直接開ける（サーバー: SPA `id="root"`、2026-07-20）
- [ ] mobile menuを開閉できる
- [ ] PC sidebarを開閉できる
- [ ] React Router遷移でfull reloadしない
- [ ] 戻る・進むが動く
- [x] `/records/musume` を直接reloadできる（サーバー確認済み）
- [x] `/oshigoto/usj` を直接reloadできる（サーバー確認済み）
- [ ] 未知URLでアプリ内404が出る
- [x] `/api/health` がJSON
- [x] 未知の `/api/*` がHTMLを返さない

### Home / 記録 / Musume / Koekake

計画書 10.5 の各項目を1周する。blocking failureがあれば即rollback。

### blocking failure

- SPA rootが表示されない
- asset 404
- `/api/*` がSPA HTMLを返す
- direct route reloadが404
- task recordの二重作成
- offline queue消失
- cancel不能
- Musume/Koekake保存不能
- 認証loop
- 個人データが意図せず無認証公開される（A3時点の未認証公開は既知。新規悪化のみblocking）

## 6. A4完了の扱い

- このPRは切替手順と開始条件記録のみ
- 本番 `FRONTEND_MODE=spa` の設定とsmoke完了をもってA4運用完了
- その後 A5（翌日確認）へ進む
