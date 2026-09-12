<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'employee_number',
        'name',
        'first_name',
        'last_name',
        'qr_token',
        'qr_generated_at',
        'photo_path',
        'department',
        'position',
        'phone',
        'salary',
        'bank_name',
        'bank_account_name',
        'bank_account_number',
        'salary_due_day',
        'last_paid_at',
        'status',
    ];

    protected $casts = [
        'qr_generated_at' => 'datetime',
        'last_paid_at' => 'datetime',
        'salary' => 'float',
        'salary_due_day' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $employee) {
            if (empty($employee->employee_number)) {
                $employee->employee_number = self::generateUniqueEmployeeNumber();
            }

            if (empty($employee->qr_token)) {
                $employee->qr_token = self::generateUniqueQrToken();
            }

            if (empty($employee->qr_generated_at)) {
                $employee->qr_generated_at = now();
            }
        });
    }

    public static function generateUniqueEmployeeNumber(): string
    {
        $maxNumber = self::query()
            ->select('employee_number')
            ->get()
            ->map(function ($employee) {
                if (preg_match('/^(?:EMP-|EMP)(\d+)$/i', (string) $employee->employee_number, $matches)) {
                    return (int) $matches[1];
                }

                return 0;
            })
            ->max() ?? 0;

        return 'EMP-' . str_pad((string) ((int) $maxNumber + 1), 3, '0', STR_PAD_LEFT);
    }

    public static function generateUniqueQrToken(): string
    {
        do {
            $token = (string) Str::uuid();
        } while (self::query()->where('qr_token', $token)->exists());

        return $token;
    }

    public function refreshQrToken(): string
    {
        $this->qr_token = self::generateUniqueQrToken();
        $this->qr_generated_at = now();
        $this->save();

        return $this->qr_token;
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function attendances()
    {
        return $this->hasMany(Attendance::class);
    }
}
