# Codex再レビュー依頼: 夏休み対応 バックエンド(`feat/musume-summer-backend`)

あなた(Codex)への**再**レビュー依頼です。**実装・修正はせず、読んで判定して報告だけ**してください。

## 経緯

前回のあなたのレビューで Must fix 2件を検出しました。それを修正した状態の再確認です。

1. `{"wake_up_time": null, "start_decided_with": "mama"}` の不整合
   → 「決定内容が無いなら決め方も無い」の不変条件を `MusumePlanService` に追加した
2. `assertJsonPath(..., null)` がキー欠落でも合格する件
   → `AssertableJson::has()` でキー存在を検証する形に改めた

## レビュー対象

```
git diff main...feat/musume-summer-backend -- backend/
```

**特に直近の修正コミット**(`fix(musume): 決定内容が無いときに決め方が残る不整合を修正`)を重点的に。

## 正とする仕様

- `docs/wip/musume-summer/musume-summer-spec.md` の **§4-2「不変条件: 決定内容が無いなら決め方も無い」**
  (今回追記した節。ここが今回の修正の正)
- `docs/design-decisions.md` の **DR-021**

## 見てほしい点

### A. Must fix 1 が本当に塞がったか

1. 前回あなたが再現した `{"wake_up_time": null, "start_decided_with": "mama"}` が
   **もう作れないこと**を実際に確認してください。
2. 不変条件がスペックどおり「**更新後の** mode」を基準にしているか。
   更新前の mode を見ていると、mode と start 値を同一リクエストで同時変更したときに破綻します。
3. **抜け道が残っていないか**。`updatePlan` 以外の経路(plan の自動生成 `ensurePlan` 系、
   `replaceItems`、`completeReflection`)から `start_decided_with` が
   不整合な状態になれないか確認してください。
4. モード切替の往復(school → summer → school)で値が意図せず復活したり、
   逆に消してはいけない `wake_up_time` / `school_start_period` まで消えていないか。

### B. Must fix 2 が本当に塞がったか

5. 追加・修正されたテストが**実際に落ちる条件を持っているか**。
   試しに実装側を一時的に壊せば落ちるはずのテストになっているか、論理的に確認してください。
   (実際に壊す必要はありません。読んで判断してください)
6. `AssertableJson` へ置き換えた箇所で、**検証の範囲が前より狭まっていないか**。
7. `items.tomorrow_plan` と `summary.decided_with` の4キーについて、
   キー存在の検証が効いているか。

### C. 全体の再確認(前回OKだった箇所の退行チェック)

8. 前回「実装上は適合」とした トランザクション境界・`lockForUpdate`・
   サマリーの先頭行採用 が、今回の修正で壊れていないか。
9. `php artisan test` が全緑か(69件)。pint 適用済みか。
10. DR-021 の狙い(質問カードを増やしてもカラムが増えない形)が保たれているか。

## 報告の形式

- **判定**: マージ可 / 要修正
- **Must fix**: 残っていれば ファイル:行 と理由
- **Should fix** / **Nits**
- **前回指摘2件の解消状況**: それぞれ 解消 / 未解消 / 部分的

## 前提

- 実運用開始前でDBは破棄・再作成してよい(DR-013)。データ移行は考慮不要。
- 認証は入れない(DR-007)。
- **フロントの型はこのPRでは意図的に壊れている。フロントの不整合は指摘不要。**
