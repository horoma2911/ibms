<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmployeeQrTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_qr_tokens_are_unique_and_generated_on_create(): void
    {
        $first = Employee::create([
            'user_id' => null,
            'employee_number' => 'EMP-1001',
            'department' => 'Operations',
            'position' => 'Supervisor',
            'phone' => '+254700000001',
            'status' => 'active',
        ]);

        $second = Employee::create([
            'user_id' => null,
            'employee_number' => 'EMP-1002',
            'department' => 'Finance',
            'position' => 'Accountant',
            'phone' => '+254700000002',
            'status' => 'active',
        ]);

        $this->assertNotNull($first->qr_token);
        $this->assertNotNull($second->qr_token);
        $this->assertNotSame($first->qr_token, $second->qr_token);
    }

    public function test_admin_can_register_employee_and_generate_qr_token(): void
    {
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'password' => 'Password123!',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/employees', [
            'employee_number' => 'EMP-2001',
            'first_name' => 'Alice',
            'last_name' => 'Ngoma',
            'department' => 'Operations',
            'position' => 'Supervisor',
            'phone' => '+254700000003',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'id',
                'employee_number',
                'qr_token',
                'department',
                'position',
                'phone',
                'status',
            ]);

        $this->assertNotNull($response->json('qr_token'));
        $this->assertDatabaseHas('employees', [
            'employee_number' => 'EMP-2001',
        ]);
    }

    public function test_employee_number_is_generated_when_missing(): void
    {
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin2@example.com',
            'role' => 'admin',
            'password' => 'Password123!',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/employees', [
            'first_name' => 'Bob',
            'last_name' => 'Mwangi',
            'department' => 'Operations',
            'position' => 'Supervisor',
            'phone' => '+254700000004',
            'status' => 'active',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('employee_number', $response->json('employee_number'));

        $this->assertMatchesRegularExpression('/^EMP-\d+$/', $response->json('employee_number'));
        $this->assertNotNull($response->json('qr_token'));
    }

    public function test_employee_salary_is_saved(): void
    {
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin3@example.com',
            'role' => 'admin',
            'password' => 'Password123!',
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/employees', [
            'employee_number' => 'EMP-1005',
            'first_name' => 'Cynthia',
            'last_name' => 'Kariuki',
            'department' => 'Finance',
            'position' => 'Accountant',
            'phone' => '+254700000005',
            'status' => 'active',
            'salary' => 95000,
            'bank_name' => 'CRDB',
            'bank_account_name' => 'Cynthia Kariuki',
            'bank_account_number' => '0102030405',
            'salary_due_day' => 27,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('salary', 95000)
            ->assertJsonPath('bank_name', 'CRDB')
            ->assertJsonPath('salary_due_day', 27);

        $this->assertDatabaseHas('employees', [
            'employee_number' => 'EMP-1005',
            'salary' => '95000.00',
            'bank_name' => 'CRDB',
            'bank_account_number' => '0102030405',
            'salary_due_day' => 27,
        ]);
    }

    public function test_employee_update_and_delete_endpoints_work(): void
    {
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin4@example.com',
            'role' => 'admin',
            'password' => 'Password123!',
        ]);

        $employee = Employee::create([
            'employee_number' => 'EMP-4501',
            'first_name' => 'Daniel',
            'last_name' => 'Mwenye',
            'department' => 'Logistics',
            'position' => 'Coordinator',
            'phone' => '+254700000006',
            'status' => 'active',
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson('/api/employees/' . $employee->id, [
                'first_name' => 'Daniella',
                'position' => 'Senior Coordinator',
                'salary' => 85000,
            ])
            ->assertOk()
            ->assertJsonPath('first_name', 'Daniella')
            ->assertJsonPath('salary', 85000);

        $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/employees/' . $employee->id)
            ->assertStatus(204);

        $this->assertDatabaseMissing('employees', ['id' => $employee->id]);
    }

    public function test_employees_page_source_contains_edit_delete_and_id_card_ui(): void
    {
        $file = dirname(base_path()) . DIRECTORY_SEPARATOR . 'pages' . DIRECTORY_SEPARATOR . 'employees.html';

        $this->assertFileExists($file);

        $contents = file_get_contents($file);

        $this->assertNotFalse($contents);
        $this->assertStringContainsString('Employee ID Card', $contents);
        $this->assertStringContainsString('Print ID Card', $contents);
        $this->assertStringContainsString('HOROMA RICE MILL', $contents);
        $this->assertStringContainsString('QR CODE', $contents);
        $this->assertStringContainsString('ID', $contents);
        $this->assertStringContainsString('Delete', $contents);
        $this->assertStringContainsString('Edit', $contents);
    }
}
