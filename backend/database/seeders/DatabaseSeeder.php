<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'horomaricemill@yahoo.com'],
            [
                'name' => 'System Admin',
                'role' => 'admin',
                'password' => Hash::make('horoma@2026'),
            ]
        );

        User::updateOrCreate(
            ['email' => 'manager@example.com'],
            [
                'name' => 'Operations Manager',
                'role' => 'manager',
                'password' => Hash::make('secure-password'),
            ]
        );

        $this->call(EmployeeSeeder::class);
    }
}
