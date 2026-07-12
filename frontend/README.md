# くらしリレー フロントエンド

Laravel REST APIを唯一のダッシュボードデータ源として表示する、React＋TypeScript＋ViteのSPAです。

## セットアップ

```bash
npm install
copy .env.example .env
npm run dev
```

既定のAPI URLは `http://localhost:8000` です。別のURLを使う場合は `.env` の `VITE_API_BASE_URL` を変更してください。

## 品質確認

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
