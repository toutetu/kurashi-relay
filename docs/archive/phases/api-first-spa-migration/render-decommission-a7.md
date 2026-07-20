# A7: Render廃止・旧frontend削除

更新日: 2026-07-20  
種別: code / operation  
ブランチ: `chore/a7-remove-frontend`

## 1. 人間ゲート（必須）

ユーザー承認（本セッション「A7をお願いします」）:

- Render rollbackは不要
- `frontend/` 削除へ進む

**CursorはRenderのservice停止・削除・課金変更を行わない。**

### merge前にユーザーがRenderで行うこと

1. Render Dashboard → `kurashi-relay-web`（Static Site）
2. **Auto-Deploy を OFF**（または suspend）する  
   → このPRのmergeで失敗deployが走って最後のrollback成果物を壊さないため
3. service本体の削除は任意（短期保持可）。削除する場合もユーザーが手動で行う

### Laravel Cloud（任意・推奨）

本番 env の `CORS_ALLOWED_ORIGINS` に  
`https://kurashi-relay-web.onrender.com` が含まれていれば削除する（repoの `.env.example` にはRender URLなし）。

## 2. 記録（2026-07-20）

| 項目 | 値 |
|---|---|
| 本番SPA | `https://kurashi-relay-production-olnfy0.laravel.cloud/` |
| A6 merge | `#69` / `15feb8d` |
| 旧Render URL | `https://kurashi-relay-web.onrender.com` |
| 旧Render service名 | `kurashi-relay-web`（記録上） |
| CursorのRender操作 | なし |

## 3. 削除前semantic diff

結果: **GO**（本番SPA用の frontend-only production code は0件。差分はInertia/rollback専用のみ）

- `App.tsx` / `main.tsx` / Records / oshigotoSchema / favicon: backendに統合済み
- 有効test 13 + helper 3: backendに移植済み
- Inertia専用32ファイルはA6でbackendから既削除済みのため、frontend側に残っても削除してよい

## 4. repository変更

- `frontend/` 全体削除
- `README.md` / `AGENTS.md` から旧frontend・Render運用手順を除去
- CORS hardcodeはrepoに無し（Cloud envはユーザー確認）

## 5. rollback

- 本PRをrevertして `frontend/` を復元
- 必要ならユーザーがRender Auto-Deployを再有効化し、記録済み最終成功commitをdeploy
- Laravel productionはA6以降のreleaseを維持
- DB rollback不要
