# 引継ぎ書: Codex への残実装移管(2026-07-18)

Fable のトークン残量枯渇のため、**以後の実装・検証・レビューに加えて「指揮」も Codex が担う**。
この文書だけ読めば作業を再開できるように書いてある。不明点はまずここに列挙した資料を参照すること。

## 1. 現在地(2026-07-18 時点)

| 項目 | 状態 |
|---|---|
| K0(マイグレーション統合+DBリセット) | ✅ 完了 |
| K1(母用声かけリマインダー `/koekake`) | ✅ 完了・マージ済み |
| K2(娘用ホーム・母向けサマリー) | ✅ 完了・マージ済み |
| 夏休み対応(明日なにする?/ママと決めた) | ✅ コードは main にマージ済み(PR #27 backend / #28 frontend)だが **本番未反映** |
| 本番DB | **旧スキーマのまま**(詳細: DR-022)。`migrate:fresh` 待ち |

**最重要の残作業は「夏休み対応の本番反映」**。CREATEマイグレーション書き換え(DR-013方式)の副作用で、
マージしても本番スキーマが更新されておらず、「🎀 ママと決めた」の**書き込みだけが本番で落ちる**状態
(読み取りは null が返るためエラーに見えない)。判定は必ず `migrate:status` のバッチ番号で行う。

## 2. 残作業(優先順)

### A. 夏休み対応の本番反映(最優先・ユーザー操作+Codex検証)

- 手順書: `docs/ops/musume-summer-release.md`(完成済み・これに全部書いてある)
- **ダッシュボード操作(migrate:fresh --force → db:seed --force)はユーザー本人が実行する**
  (Laravel Cloud の Commands タブ。エージェントはスクショ駆動クリックをしない方針)
- Codex の役割: 実行後の curlスモーク(手順書内のコマンド)で シード復元(タスク22件・rewards正常)を確認し、
  合否をユーザーに報告する
- 最終確認は娘さんとの実機(手順書「実機確認」節)。ユーザーが実施

### B. Phase 8a: 本番安定確認 curl スモーク

- 依頼書: `docs/wip/codex-smoke-request-phase8.md`
- A の fresh 完了後に実行する(K0計画時からの申し送り。観測データを一貫させるため)

### C. Phase 5 フォローアップ修正(H1〜3 / M1〜3)

- 内容: `docs/wip/phase5-followup-fixes.md`(未着手のまま有効)
- 並行系の堅牢化。K1以降の新規実装では対策済みなので、既存 oshigoto 側への適用が残り

### D. Phase 8b: 旧 Render API の停止

- 内容: `docs/wip/phase8-stability-and-render-stop.md`
- **ゲート付き**: A・B が緑で、実運用がしばらく安定してから。ロールバック先を失う操作なので慎重に

### E. K3 バックログ / K4 母ホーム差し替え判断

- K3: `docs/koekake-plan-01.md` §7(通知のPWA化判断・週次レポート等)。着手は都度判断
- K4: 母ホーム(`/`)を `/koekake` へ差し替え/統合するかの判断。**実装ではなく判断**であり、
  ユーザーの実機運用の感触待ち。急がない

## 3. 進め方のルール(Codex が引き継ぐこと)

1. **ブランチ**: 1ブランチ=1デプロイ単位。バックエンド/フロントは別PR。最新 main から切る。
   命名 `<type>/<domain>-<topic>`(AGENTS.md / DR-014)
2. **テスト**: API新機能は Pest feature テストが完了条件。フロントは vitest(既存慣習 = `vi.fn` fetchモック)。
   小差分(〜200行)はレビュー1周で切り上げ(DR-017)
3. **マイグレーション**: **CREATE の書き換えは今後禁止**。適用済みテーブルの変更は差分ALTERで積む。
   リリース前に `migrate:status` のバッチ番号を確認。破壊的操作の前に実データ量を実測(DR-022。
   確認コマンドは `docs/ops/musume-summer-release.md` 末尾)
4. **設計判断は `docs/design-decisions.md` に DR 形式で追記**(課題感→選択肢→決定→理由)。
   就活ポートフォリオを兼ねるため省略しない
5. **docs も main 直 push 禁止**。`docs/<topic>` ブランチ+PR 経由
6. **本番ダッシュボード操作はユーザーに手順書を渡して依頼**。確認は curl 系で行う
7. 実装を Cursor に振る場合の第一候補モデルは composer-2.5(安価)。難所のみ上位モデル

## 4. 環境

| 対象 | URL/場所 |
|---|---|
| 本番 API | Laravel Cloud(Singapore) `https://kurashi-relay-production-olnfy0.laravel.cloud` |
| 本番フロント | Render(web)。無料プランのため15分でスリープ→コールドスタートあり |
| 旧 API | `kurashi-relay-api.onrender.com`(ロールバック先。Phase 8b まで停止しない) |
| DB | Laravel Serverless Postgres 17(Singapore) |

## 5. 資料の場所

- 役割分担・実装ルール: `AGENTS.md` / `CLAUDE.md`
- 設計判断の記録: `docs/design-decisions.md`(特に DR-012/013/014/017/021/022)
- 声かけ中心化の全体計画: `docs/koekake-plan-01.md`
- リリース手順書: `docs/ops/musume-summer-release.md`
- 進行中の依頼書・レビュー記録: `docs/wip/`(完了したら `docs/archive/` へ移す)
- 設計原則(せめない設計・スキン独立など): `docs/design-principles.md`
