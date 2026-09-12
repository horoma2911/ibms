<?php

namespace Tests\Feature;

use App\Models\Expense;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExpenseApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_and_list_expenses(): void
    {
        $response = $this->postJson('/api/expenses', [
            'title' => 'Fuel and transport',
            'category' => 'transport',
            'amount' => 250000,
            'date' => '2026-09-12',
            'payment_method' => 'Cash',
            'notes' => 'Delivery trip to market',
        ]);

        $response->assertCreated()
            ->assertJsonPath('title', 'Fuel and transport')
            ->assertJsonPath('amount', 250000);

        $this->getJson('/api/expenses')
            ->assertOk()
            ->assertJsonCount(1, 'expenses');
    }

    public function test_expense_requires_amount_and_title(): void
    {
        $this->postJson('/api/expenses', [
            'category' => 'transport',
            'amount' => 0,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'amount']);
    }

    public function test_expense_can_be_updated_and_filtered_by_category_and_month(): void
    {
        $expense = \App\Models\Expense::create([
            'title' => 'Fuel and transport',
            'category' => 'transport',
            'amount' => 120000,
            'date' => '2026-09-01',
            'payment_method' => 'Cash',
            'notes' => 'Original note',
        ]);

        $this->putJson('/api/expenses/' . $expense->id, [
            'title' => 'Updated fuel',
            'category' => 'transport',
            'amount' => 175000,
            'date' => '2026-09-10',
            'payment_method' => 'Bank Transfer',
            'notes' => 'Updated note',
        ])->assertOk()
            ->assertJsonPath('title', 'Updated fuel')
            ->assertJsonPath('amount', 175000);

        \App\Models\Expense::create([
            'title' => 'Generator fuel',
            'category' => 'fuel',
            'amount' => 60000,
            'date' => '2026-09-15',
            'payment_method' => 'Cash',
            'notes' => 'Other note',
        ]);

        $this->getJson('/api/expenses?category=transport&month=2026-09')
            ->assertOk()
            ->assertJsonCount(1, 'expenses');
    }
}
