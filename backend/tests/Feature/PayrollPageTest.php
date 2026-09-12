<?php

namespace Tests\Feature;

use Tests\TestCase;

class PayrollPageTest extends TestCase
{
    public function test_payroll_page_uses_real_employee_salary_inputs_and_selector(): void
    {
        $file = dirname(base_path()) . DIRECTORY_SEPARATOR . 'pages' . DIRECTORY_SEPARATOR . 'payroll.html';

        $this->assertFileExists($file);

        $contents = file_get_contents($file);

        $this->assertNotFalse($contents);
        $this->assertStringContainsString('id="payroll-employee-select"', $contents);
        $this->assertStringContainsString('id="basic-salary"', $contents);
        $this->assertStringContainsString('id="bonus-amount"', $contents);
        $this->assertStringContainsString('id="allowances-amount"', $contents);
        $this->assertStringContainsString('id="deductions-amount"', $contents);
        $this->assertStringContainsString('id="btn-generate-payslip"', $contents);
        $this->assertStringContainsString('salary-alert', $contents);
        $this->assertStringContainsString('bank-name', $contents);
        $this->assertStringContainsString('id="payroll-employee-search"', $contents);
        $this->assertStringContainsString('Search employee', $contents);
    }
}
