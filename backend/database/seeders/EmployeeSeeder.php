<?php

namespace Database\Seeders;

use App\Models\Employee;
use Illuminate\Database\Seeder;

class EmployeeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $employees = [
            [
                'employee_number' => 'EMP-001',
                'first_name' => 'Amina',
                'last_name' => 'Kiptoo',
                'department' => 'Operations',
                'position' => 'Operations Lead',
                'phone' => '+254700100101',
                'salary' => 95000,
                'status' => 'active',
            ],
            [
                'employee_number' => 'EMP-002',
                'first_name' => 'Daniel',
                'last_name' => 'Njoroge',
                'department' => 'Finance',
                'position' => 'Accountant',
                'phone' => '+254700100102',
                'salary' => 88000,
                'status' => 'active',
            ],
            [
                'employee_number' => 'EMP-003',
                'first_name' => 'Grace',
                'last_name' => 'Muiruri',
                'department' => 'Logistics',
                'position' => 'Warehouse Supervisor',
                'phone' => '+254700100103',
                'salary' => 82000,
                'status' => 'active',
            ],
            [
                'employee_number' => 'EMP-004',
                'first_name' => 'Joseph',
                'last_name' => 'Kiboi',
                'department' => 'Human Resources',
                'position' => 'HR Officer',
                'phone' => '+254700100104',
                'salary' => 76000,
                'status' => 'inactive',
            ],
        ];

        foreach ($employees as $employee) {
            $employee['name'] = trim($employee['first_name'] . ' ' . $employee['last_name']);

            $record = Employee::updateOrCreate(
                ['employee_number' => $employee['employee_number']],
                $employee
            );

            if (empty($record->qr_token)) {
                $record->refreshQrToken();
            }
        }
    }
}
