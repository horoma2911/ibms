<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AttendanceSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_start',
        'work_end',
        'grace_period_minutes',
        'working_days',
    ];

    protected $casts = [
        'working_days' => 'array',
    ];
}
