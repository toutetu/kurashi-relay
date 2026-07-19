<?php

use Database\Support\MigrationConstraintHelper;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_event_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('activity_event_id')
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->foreignId('family_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->string('role', 20);
            $table->timestampsTz();

            $table->unique(
                ['activity_event_id', 'family_member_id', 'role'],
                'activity_event_participants_event_member_role_unique',
            );
            $table->index(['family_member_id', 'role']);
        });

        MigrationConstraintHelper::addCheck(
            'activity_event_participants',
            'activity_event_participants_role_check',
            "role IN ('actor', 'supporter', 'target')",
        );
    }

    public function down(): void
    {
        MigrationConstraintHelper::dropCheck('activity_event_participants', 'activity_event_participants_role_check');

        Schema::dropIfExists('activity_event_participants');
    }
};
