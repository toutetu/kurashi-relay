# 手順書: 夏休み対応リリース(2026-07-18)

対象リリース: PR #27(バックエンド)+ PR #28(フロント)。
DR-021(決定状態カラム廃止)と **DR-022(なぜ本番に反映されていなかったか)** を反映したもの。

> **実施状況（2026-07-18追記）**: ユーザー操作による本番 `migrate:fresh` は実施済み。
> この文書に残る `migrate:fresh` は当時の実行記録であり、**再実行してはいけない**。
> 今後の本番スキーマ変更は差分ALTERとバックフィルだけで行う。
> 残る確認は、シード復元、`migrate:status`、下記の書き込みを伴う実機確認である。

## 実行前の状況(2026-07-18 実測・記録)

**PR #27/#28 をマージしただけでは本番に反映されていない。** 本番の `migrate:status`:

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
区別がつかない。旧列は `NOT NULL DEFAULT 'undecided'` なので INSERT も通ってしまう。
実際に落ちるのは「🎀 ママと決めた」を押したときの**書き込みだけ**。

> `/api/musume/plan` が `start_decided_with: null`・`decided_with: null` を返していても
> **正常の証拠にならない**。判定は `migrate:status` の**バッチ番号**で行うこと。
> fresh 済みなら全マイグレーションがバッチ[1]に揃う。分かれていれば fresh は走っていない。

## 消えるデータの確認(実施済み)

`migrate:fresh` は**同じDBの全テーブル**を作り直す。2026-07-18 に実測した中身:

| 対象 | 実データ | 判定 |
|---|---|---|
| おしごと(child) | `lifetime_count` 0 / コレクション0 / コイン0 | 失うものなし |
| おしごと(mother) | `lifetime_count` 0 / コレクション0 / ポイント0 | 失うものなし |
| 声かけ | タスク22件はすべてシード由来・`prompt_events` 0件 | 再シードで復元 |
| 娘の見通し | **今日の4件**(入浴 / 英語の宿題 / 夏休みの宿題 / 水筒) | **消える(ユーザー承認済み)** |

**ゾンビ図鑑の蓄積はゼロ**。ここに蓄積があれば fresh は選べなかった(DR-012 で娘のモチベーションの核と
位置づけたもの)。次回以降のリリースでは**同じ確認を必ず先にやること**。確認コマンドは末尾に記載。

## 実行済み手順(Laravel Cloud ダッシュボード・再実行禁止)

以下は履歴として残す。特に手順3の `migrate:fresh` は再実行しない。

1. Laravel Cloud にログインし、対象アプリ(Singapore リージョンの API)を開く
2. 最新デプロイが **`c1863b2` 以降**のコミットで完了していることを確認する
   (PR #27・#28 がマージ済みであること)
3. **Commands** から次を実行する

   ```
   php artisan migrate:fresh --force
   ```

   `--force` は本番で確認プロンプトを飛ばすために必要。

4. **続けてシードを流す(必須)**

   ```
   php artisan db:seed --force
   ```

   fresh は**シード投入済みのデータも消す**。これを飛ばすと:
   - `/koekake` が空になる(`routine_templates` / `prompt_templates` が消えるため)
   - おしごとのタスク一覧が空になる(`task_definitions`)
   - メンバー(`mother` / `child`)が居なくなり、報酬APIがエラーになる

5. `php artisan migrate:status` で**全マイグレーションがバッチ[1]に揃っている**ことを確認する
6. Render(フロント)側のデプロイが PR #28 を含んで完了していることを確認する

## 確認(curlスモーク)

デプロイ直後はコールドスタートで数十秒かかることがある。1回目がタイムアウトしたら待って再実行。
JSON検証に PowerShell を使うと文字化けすることがあるため `node` を使う。

```bash
API="https://kurashi-relay-production-olnfy0.laravel.cloud"

# 1. 声かけのテンプレートが復元されていること(シード確認・ここが0なら手順4が抜けている)
curl -s "$API/api/koekake/tasks" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);const a=j.data??j.tasks??j;const arr=Array.isArray(a)?a:(a.tasks||[]);console.log('タスク件数:',arr.length)})"

# 2. メンバーが復元されていること(0や error ならシードが抜けている)
curl -s "$API/api/rewards/summary?member=child" | head -c 300
```

期待:

- タスク件数が **22件**(fresh 前と同じ)
- `rewards/summary` が `"status":"success"` を返す(エラーならシード漏れ)

> **`/api/musume/plan` の応答はスキーマ移行の合否判定に使えない**(移行前でも同じ形で返るため)。
> 移行が効いたことの確認は `migrate:status` と、下の実機確認(**書き込み**)で行う。

## 実機確認(娘さんと)

**書き込みが通ることの確認が本番。** ここが今回の核心。

1. `/musume` を夏休みモードで開く(見通しは空から始まる。今日の4件は消えている)
2. 「🔮 明日 なにする?」が「🎒 明日 何がいる?」の**上**に出ているか
3. 選択肢6つ(友達と遊ぶ / ゆっくりする / ママとお出かけ / 塾に行く / 宿題・勉強をする / その他)が
   読みやすいか。**アイコン 🔮 はFableのデザイン判断**なので、娘さんの反応を見て変更してよい
4. チップを選んで「🎀 ママと決めた」で保存 → **エラーにならず**カードに内容と 🎀 が出るか
   → **これが今回の目的。** 移行前はここで落ちていた
5. 学校モードに切り替えると「明日 なにする?」が消えるか(保存済みデータは残る。表示されないだけ)
6. `/koekake` を開き、母側のむすめサマリーに**内容が表示され** 🎀 が添えられているか
   (内容が隠れて「ママと決めた」だけ出ていたら不具合。報告してください)

## トラブル時

- `/koekake` が空 / 報酬APIがエラー → **手順4のシードが流れていない。** `php artisan db:seed --force` を実行
- 「ママと決めた」が保存できない → `migrate:status` でバッチが[1]に揃っているか確認
- `migrate:fresh` は実施済みのため再実行しない。今後の変更は差分 `php artisan migrate --force` を使う
- フロントで型エラー/画面が真っ白 → Render のデプロイが PR #28 を含んでいない可能性。
  デプロイ対象コミットを確認する

## 次回以降のリリースで必ずやること(DR-022)

1. **CREATEマイグレーションをもう書き換えない。** 適用済み環境があるテーブルの変更は必ず差分ALTERで積む。
   今回の fresh が**最後**(DR-013 の方針はここで終了)。
2. **リリース前に `migrate:status` のバッチ番号を見る。** ファイル内容と適用状態の乖離は
   **例外を投げずに**起きる。API応答の目視では検知できない。
3. **破壊的操作の前に実データ量を実測する。** 今回使ったコマンド:

   ```bash
   API="https://kurashi-relay-production-olnfy0.laravel.cloud"
   for M in child mother; do
     curl -s "$API/api/rewards/summary?member=$M"        # lifetime_count / coins / points
     curl -s "$API/api/rewards/collections?member=$M"    # ゾンビ図鑑の蓄積
   done
   curl -s "$API/api/musume/plan"                        # 娘の見通し
   curl -s "$API/api/koekake/tasks"                      # 声かけの使用記録
   ```
