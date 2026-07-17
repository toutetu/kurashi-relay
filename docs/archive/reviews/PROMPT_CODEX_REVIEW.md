このリポジトリの資料を確認してください。

まだコードは変更しないでください。

最初に以下をすべて読んでください。

- AGENTS.md
- README.md
- docs/product-plan.md
- docs/architecture.md
- docs/codex-design-spec.md
- docs/data-model.md
- docs/api-contract-01.md
- docs/codex-implementation-01.md
- docs/wireframes/README.md
- docs/wireframes/ 配下の画像

確認後、次を報告してください。

1. このアプリの目的
2. 採用する技術構成
3. LaravelとReactの責務分担
4. 第1実装で作るもの
5. 第1実装で作らないもの
6. 想定するディレクトリ構成
7. APIのエンドポイント
8. ホーム画面の主要カード
9. 「今日の予定と実績」の表示方法
10. 予定がない時間の表示方法
11. 母向け画面と娘向け画面の配色ルール
12. 資料間の不整合、不足、実装前に注意すべき点
13. 第1実装の作業手順

特に次を確認してください。

- Laravel REST API＋独立React SPAである
- Inertiaを使用しない
- 第1実装では認証、Sanctum、Google Calendar、DB永続化、デプロイを行わない
- APIのダミーデータをReact側へ重複して持たせない
- タブレット・PCでは左に予定、右に実績を表示する
- スマートフォンでは予定→実績→差分の順で表示する
- 予定がない時間を空白にしない

コード変更、パッケージ追加、プロジェクト生成はまだ行わないでください。
