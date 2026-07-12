# くらしリレー
## データモデル設計 v0.2
### Laravel向け概要

第1実装ではDBへ保存しない。
Laravel側のダミーデータとTypeScript型は、
将来の以下のデータモデルに沿って作る。

# 1. households

家庭単位。

- id
- name
- timezone
- created_at
- updated_at

# 2. people

母・娘など記録対象者。

- id
- household_id
- role: mother | daughter
- display_name
- is_active

# 3. users

Laravelの認証ユーザー。
第2実装以降。

- id
- household_id
- person_id
- role: owner | caregiver | viewer
- name
- email

# 4. stakeholders

家族・学校・支援機関。

- id
- household_id
- type
- name
- organization_name
- contact_note
- is_active

# 5. plans

予定。

- id
- household_id
- person_id
- source_type: google | manual
- external_calendar_id
- external_event_id
- title
- category
- planned_start_at
- planned_end_at
- is_all_day
- location
- description
- status

# 6. time_entries

実際の時間。

- id
- household_id
- person_id
- kind: sleep | activity | waiting | recovery
- category
- title
- started_at
- ended_at
- status: running | paused | completed
- source_type: timer | manual | calendar
- related_plan_id
- note
- enjoyment_score
- recovery_effect_score
- obligation_score

同一人物の通常活動は原則1件。
待機・拘束は活動と並行する場合がある。

# 7. support_events

娘への支援。

- id
- household_id
- child_person_id
- type
- performed_by_person_id
- performed_by_stakeholder_id
- record_mode: instant | timed
- occurred_at
- started_at
- ended_at
- count
- result
- related_plan_id
- note

支援例：

- 起床の声かけ
- 着替えの声かけ
- 学校への連絡
- 腹痛対応
- 服薬の声かけ
- 持ち物確認
- 自転車送迎
- 校内付き添い
- 引き渡し確認
- 夜の聞き取り

# 8. condition_logs

母・娘の体調と気分。

- id
- household_id
- person_id
- physical_score
- mood_score
- input_source:
  - self
  - guardian_confirmed
  - guardian_observation
- comment
- recorded_at
- created_by

# 9. child_daily_plans

娘の希望・今日の作戦。

- id
- household_id
- child_person_id
- plan_date
- desired_outcome
- first_step
- requested_supports
- fallback_plans
- confidence
- input_source
- daily_note
- reflection
- reflection_note

# 10. child_need_records

情報源を混同しない。

- id
- household_id
- child_person_id
- record_type:
  - child_statement
  - mother_observation
  - mother_inference
  - supporter_interview
- category
- content
- source_person_id
- source_stakeholder_id
- occurred_on
- sensitivity_level
- recorded_at

# 11. schedule_impacts

予定と実績の差。

- id
- household_id
- affected_plan_id
- impact_type:
  - delayed
  - shortened
  - interrupted
  - cancelled
  - postponed
  - moved_to_night
  - changed_to_support
  - changed_to_recovery
- cause_type
- cause_id
- lost_minutes
- interruption_count
- actual_return_at
- concentration_level
- carryover_type
- note

# 12. support_handoffs

支援の役割移管。

- id
- household_id
- child_person_id
- from_person_id
- to_stakeholder_id
- support_scope
- valid_from
- valid_until
- target_time
- conditions
- prohibited_actions
- completion_condition
- fallback_procedure
- status

# 13. support_executions

移管された支援の実施結果。

- id
- household_id
- handoff_id
- execution_date
- performed_by_stakeholder_id
- started_at
- ended_at
- status
- conditions_followed
- returned_to_mother
- returned_reason
- completion_confirmed
- child_willingness_after
- note

# 14. action_items

次のアクション。

- id
- household_id
- title
- description
- assignee_person_id
- assignee_stakeholder_id
- due_at
- priority
- status
- recoordination_owner
- source_type
- source_id
- completed_at
- note

# 15. game_progress

本人向けゲーム進捗。

- id
- household_id
- person_id
- game_name
- progress_date
- planned_tasks
- completed_tasks
- play_minutes
- enjoyment_score
- recovery_effect_score
- obligation_score
- next_action
- note

# 16. report_exports

将来の支援者別共有。

元データを直接公開せず、
共有時点のスナップショットを保存する。

- id
- household_id
- report_type
- period_start
- period_end
- included_sections
- excluded_sections
- report_snapshot
- generated_by
- generated_at

# 17. Laravel実装方針

第2実装以降：

- UUIDまたはULIDを統一して使用
- Eloquent Model
- Migration
- Factory
- Seeder
- Policy
- Form Request
- API Resource
- 論理削除が必要な記録を明示
- household_idによるデータ分離
- 外部キーの削除動作を明示
- スコア値と日時整合性に制約
