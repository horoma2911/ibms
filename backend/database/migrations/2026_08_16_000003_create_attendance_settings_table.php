<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance_settings', function (Blueprint $table) {
            $table->id();
            $table->time('work_start')->nullable();
            $table->time('work_end')->nullable();
            $table->integer('grace_period_minutes')->default(15);
            $table->json('working_days')->nullable();
            $table->timestamps();
        });

        // Insert a sensible default row
        DB::table('attendance_settings')->insert([
            'work_start' => '08:00:00',
            'work_end' => '17:00:00',
            'grace_period_minutes' => 15,
            'working_days' => json_encode(['mon','tue','wed','thu','fri']),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_settings');
    }
};
