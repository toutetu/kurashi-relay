# Codexレビュー報告: records-view（記録を見る画面）

- 実施日: 2026-07-17
- 対象ブランチ: `feat/records-view-web`
- 対象: レビュー依頼書で指定された frontend 配下の未コミット差分
- 実施内容: 品質ゲート、スペック適合確認、コードレビュー

## 1. 品質ゲート

判定: **4項目すべて合格**

| 項目 | 結果 | コマンド出力の要約 |
|---|---|---|
| lint | 合格 | `npm.cmd run lint` → `eslint .`、終了コード0、指摘なし |
| typecheck | 合格 | `npm.cmd run typecheck` → `tsc -b --pretty false`、終了コード0、型エラーなし |
| test | 合格 | `npm.cmd run test` → Vitest、テストファイル6件・テスト32件すべて成功 |
| build | 合格 | `npm.cmd run build` → `tsc -b && vite build`、1,974 modules transformed、production build成功 |

補足: PowerShellからの最初の `npm run lint` は、端末の実行ポリシーが `npm.ps1` の起動を拒否したため実行できなかった。同じnpm CLIのWindows実行ファイルである `npm.cmd` に切り替えて4項目を実行し、すべて正常終了した。これはコードまたは品質ゲート自体の失敗ではない。

## 2. スペック適合

### `/records` ルートとPlaceholder削除

**合格**

- `frontend/src/App.tsx` の `/records` は `RecordsPage` に差し替えられている。
- `frontend/src/pages/PlaceholderPage.tsx` から `records` エントリと不要になったアイコンimportが削除されている。
- AppShell側の既存ナビ導線は変更されていない。

### 日付ナビ

**合格**

- 初期日は `getTokyoToday()` によるAsia/Tokyoの当日。
- 「前の日」「次の日」「きょうへもどる」が実装されている。
- 当日は「次の日」がdisabledになり、未来日へ進めない。
- 日付変更時はchild/mother双方のAPIクエリへ選択日が渡る。
- `shiftTokyoDate` はAsia/Tokyoの正午を基準に日数を移動するため、月跨ぎ・年跨ぎ・うるう日を正しく扱う。追加確認では `2026-07-01 - 1日 = 2026-06-30`、`2026-12-31 + 1日 = 2027-01-01`、`2028-03-01 - 1日 = 2028-02-29` を確認した。
- `isTokyoDateAfter` の文字列比較は、内部で一貫して使うゼロ埋め `YYYY-MM-DD` 形式では時系列比較として正しい。

### 娘・母の2セクション、0回表示、合計行

**合格**

- childとmotherを別々の `MemberRecordsSection` として表示している。
- 全タスクを行として表示し、`count === 0` の行はmutedトークンと弱いウェイトで薄くしている。
- 各セクション末尾に `summary.today_done_count` を使った「この日ぜんぶで ×N」を表示している。
- 色だけに依存せず、0回という数値も表示している。

### 閲覧専用

**合格**

- records機能から呼び出しているのはGET用の `getTasks` のみ。
- 記録追加・編集・取消のmutationや操作UIは存在しない。

### 片方のmemberだけ失敗した場合

**合格**

- child/motherはそれぞれ独立したReact Queryと表示状態を持つ。
- 一方がエラーでも、もう一方の成功表示は維持される。
- エラー側だけに、責めない文言と再試行ボタンが表示される。

### スペック§6のテスト4ケース

**合格**

`frontend/src/features/records/RecordsPage.test.tsx` に以下の4ケースが実在し、品質ゲートでも成功した。

1. 日付ナビでAPIの`date`クエリが変わる
2. 0回の行を薄く表示する
3. 未来日には進めない
4. エラー時に再試行できる

テスト内容は各要件を実際のルート描画、fetch、利用者操作を通して確認しており、基本的に妥当。

## 3. コードレビュー

### 指定観点の確認

- `shiftTokyoDate` / `isTokyoDateAfter`: **問題なし**。Asia/Tokyo固定、月跨ぎ、年跨ぎ、うるう日の動作を確認した。
- `count` / `last_record_id` のスキーマ追加: **問題なし**。現行バックエンドのタスク応答に両フィールドがあり、既存 `/oshigoto` のトグルが使う `done` / `record_id` も残されている。既存テストfixtureも更新済みで、既存テストを含む全32件が成功した。
- React Queryキー: **衝突なし**。既存は `["tasks", member]`、recordsは `["tasks", member, date]` で別キャッシュになる。既存mutationのprefix invalidation対象にはなるが、データを同一キーとして上書きする構造ではない。
- 型: **明確な穴なし**。`Member`、`ApiTask`、Zodスキーマを再利用し、`any`は追加されていない。
- アクセシビリティ: **明確な問題なし**。日付ナビのラベル、44px相当の操作領域、disabled、status/alert、セクション名、回数のaria-labelが用意されている。

### 指摘事項

#### 重大

なし。

#### 中

なし。

#### 軽微

1. `frontend/src/features/records/RecordsPage.test.tsx` の111行目・151行目は、child/mother双方に同じ「あいさつする」を返しながら、画面全体へ未スコープの `findByText("あいさつする")` を使っている。今回の実行は成功したが、両クエリの描画タイミングによっては複数一致で不安定になり得る。memberセクション内へ `within(...)` でスコープするか、`findAllByText` を使うと堅牢になる。製品コードの動作には影響せず、マージを妨げる指摘ではない。

## 4. 総合判定

**マージ可**

品質ゲートはすべて合格し、指定された画面仕様と主要な互換性・境界条件を満たしている。軽微なテストの堅牢性改善は推奨するが、実装を止める問題はない。
