<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportsAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_generate_rejects_unauthenticated(): void
    {
        $response = $this->getJson('/api/reports/generate?format=json');
        $response->assertStatus(401);
    }

    public function test_reports_generate_allows_sanctum_token_for_allowed_role(): void
    {
        $user = User::create([
            'name' => 'Manager User',
            'email' => 'manager_test@example.com',
            'password' => bcrypt('secret'),
            'role' => 'manager',
        ]);

        $token = $user->createToken('test-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->get('/api/reports/generate?format=json');

        $response->assertOk();
        $response->assertJsonPath('category', 'all');
    }
}
