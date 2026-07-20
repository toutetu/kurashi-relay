<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->text('endpoint');
            $table->string('public_key', 191)->nullable();
            $table->string('auth_token', 191)->nullable();
            $table->string('user_agent', 255)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestampTz('last_notified_at')->nullable();
            $table->timestampsTz();

            $table->unique('endpoint', 'push_subscriptions_endpoint_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
