# API-first SPA移行（完了保管）

完了日: 2026-07-20  
方針: DR-034 / DR-038  
認証事実: DR-035

## 最終構成

- 本番: `https://kurashi-relay-production-olnfy0.laravel.cloud/`
- React正本: `backend/resources/js`
- Vite entry: `resources/js/main.tsx`
- web: SPA catch-all + `/app/*` → root redirect
- API: 19本（未認証公開・保護再設計は別課題）
- Inertia / 旧 `frontend/` : 削除済み（`#69` / `#70`）
- Render `kurashi-relay-web`: Auto-Deploy停止済み（削除は任意）

## 収録ファイル

| ファイル | 内容 |
|---|---|
| `implementation-plan.md` | A0〜A8の委譲用計画・実行記録 |
| `access-contract-a3.md` | APIアクセス契約のsnapshot |
| `cutover-a4.md` | 本番cutover手順 |
| `stability-a5.md` | 本番安定確認 |
| `render-decommission-a7.md` | Render廃止・frontend削除ゲート |

恒久文書の正本は `docs/architecture.md` / `docs/development-plan.md` /
`docs/api-contract.md` / `docs/design-decisions.md`。
