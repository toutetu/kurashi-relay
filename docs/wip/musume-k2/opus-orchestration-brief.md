# K2 オーケストレーション指示書(Opusサブエージェント用)

- 作成: Fable 2026-07-18。あなた(Opus)は**実装段階のオーケストレーター**。
- 役割分担(ユーザー指示 2026-07-18): 計画=Fable / **オーケストレーション=あなた** / 実装=Cursor / レビュー=Codex。
- **あなた自身はコードを書かない・レビューしない**。Cursor/Codexを起動し、ログとレポートを読み、
  ループを回し、完了報告を返すだけ。トリビアルでも自分で編集しない(全てCursorへ)。

## 対象

- スペック(実装の正): `docs/wip/musume-k2/musume-k2-spec.md`
- デザインの正: `docs/mockups/kurashi-musume-home.html`
- Phase 1 = PR1 `feat/musume-backend`(spec §2〜§6)→ 報告して停止
- Phase 2 = PR2 `feat/musume-frontend`(spec §7〜§8)→ **Fableからの追加指示があるまで着手しない**
  (PR1のmainマージ+本番migrateが先・K1と同じ進め方)

## 厳守ルール

1. ブランチは**最新mainから**切る。作業前に `git pull --ff-only`、コミット前に `git status -sb` で現在ブランチを実測確認。
2. **mainへ直接コミット/push禁止**。**PR作成禁止**(pushして報告まで。PRはFable/ユーザーが作る)。
3. 本番操作(migrate等)禁止。ローカルDBのみ。
4. スペックのスコープ外ファイルに触らせない(§9: 変更は koekake への2点追記のみ許可)。
5. コミットメッセージは既存流儀(`feat(musume): …`)+末尾に
   `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
6. 作業ログ・依頼書・レポートは `docs/wip/musume-k2/` に置く(命名は koekake-k1 と同じ:
   `cursor-backend.log` / `codex-review-request-backend.md` / `codex-review.log` 等)。

## Cursor の呼び出し方(実測済み・メモリ由来)

- 実体: `$env:LOCALAPPDATA\cursor-agent\cursor-agent.cmd`(PATH未登録・フルパスで)
- モデル: **`composer-2.5`(fast=false)**。上位モデルへ勝手にエスカレーションしない。
- 複数行プロンプトは.cmdラッパーが最初の改行で切る → **指示はファイルに書き、1行プロンプトで
  「docs/wip/musume-k2/cursor-request-backend.md を読んで実行して」と読ませる**。
- 起動は PowerShell `Start-Process` でデタッチ+PID保存(`*.pid`)+ログリダイレクト(`*.log`/`*.log.err`)、
  以後はログをポーリングして完了検知(koekake-k1 のログファイル群が実例)。
- 委譲プロンプトに「lint/typecheck/test(+BEは pint / `php artisan test`)を全て通してから完了報告」を必ず含める。
  あなたはテストを叩き直さない(結果報告を読むだけ)。

## Codex の呼び出し方(実測済み)

- `codex exec --full-auto "<1行プロンプト>"` をリポジトリrootで。
- `Start-Process` の場合は**単一文字列ArgumentListで `"` 括り**(配列形式だとプロンプト内スペースで分割される)。
- **レポートはstderr側に出る**(`*.log.err` も読むこと)。
- レビュー依頼書(`codex-review-request-backend.md`)に書くこと: スペック適合確認・品質ゲート実行
  (pint/test 〔FEは lint/typecheck/test/build〕)・冪等/並行系の重点確認(DR-010)・
  FR-M10禁止表現ゼロ・スコープ外ファイル変更が無いことの確認・総合判断(マージ可/不可)。

## ループの回し方

1. `feat/musume-backend` を最新mainから作成
2. `cursor-request-backend.md` を書く(スペック§2〜§6を参照させる。全文コピペではなくパス参照+要点)
3. Cursor起動 → 完了検知 → 差分規模を `git diff --stat` で把握(自分で精読はしない)
4. Codexレビュー依頼書を書いて起動 → レポート(stderr)を読む
5. 重大指摘あり → Cursorに修正依頼(`cursor-fix-backend.md`)→ 再レビュー。
   **小差分(200行以下)の修正はレビュー1周で切り上げ**(DR-017)。判断に迷う指摘は自分で決めず報告に含める
6. 緑+マージ可 → コミット(意味単位)→ push → **完了報告して停止**

## 完了報告に含めること(Fableが合否判断に使う)

- ブランチ名・コミットSHA・`git diff --stat` 要約
- Cursorの品質ゲート結果(テスト数含む)/ Codexの総合判断と残指摘(重大/軽微の別)
- スペックから逸脱した点・未解決の判断事項(あれば)
- 本番反映手順の確認(spec §6: `php artisan migrate --force` のみでよいか)
