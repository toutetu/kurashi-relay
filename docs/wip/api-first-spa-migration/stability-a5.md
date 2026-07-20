# A5: 本番安定確認

更新日: 2026-07-20  
完了日: 2026-07-20  
本番URL: `https://kurashi-relay-production-olnfy0.laravel.cloud`  
種別: operation（code変更・commit・PRなし）  
状態: **完了**

## 1. 目的

A6 cleanup前に、日常利用でSPAが成立することを確認する。

## 2. 期間（計画書 11.2）

1. A4直後の本番smoke — 実施済み
2. 翌日の通常利用、または日付が変わった後の再読込 — ユーザー確認済み（2026-07-20）

## 3. A4 smoke

| 項目 | 結果 |
|---|---|
| `/` が SPA（`id="root"`、Inertia `data-page` なし） | OK |
| `/api/health` が JSON | OK |
| 未知 `/api/*` が JSON 404（HTMLではない） | OK |
| `/records/musume`・`/oshigoto/usj` 直接アクセス | OK |
| CSS / `main-*.js` asset 200 | OK |
| hard reload後も SPA | OK |

### ブラウザ確認（ユーザー）

- [x] `/` を直接開ける
- [x] mobile menu / PC sidebar 開閉
- [x] React Router遷移で full reload しない
- [x] 戻る・進むが動く
- [x] 未知URLでアプリ内404
- [x] Home / Oshigoto / Records / Musume / Koekake の基本操作に blocking failure なし

## 4. A5 確認項目（計画書 11.3）

| 項目 | 状態 | メモ |
|---|---|---|
| 翌日のHome dateが正しい | OK | ユーザー確認 |
| 当日のtask記録が当日へ入る | OK | ユーザー確認 |
| 前日のRecordsを表示できる | OK | ユーザー確認 |
| localStorage queueが空、または正しく再送 | OK | ユーザー確認 |
| hard reload後もSPA | OK | サーバー側 + ユーザー確認 |
| Laravel logに継続的なasset/API 404がない | OK | ユーザー確認 |
| Render / Inertiaへ戻せる状態を維持 | OK | `FRONTEND_MODE=inertia` + 再deploy。`frontend/`・Render未削除 |

## 5. rollback（維持）

1. Laravel Cloudで `FRONTEND_MODE=inertia`
2. 再deploy
3. `/` と `/api/health` を確認

DB rollbackは不要。

## 6. 完了判定

- blocking failureなし
- A5確認項目を満たした（ユーザー宣言 2026-07-20）
- **A6は未着手**。Inertia cleanupはユーザーが明示したときだけ開始する
