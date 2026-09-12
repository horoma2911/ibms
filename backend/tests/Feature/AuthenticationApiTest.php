<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_with_valid_credentials(): void
    {
        $user = User::create([
            'name' => 'Operations Manager',
            'email' => 'manager@example.com',
            'password' => 'secure-password',
            'role' => 'manager',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'manager@example.com',
            'password' => 'secure-password',
        ])
            ->assertOk()
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email', 'role'],
            ])
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.role', 'manager');
    }

    public function test_user_cannot_log_in_with_invalid_credentials(): void
    {
        User::create([
            'name' => 'Operations Manager',
            'email' => 'manager@example.com',
            'password' => 'secure-password',
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'manager@example.com',
            'password' => 'wrong-password',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The provided credentials are incorrect.');
    }
}
