<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_connections', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 30)->default('google');
            $table->string('external_calendar_id', 191)->nullable();
            $table->string('provider_account_id', 191)->nullable();
            $table->string('display_name', 120);
            $table->string('timezone', 64)->default('Asia/Tokyo');
            $table->text('refresh_token_encrypted')->nullable();
            $table->text('sync_token_encrypted')->nullable();
            $table->timestampTz('token_expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('last_synced_at')->nullable();
            $table->timestampsTz();

            $table->unique(['provider', 'external_calendar_id'], 'calendar_connections_provider_external_unique');
        });

        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_connection_id')
                ->constrained('calendar_connections')
                ->restrictOnDelete();
            $table->string('external_event_id', 191);
            $table->timestampsTz();

            $table->unique(
                ['calendar_connection_id', 'external_event_id'],
                'calendar_events_connection_external_unique',
            );
        });

        Schema::create('calendar_event_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('calendar_event_id')
                ->constrained('calendar_events')
                ->restrictOnDelete();
            $table->unsignedInteger('version_no');
            $table->timestampTz('provider_updated_at')->nullable();
            $table->string('status', 30)->default('confirmed');
            $table->string('title', 200);
            $table->timestampTz('start_at')->nullable();
            $table->timestampTz('end_at')->nullable();
            $table->boolean('is_all_day')->default(false);
            $table->string('location', 200)->nullable();
            $table->text('description')->nullable();
            $table->json('raw_payload')->nullable();
            $table->timestampTz('imported_at');

            $table->unique(['calendar_event_id', 'version_no'], 'calendar_event_versions_event_version_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_event_versions');
        Schema::dropIfExists('calendar_events');
        Schema::dropIfExists('calendar_connections');
    }
};
