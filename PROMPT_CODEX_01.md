確認内容に問題ありません。
docs/codex-implementation-01.mdに従い、第1実装を開始してください。

最初に短い実装計画を提示し、その後に作業してください。

今回の実装範囲：

- backend/ にLaravel REST APIを構築
- frontend/ にReact＋TypeScript＋Viteを構築
- GET /api/health
- GET /api/dashboard?date=YYYY-MM-DD
- Laravel側の固定ダミーデータをAPI Resource経由で返す
- ReactでTanStack Queryを使用して取得する
- 母向けホームダッシュボード
- 今日の予定と実績のバーチカル比較画面
- 予定なし＋実績ありの表示
- 予定なし＋実績なしの表示
- ローディング、エラー、再試行
- 第1実装で指定されたローカル操作
- LaravelとReact双方のテスト
- lint、typecheck、test、build

重要事項：

- Inertiaは使用しない
- Laravel REST API＋独立React SPA
- React側にAPIと同じダミーデータを重複させない
- 認証、Sanctum、Google Calendar、DB永続化、本番デプロイは実装しない
- 母向け画面は赤・黄・青・白を同程度に使用する
- 娘の今日の作戦カードは水色＋紫
- 人物イラストは使用しない
- アイコンと文字を併用する
- タブレットを主利用端末として最適化する
- PC・タブレット・スマートフォンで同じコンポーネントを再配置する
- 既存ファイルと資料を確認してから変更する
- 指示書にない大規模機能を追加しない

作業完了時に、次を報告してください。

- 実装内容
- API一覧
- 主な変更ファイル
- LaravelのtestとPint結果
- Reactのlint、typecheck、test、build結果
- 390px、768px、1024px、1440px、200%拡大の確認
- 未実装事項
- 次の課題
