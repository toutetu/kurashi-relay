<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_handovers', function (Blueprint $table) {
            $table->id();
            $table->string('title', 120);
            $table->string('assignee_label', 80);
            $table->text('conditions_text');
            $table->text('completion_criteria');
            $table->text('result_text')->nullable();
            $table->timestampTz('returned_to_mother_at')->nullable();
            $table->string('status', 20)->default('open');
            $table->string('source_kind', 40);
            $table->timestampTz('due_at')->nullable();
            $table->date('local_date')->nullable();
            $table->foreignId('recorded_by_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->timestampTz('cancelled_at')->nullable();
            $table->timestampsTz();

            $table->index(['status', 'local_date']);
        });

        MigrationConstraintHelper::addCheck(
            'support_handovers',
            'support_handovers_status_check',
            "status IN ('open', 'in_progress', 'done', 'returned')",
        );
        MigrationConstraintHelper::addCheck(
            'support_handovers',
            'support_handovers_source_check',
            "source_kind IN ('child_statement', 'mother_confirmed', 'mother_observation', 'mother_assumption')",
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('support_handovers', 'support_handovers_source_check');
        MigrationConstraintHelper::dropCheck('support_handovers', 'support_handovers_status_check');
        Schema::dropIfExists('support_handovers');
    }
};
