<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('activity_events')) {
            return;
        }

        Schema::table('activity_events', function (Blueprint $table) {
            if (Schema::hasColumn('activity_events', 'target_member_id')) {
                $table->dropForeign(['target_member_id']);
                $table->dropColumn('target_member_id');
            }

            if (Schema::hasColumn('activity_events', 'supporter_member_id')) {
                $table->dropForeign(['supporter_member_id']);
                $table->dropColumn('supporter_member_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('activity_events', function (Blueprint $table) {
            if (! Schema::hasColumn('activity_events', 'target_member_id')) {
                $table->foreignId('target_member_id')
                    ->nullable()
                    ->constrained('family_members')
                    ->restrictOnDelete();
            }

            if (! Schema::hasColumn('activity_events', 'supporter_member_id')) {
                $table->foreignId('supporter_member_id')
                    ->nullable()
                    ->constrained('family_members')
                    ->restrictOnDelete();
            }
        });
    }
};
