<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reward_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->foreignId('activity_event_id')
                ->nullable()
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->foreignId('reward_rule_id')
                ->nullable()
                ->constrained('reward_rules')
                ->restrictOnDelete();
            $table->string('transaction_type', 20);
            $table->string('kind', 20);
            $table->integer('amount');
            $table->timestampTz('occurred_at');
            $table->string('idempotency_key', 64);
            $table->foreignId('reverses_transaction_id')
                ->nullable()
                ->constrained('reward_transactions')
                ->restrictOnDelete();
            $table->string('reason', 200)->nullable();
            $table->timestampsTz();

            $table->unique('idempotency_key', 'reward_transactions_idempotency_key_unique');
            $table->index(['member_id', 'occurred_at']);
        });

        MigrationConstraintHelper::addCheck(
            'reward_transactions',
            'reward_transactions_transaction_type_check',
            "transaction_type IN ('earn', 'adjustment', 'reversal')",
        );
        MigrationConstraintHelper::addCheck(
            'reward_transactions',
            'reward_transactions_kind_check',
            "kind IN ('gauge', 'coin', 'point')",
        );
        MigrationConstraintHelper::addCheck(
            'reward_transactions',
            'reward_transactions_amount_check',
            'amount <> 0',
        );

        MigrationConstraintHelper::createPartialUniqueIndex(
            'reward_transactions_event_rule_type_unique',
            'reward_transactions',
            'activity_event_id, reward_rule_id, transaction_type',
            'activity_event_id IS NOT NULL AND reward_rule_id IS NOT NULL',
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropIndexIfExists('reward_transactions_event_rule_type_unique');
        MigrationConstraintHelper::dropCheck('reward_transactions', 'reward_transactions_amount_check');
        MigrationConstraintHelper::dropCheck('reward_transactions', 'reward_transactions_kind_check');
        MigrationConstraintHelper::dropCheck('reward_transactions', 'reward_transactions_transaction_type_check');

        Schema::dropIfExists('reward_transactions');
    }
};
