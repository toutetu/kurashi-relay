# Codex引き継ぎガイド
## Laravel API＋React版

# 1. 最初に行うこと

Codexへ `PROMPT_CODEX_REVIEW.md` を送る。

この時点では、コードを変更させない。
資料の理解、矛盾、不足だけを報告させる。

# 2. 確認する回答

Codexの回答が次を満たすこと。

- Laravel REST API
- 独立React SPA
- モノレポ
- Inertiaなし
- 第1実装では認証なし
- DB永続化なし
- Google Calendarなし
- 母向けは赤・黄・青・白
- 娘向けは水色＋紫
- 左に予定、右に実績
- 予定なし時間を空白にしない

# 3. 実装開始

理解に問題がなければ `PROMPT_CODEX_01.md` を送る。

# 4. 作業を分割する場合

## 第1段階

- backendとfrontendの生成
- health API
- 起動確認

## 第2段階

- dashboard API
- API Resource
- APIテスト
- ReactのQuery Hook

## 第3段階

- ホーム
- 予定実績比較
- レスポンシブ
- フロントテスト

# 5. 実装後の手動確認

## 画面幅

- 390px
- 768px
- 1024px
- 1440px
- 文字200%

## API

- 正常
- 不正な日付
- サーバー停止時
- 再試行

## 予定実績比較

- 予定あり＋実績あり
- 予定あり＋実績が別活動
- 予定なし＋実績あり
- 予定なし＋実績なし
- 中止
- 予定どおり

# 6. 範囲が広がった場合の修正依頼

```text
第1実装の範囲を超えています。
認証、Sanctum、Google Calendar、DB永続化、
本番デプロイを削除してください。

docs/codex-implementation-01.mdの受け入れ条件に戻し、
Laravel APIの固定データ取得と指定された画面に絞ってください。
```

# 7. 第2実装候補

1. UIレビュー修正
2. Laravel MigrationとModel
3. 活動記録の保存API
4. クイック支援記録の保存API
5. 予定・実績の保存
6. Sanctum認証
7. Google Calendar一方向取込
8. レポート
9. デプロイ
