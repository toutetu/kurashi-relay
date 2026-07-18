# 手順書: 夏休み対応リリース(2026-07-18)

対象リリース: PR #27(バックエンド)+ PR #28(フロント)+ スキーマ差分修正PR(後述)。
DR-021(決定状態カラム廃止)と **DR-022(差分ALTERへの方針転換)** を反映したもの。

> **この手順書は 2026-07-18 に全面改訂した。**
> 旧版は `php artisan migrate:fresh --force` を指示していたが、これは**実行してはいけない**。
> 理由は次節。旧版を見て作業しないこと(ファイル名も `musume-summer-migrate-fresh.md` から改名済み)。

## 現状(2026-07-18 実測)

本番の `php artisan migrate:status` の結果:

```
2026_07_18_200001_create_daily_plans_table ......................... [2] Ran
2026_07_18_200002_create_plan_items_table .......................... [2] Ran
2026_07_18_200003_create_reflection_sessions_table ................. [2] Ran
```

`daily_plans` / `plan_items` は **K2リリース時にバッチ[2]で適用済み**。DR-013 の方針で
ファイル名を変えずに CREATE を書き換えたため、Laravel は再実行せず、**本番は旧スキーマのまま**:

- `daily_plans`: `today_state` / `tomorrow_items_state` / `start_state` が**残っている**、
  `start_decided_with` が**無い**
- `plan_items`: `decided_with` が**無い**

### 症状(重要)

**夏休み機能は本番で動いていないが、エラーとして見えない。**
APIリソースは存在しないカラムを `null` で返すため、curl では「まだ誰も使っていない正常な状態」と
区別がつかない。実際に落ちるのは「🎀 ママと決めた」を押したときの**書き込みだけ**。

`/api/musume/plan` が `start_decided_with: null`・`decided_with: null` を返していても
**正常の証拠にならない**。判定は `migrate:status` のバッチ番号で行うこと。

### なぜ `migrate:fresh` を使わないか

1. **本番に実データがある。** 2026-07-18 時点で娘さんの見通し(入浴 / 英語の宿題 / 夏休みの宿題)と
   持ち物(水筒)が入っている。fresh は全部消す。
2. **DR-013 は「実運用開始をもって終了する」と自ら定めていた。** 運用は始まっている。

→ 差分ALTERマイグレーションを1本追加し、**通常の `migrate --force`** で当てる(DR-022)。

## 手順

### 1. スキーマ差分PRをマージする

`fix/musume-summer-migration` ブランチ(実装指示書:
`docs/wip/musume-summer/cursor-request-migration-fix.md`)。
追加されるのは `2026_07_18_210001_align_musume_plan_decided_with_columns` 1本。

Codex レビュー合格 → マージ → Laravel Cloud のデプロイ完了を待つ。

### 2. マイグレーションを当てる(Laravel Cloud Commands)

```
php artisan migrate --force
```

**`migrate:fresh` ではない。** `--force` は本番で確認プロンプトを飛ばすために必要。

期待される出力: `2026_07_18_210001_align_musume_plan_decided_with_columns` が
バッチ[3]で `DONE` になる。

### 3. `db:seed` は実行しない

`routine_templates` / `prompt_templates` はバッチ[1]で投入済みで、`/koekake` は現に動いている。
再シードは重複投入の恐れがあるため**実行しない**。

### 4. 確認

```bash
API="https://kurashi-relay-production-olnfy0.laravel.cloud"
php artisan migrate:status   # 210001 が Ran になっていること
```

`migrate:status` で確認するのが確実。curlは補助:

```bash
curl -s "$API/api/musume/plan" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('items keys:',Object.keys(j.plan.items))})"
```

期待: `today_task` / `tomorrow_plan` / `tomorrow_item` / `memo` の4キー。

> 繰り返しになるが、**この応答は移行前でも同じ形で返る**。合否判定には使えない。
> 移行が効いたことの確認は `migrate:status` と、下の実機確認(書き込み)で行う。

デプロイ直後はコールドスタートで数十秒かかることがある。1回目がタイムアウトしたら待って再実行。
JSON検証に PowerShell を使うと文字化けすることがあるため `node` を使う。

## 実機確認(娘さんと)

**書き込みが通ることの確認が本番。** ここが今回の修正の核心。

1. `/musume` を夏休みモードで開く
2. 既存の見通し(入浴 / 英語の宿題 / 夏休みの宿題 / 水筒)が**消えずに残っている**か
   → 消えていたら migrate:fresh が誤って走った可能性。**すぐ報告してください**
3. 「🔮 明日 なにする?」が「🎒 明日 何がいる?」の**上**に出ているか
4. 選択肢6つ(友達と遊ぶ / ゆっくりする / ママとお出かけ / 塾に行く / 宿題・勉強をする / その他)が
   読みやすいか。**アイコン 🔮 はFableのデザイン判断**なので、娘さんの反応を見て変更してよい
5. チップを選んで「🎀 ママと決めた」で保存 → **エラーにならず**カードに内容と 🎀 が出るか
   → **これが今回直したところ。** 移行前はここで落ちていた
6. 学校モードに切り替えると「明日 なにする?」が消えるか(保存済みデータは残る。表示されないだけ)
7. `/koekake` を開き、母側のむすめサマリーに**内容が表示され** 🎀 が添えられているか
   (内容が隠れて「ママと決めた」だけ出ていたら不具合。報告してください)

## トラブル時

- `migrate` が「column already exists」で落ちる → 冪等ガード(`Schema::hasColumn`)の漏れ。
  マイグレーションを修正して再デプロイ(本番DBは変更されていないので安全)
- `migrate` が権限エラーで落ちる → Laravel Cloud のDB接続設定を確認
- 「ママと決めた」が保存できない → `migrate:status` で 210001 が Ran か確認
- フロントで型エラー/画面が真っ白 → Render のデプロイが PR #28 を含んでいない可能性。
  デプロイ対象コミットを確認する
- **データが消えた** → `migrate:fresh` を打ってしまった可能性。Laravel Cloud のDBバックアップから
  復元できるか確認する

## 得られた教訓(DR-022)

CREATE書き換え方式は**全環境を fresh できる間だけ**成立する。適用済み環境が1つでも残ると、
マイグレーション履歴とファイル内容が**エラーを出さずに**乖離する。
検知に効くのは `migrate:status` のバッチ番号。API応答の目視は当てにならない。
