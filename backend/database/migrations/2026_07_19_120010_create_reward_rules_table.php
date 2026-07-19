<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reward_rules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_definition_id')
                ->nullable()
                ->constrained('activity_definitions')
                ->restrictOnDelete();
            $table->foreignId('member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->string('reward_kind', 20);
            $table->integer('amount');
            $table->timestampTz('valid_from')->nullable();
            $table->timestampTz('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampsTz();

            $table->index(['member_id', 'is_active']);
        });

        MigrationConstraintHelper::addCheck(
            'reward_rules',
            'reward_rules_reward_kind_check',
            "reward_kind IN ('gauge', 'coin', 'point', 'collection')",
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('reward_rules', 'reward_rules_reward_kind_check');

        Schema::dropIfExists('reward_rules');
    }
};
