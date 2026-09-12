<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employees = Employee::query()
            ->select(['id', 'employee_number', 'name', 'first_name', 'last_name', 'department', 'position', 'phone', 'salary', 'bank_name', 'bank_account_name', 'bank_account_number', 'salary_due_day', 'last_paid_at', 'status', 'qr_token'])
            ->orderBy('name')
            ->get();

        return response()->json($employees);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_number' => ['nullable', 'string', 'max:50', 'unique:employees,employee_number'],
            'name' => ['nullable', 'string', 'max:255'],
            'first_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['nullable', 'string', 'max:255'],
            'department' => ['nullable', 'string', 'max:255'],
            'position' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'salary' => ['nullable', 'numeric', 'min:0'],
            'bank_name' => ['nullable', 'string', 'max:255'],
            'bank_account_name' => ['nullable', 'string', 'max:255'],
            'bank_account_number' => ['nullable', 'string', 'max:50'],
            'salary_due_day' => ['nullable', 'integer', 'min:1', 'max:31'],
            'last_paid_at' => ['nullable', 'date'],
            'status' => ['nullable', 'in:active,inactive,suspended'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'photo_path' => ['nullable', 'string', 'max:255'],
        ]);

        $data['employee_number'] = trim((string) ($data['employee_number'] ?? '')) ?: Employee::generateUniqueEmployeeNumber();
        $data['status'] ??= 'active';
        $data['name'] = trim((string) ($data['name'] ?? '')) ?: trim(implode(' ', array_filter([
            $data['first_name'] ?? null,
            $data['last_name'] ?? null,
        ], fn ($value) => $value !== null && $value !== '')));

        if (empty($data['name'])) {
            $data['name'] = $data['employee_number'];
        }

        $employee = Employee::create($data);

        return response()->json($employee, 201);
    }

    public function show(Employee $employee): JsonResponse
    {
        if (empty($employee->qr_token)) {
            $employee->qr_token = Employee::generateUniqueQrToken();
            $employee->qr_generated_at = now();
            $employee->save();
        }

        return response()->json($employee);
    }

    public function update(Request $request, Employee $employee): JsonResponse
    {
        $data = $request->validate([
            'employee_number' => ['sometimes', 'required', 'string', 'max:50', Rule::unique('employees', 'employee_number')->ignore($employee->id)],
            'name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'first_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'department' => ['sometimes', 'nullable', 'string', 'max:255'],
            'position' => ['sometimes', 'nullable', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'salary' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'bank_account_name' => ['sometimes', 'nullable', 'string', 'max:255'],
            'bank_account_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'salary_due_day' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:31'],
            'last_paid_at' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'nullable', 'in:active,inactive,suspended'],
            'user_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'photo_path' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('name', $data) || array_key_exists('first_name', $data) || array_key_exists('last_name', $data)) {
            $data['name'] = trim((string) ($data['name'] ?? '')) ?: trim(implode(' ', array_filter([
                $data['first_name'] ?? $employee->first_name,
                $data['last_name'] ?? $employee->last_name,
            ], fn ($value) => $value !== null && $value !== '')));
        }

        $employee->fill($data);
        $employee->save();

        return response()->json($employee);
    }

    public function destroy(Employee $employee): JsonResponse
    {
        $employee->delete();

        return response()->json(null, 204);
    }

    public function regenerateQr(Employee $employee, Request $request): JsonResponse
    {
        $allowed = false;

        $user = $request->user();
        if ($user && ($user->role ?? null) === 'admin') {
            $allowed = true;
        }

        $adminHeader = $request->header('X-IBMS-ADMIN');
        if (!$allowed && $adminHeader && env('IBMS_ADMIN_KEY') && $adminHeader === env('IBMS_ADMIN_KEY')) {
            $allowed = true;
        }

        if (!$allowed) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $token = $employee->refreshQrToken();

        return response()->json(['qr_token' => $token, 'employee' => $employee]);
    }

    public function generateAllQr(Request $request): JsonResponse
    {
        $user = $request->user();
        $allowed = $user && ($user->role ?? null) === 'admin';
        $adminHeader = $request->header('X-IBMS-ADMIN');
        if (!$allowed && $adminHeader && env('IBMS_ADMIN_KEY') && $adminHeader === env('IBMS_ADMIN_KEY')) {
            $allowed = true;
        }

        if (!$allowed) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $count = 0;
        $employees = Employee::all();
        foreach ($employees as $emp) {
            if (empty($emp->qr_token)) {
                $emp->qr_token = Employee::generateUniqueQrToken();
                $emp->qr_generated_at = now();
                $emp->save();
                $count++;
            }
        }

        return response()->json(['generated' => $count]);
    }
}
