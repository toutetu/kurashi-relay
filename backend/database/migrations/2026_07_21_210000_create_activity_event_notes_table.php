<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_event_notes', function (Blueprint $table) {
            $table->foreignId('activity_event_id')
                ->primary()
                ->constrained('activity_events')
                ->restrictOnDelete();
            $table->text('note');
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_event_notes');
    }
};
