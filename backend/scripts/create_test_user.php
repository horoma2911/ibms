<?php
require __DIR__ . '/../vendor/autoload.php';
$app = require __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;

$email = 'manager@example.com';
$exists = User::where('email', $email)->exists();
if ($exists) {
    echo "User already exists\n";
    exit;
}

User::create([
    'name' => 'Manager Test',
    'email' => $email,
    'password' => 'secure-password',
    'role' => 'manager',
]);

echo "Created user: $email\n";
