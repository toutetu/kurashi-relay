# Codexレビュー依頼: K1 声かけリマインダー バックエンド

あなた(Codex)はコードレビュー/セカンドオピニオン担当です。Cursorが実装した K1 バックエンドを
**独立レビュー**し、品質ゲートを**自分で再実行**して合否を報告してください。

## 対象

- ブランチ: `feat/koekake-backend`(未コミット。作業ツリーの変更を対象にレビュー)
- スペック(唯一の正): `docs/wip/koekake-k1/koekake-k1-spec.md` の「バックエンド(PR1)」章 §2〜§6
- Cursorの実装ファイルは backend/ 配下(migrations 6 / models 6 / seeders / Services/Koekake / Controllers/Api/Koekake / Requests/Koekake / tests/Feature/Api/Koekake)

## やること

### 1. 品質ゲートの再実行(必ず自分で実行し結果を貼る)

```
cd backend
php artisan migrate:fresh --seed
php artisan test
./vendor/bin/pint --test
```

各コマンドの pass/fail・テスト件数・assertion数を報告に貼る。落ちたら原因を特定し報告(直すかどうかはFableが判断するので、勝手に大改修しない。1〜数行の明白なバグ修正は可)。

### 2. スペック適合レビュー(重点)

- **API契約 §4 との一致**: エンドポイント・HTTPメソッド・リクエスト/レスポンス項目・ステータスコード。
  特に:
  - `POST /prompt-events` の冪等(同一 idempotency_key 再送で 200・行が増えない・同一内容)
  - `DELETE /prompt-events/{id}` が当日のみ取消(過去日 422)・cancelled_at で論理削除・キャッシュ再計算
  - `GET /tasks` の遅延生成が `unique(task_date, routine_template_id)` を衝突ガードにしていて並行安全か
    (insertOrIgnore / upsert 等。二重生成しないか)
  - `PATCH /completion` の upsert(1タスク1行)・完了系statusで scheduled リマインダーを cancel
  - `POST /snooze` の排他バリデーション(minutes / remind_at / none_today のいずれか1つ・複数指定422)
  - 書き込み系がトランザクション+行ロックで、レスポンスにサーバ集計値(prompt_count / latest_prompt_at)を返すか
    (DR-008/DR-010: フロントはサーバ値で上書きする前提)
- **suggested_prompt のレベル選択**: level = min(prompt_count+1, 3)、該当level無ければ下位levelへフォールバック。
- **キャッシュの正当性**: `daily_tasks.prompt_count / latest_prompt_at` が「非キャンセル prompt_events の集計」から
  常に復元可能か(正本は prompt_events)。

### 3. シードの文言監査(重要・自動テストだけに頼らず目視も)

- `KoekakeSeeder` のルーチン22本(phase/sort/name/icon/activity_key/daily_limit/default_time/
  parent_prompt_label/child_label/quick_label)が**スペック§3-2の表と一字一句一致**しているか。
  特に activity_key の割り当て(ACT-037〜045 の新規発行分含む)。
- prompt_templates の全22ルーチン×level1〜3 の文言がスペック§3-2の声かけ文テーブルと**一字一句一致**か。
- **FR-M10 禁止表現7語**(何回言ったら分かるの/まだできていない/約束を守って/ママが困る/ちゃんとしなさい/
  明日行くって言ったでしょ/できないと困るよ)が prompt_templates.text と parent_prompt_label に
  含まれないこと(ガバナンステストが実在し機能しているかも確認)。

### 4. 既存への影響

- 既存の oshigoto/mamakaji のテーブル・モデル・API・テストに**実質的な変更が無い**こと。
- Cursorが `backend/tests/Feature/Api/OshigotoPersistenceTest.php` の
  マイグレーション件数を 6→12 に変更している。これが**件数更新のみの妥当な変更**か
  (テストの意図を壊していないか)を確認。
- スペックは Pest を指定していたが、プロジェクトに Pest 未導入のため PHPUnit で実装されている。
  **既存テストと同じ枠組み(PHPUnit)を踏襲している判断は妥当**。テスト自体がスペック§5の1〜9を
  網羅しているかを内容で確認する(枠組みの違いは指摘不要)。

## 報告フォーマット

1. ゲート3種の実行結果(件数付き)
2. 重大(マージ前に直すべき) / 軽微(後で可) / 指摘なし、の3分類で所見
3. シード文言・FR-M10 の監査結果(一致/不一致の具体箇所)
4. マージ可否の総合判断

コミット・pushはしない。レポートのみ。
