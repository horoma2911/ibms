<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\AttendanceSetting;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Http\JsonResponse;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function scan(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'device_id' => ['nullable', 'string'],
        ]);

        $employee = Employee::where('qr_token', $data['token'])->first();
        if (!$employee) {
            return response()->json(['message' => 'Employee not found'], 404);
        }

        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('employee_id', $employee->id)->whereDate('date', $today)->first();

        $now = Carbon::now();

        $setting = AttendanceSetting::first();
        $workStart = $setting?->work_start ? Carbon::createFromFormat('H:i:s', $setting->work_start)->setDate($now->year, $now->month, $now->day) : null;
        $grace = $setting?->grace_period_minutes ?? 15;

        if (!$attendance) {
            // Record check-in
            $attendance = Attendance::create([
                'employee_id' => $employee->id,
                'date' => $today,
                'check_in_time' => $now,
                'device_id' => $data['device_id'] ?? null,
                'status' => 'checked_in',
            ]);

            // Determine late minutes
            if ($workStart && $now->greaterThan($workStart->copy()->addMinutes($grace))) {
                $late = $now->diffInMinutes($workStart);
                $attendance->late_minutes = $late;
                $attendance->status = 'late';
                $attendance->save();
            }

            // audit log
            DB::table('attendance_audits')->insert([
                'attendance_id' => $attendance->id,
                'employee_id' => $employee->id,
                'action' => 'check_in',
                'meta' => json_encode(['ip' => $request->ip()]),
                'device_id' => $data['device_id'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'status' => 'check_in',
                'message' => 'Check-in successful',
                'employee' => $employee,
                'attendance' => $attendance,
            ]);
        }

        if ($attendance->check_in_time && !$attendance->check_out_time) {
            // Record check-out
            $attendance->check_out_time = $now;
            // compute working minutes if possible
            if ($attendance->check_in_time) {
                $attendance->working_minutes = Carbon::parse($attendance->check_in_time)->diffInMinutes($now);
            }
            $attendance->status = 'checked_out';
            $attendance->device_id = $data['device_id'] ?? $attendance->device_id;
            $attendance->save();

            DB::table('attendance_audits')->insert([
                'attendance_id' => $attendance->id,
                'employee_id' => $employee->id,
                'action' => 'check_out',
                'meta' => json_encode(['ip' => $request->ip(), 'working_minutes' => $attendance->working_minutes]),
                'device_id' => $data['device_id'] ?? null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            return response()->json([
                'status' => 'check_out',
                'message' => 'Check-out successful',
                'employee' => $employee,
                'attendance' => $attendance,
            ]);
        }

        return response()->json(['message' => 'Attendance already completed for today'], 422);
    }

    public function index(Request $request): JsonResponse
    {
        // Only allow admin/HR roles to access attendance listing
        $user = $request->user();
        $allowed = false;
        if ($user && in_array($user->role ?? null, ['admin', 'hr', 'manager'])) {
            $allowed = true;
        }
        $adminHeader = $request->header('X-IBMS-ADMIN');
        if (!$allowed && $adminHeader && env('IBMS_ADMIN_KEY') && $adminHeader === env('IBMS_ADMIN_KEY')) {
            $allowed = true;
        }
        if (!$allowed) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $query = Attendance::with('employee');

        if ($request->filled('date')) {
            $query->whereDate('date', $request->string('date'));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $perPage = $request->integer('per_page') ?: 25;

        return response()->json($query->orderBy('date', 'desc')->paginate($perPage));
    }

    public function show(Attendance $attendance): JsonResponse
    {
        return response()->json($attendance->load('employee'));
    }
}
