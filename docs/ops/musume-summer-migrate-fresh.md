# 手順書: 夏休み対応リリース時の `migrate:fresh`(2026-07-18)

対象リリース: PR #27(バックエンド)+ PR #28(フロント)。DR-021 の決定を反映したもの。

## なぜ `migrate:fresh` が必要か

DR-013 の方針どおり、**新規マイグレーションを足さず既存のCREATEマイグレーションを書き換えた**ため、
既に作成済みのテーブルには変更が反映されない。テーブルを作り直す必要がある。

書き換えた内容:

- `daily_plans` から `today_state` / `tomorrow_items_state` / `start_state` を**削除**
- `daily_plans` に `start_decided_with` を追加
- `plan_items` に `decided_with` を追加

**実運用開始前なのでデータは消えて問題ない**(ユーザー確認済み)。

## 前提の確認

実行前に、消えて困るデータが無いことを確認する。娘用ホーム(`/musume`)・声かけ(`/koekake`)の
記録は**すべて消える**。おしごとのポイント記録も同じDBなので消える。

> まだ運用を開始していないので消えて問題ない、という判断でこの手順を用意している。
> もし既に記録を入れてしまっていたら、**実行前に相談してください**。

## 手順(Laravel Cloud ダッシュボード)

1. Laravel Cloud にログインし、対象アプリ(Singapore リージョンの API)を開く
2. デプロイが PR #27・#28 のマージ後のコミットで完了していることを確認する
   - 最新デプロイのコミットハッシュが `c1863b2`(またはそれ以降)であること
3. **Commands**(またはコンソール)から次を実行する

   ```
   php artisan migrate:fresh --force
   ```

   `--force` は本番環境で確認プロンプトを飛ばすために必要。
4. 続けてシードを流す

   ```
   php artisan db:seed --force
   ```

   声かけのルーチンテンプレート(`routine_templates` / `prompt_templates`)が入る。
   これが無いと `/koekake` が空になる。
5. 完了したら Render(フロント)側のデプロイも完了していることを確認する

## 確認(curlスモーク)

デプロイ直後はコールドスタートで数十秒かかることがある。1回目がタイムアウトしたら少し待って再実行する。

```bash
# 1. プランが取得でき、tomorrow_plan キーが存在すること
curl -s "https://<API_HOST>/api/musume/plan" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log('items keys:',Object.keys(j.plan.items));console.log('start_decided_with:',j.plan.start_decided_with)})"

# 2. 母用サマリーに decided_with の4キーが出ること
curl -s "https://<API_HOST>/api/koekake/musume-summary" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);console.log(j.summary ? Object.keys(j.summary.decided_with) : 'summary is null (プラン未作成なら正常)')})"
```

期待:

- `items keys` に `today_task` / `tomorrow_plan` / `tomorrow_item` / `memo` の4つが出る
- `decided_with` に `today` / `tomorrow_plan` / `tomorrow_item` / `start` の4キーが出る

> JSON検証に PowerShell を使うと文字化けすることがあるため `node` を使う。

## 実機確認(娘さんと)

1. `/musume` を夏休みモードで開く
2. 「🔮 明日 なにする?」が「🎒 明日 何がいる?」の**上**に出ているか
3. 選択肢6つ(友達と遊ぶ / ゆっくりする / ママとお出かけ / 塾に行く / 宿題・勉強をする / その他)が
   読みやすいか。**アイコン 🔮 はFableのデザイン判断**なので、娘さんの反応を見て変更してよい
4. チップを選んで「🎀 ママと決めた」で保存 → カードに内容と 🎀 が出るか
5. 学校モードに切り替えると「明日 なにする?」が消えるか(保存済みデータは残る。表示されないだけ)
6. `/koekake` を開き、母側のむすめサマリーに**内容が表示され** 🎀 が添えられているか
   (内容が隠れて「ママと決めた」だけ出ていたら不具合。報告してください)

## トラブル時

- `migrate:fresh` が権限エラーで落ちる → Laravel Cloud のDB接続設定を確認
- `/koekake` が空 → 手順4のシードが流れていない
- フロントで型エラー/画面が真っ白 → Render のデプロイが PR #28 を含んでいない可能性。
  デプロイ対象コミットを確認する
