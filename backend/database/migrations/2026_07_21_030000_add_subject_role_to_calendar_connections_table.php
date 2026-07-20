<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('calendar_connections', function (Blueprint $table) {
            $table->string('subject_role', 20)->default('mother')->after('display_name');
        });
    }

    public function down(): void
    {
        Schema::table('calendar_connections', function (Blueprint $table) {
            $table->dropColumn('subject_role');
        });
    }
};
