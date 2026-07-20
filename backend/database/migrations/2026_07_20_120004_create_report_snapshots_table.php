<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_snapshots', function (Blueprint $table) {
            $table->id();
            $table->string('audience', 30);
            $table->date('period_start');
            $table->date('period_end');
            $table->string('title', 120);
            $table->json('payload');
            $table->boolean('excludes_last_war')->default(true);
            $table->foreignId('created_by_member_id')
                ->constrained('family_members')
                ->restrictOnDelete();
            $table->timestampTz('revoked_at')->nullable();
            $table->string('share_token', 64)->nullable()->unique();
            $table->timestampTz('share_expires_at')->nullable();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_snapshots');
    }
};
