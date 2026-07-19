# Phase A Cursor Grok レビュー依頼

対象: `docs/wip/family-token/family-token-spec.md` に基づくCursor実装完了後の未コミット差分
モデル: `cursor-grok-4.5`

> **運用更新(DR-033)**: 認証リスクに絞った独立レビューを1周だけ行う。全品質ゲートの再実行と再レビューは行わない。

## レビュー手順

1. 対象worktreeの `AGENTS.md` と実装指示書を読む。
2. `git status -sb` と `git diff` を実測する。
3. 仕様適合、認証漏れ、秘密値混入、401/429/503契約、CORS、localStorage失敗、テスト分離を確認する。
4. frontendは全fetch経路、APIは全既存routeがhealth以外保護されることを検索で確認する。
5. 実装者が報告した動作確認1回の結果を確認する。全テスト・lint・typecheck・buildは再実行しない。
6. コードは変更せず、重大度順に指摘と合否を報告する。コミット・pushしない。

## 必須レビュー観点

### セキュリティ

- health以外の既存routeにmiddleware漏れがない。
- middlewareが `env()` を直接読まず、config cacheに対応している。
- token比較が定数時間で、値をログ・URL・JSONへ出していない。
- 未設定時に素通しせず503となる。
- CORSを認証と誤認せず、OPTIONSだけを安全に除外している。
- Rate Limitが不正試行だけを数え、正しいtokenで解除できる。境界が仕様どおり5回401→6回目429である。

### フロント

- GET/POST/PATCH/PUT/DELETEの全経路に共通header処理が適用される。
- 401で古い保存値を消し、必須dialogを開く。通知競合やテスト間リークがない。
- mutationを無断で自動再送せず、queryだけを安全に再取得する。
- localStorage例外時もクラッシュせず、tokenがDOMやログへ露出しない。
- 設定画面の入力・変更・削除、必須dialogのアクセシビリティを確認する。

### 回帰と運用

- 既存API JSON、validation、冪等保存、取消を変えていない。
- 実装者の動作確認1回が成功している。
- フロント先行→環境変数設定→API保護のデプロイ順で操作不能期間が生じない。
- `.claude/settings.local.json`、docs worktree、無関係なユーザー差分を変更していない。

## 報告形式

- Findings: `[重大度] ファイル:行 — 問題、再現条件、必要な修正`
- Behavior check: 実装者が行った動作確認1回の内容と結果
- Secret scan: 固定値混入の有無
- Verdict: `PASS` または `CHANGES REQUIRED`
- 指摘0件の場合も、確認した主要経路を短く列挙する。

完了条件: 重大・高リスクの指摘、明らかな固定トークン混入、復旧不能な変更がないこと。
修正が必要でも、ユーザーが明示しない限り再レビューは行わない。
