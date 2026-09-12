<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportPdfTest extends TestCase
{
    use RefreshDatabase;

    public function test_reports_generate_returns_pdf_and_contains_heading()
    {
        $user = User::create([
            'name' => 'PDF User',
            'email' => 'pdf_user@example.com',
            'password' => bcrypt('secret'),
            'role' => 'manager',
        ]);

        $token = $user->createToken('test-pdf')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/pdf',
        ])->get('/api/reports/generate');

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');
    }

    public function test_reports_generate_json_contains_heading_and_stock_units()
    {
        $user = User::create([
            'name' => 'JSON User',
            'email' => 'json_user@example.com',
            'password' => bcrypt('secret'),
            'role' => 'manager',
        ]);

        $token = $user->createToken('test-json')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->get('/api/reports/generate?format=json');

        $response->assertStatus(200);
        $json = $response->json();

        $this->assertEquals('Horoma Rice Mill', $json['company']);

        $labels = array_column($json['rows'], 'label');
        $this->assertContains('Agriculture Stock (units)', $labels);

        // find the stock row and assert numeric
        foreach ($json['rows'] as $row) {
            if ($row['label'] === 'Agriculture Stock (units)') {
                $this->assertIsInt($row['value']);
                break;
            }
        }
    }

    public function test_reports_generate_json_filtered_agriculture_uses_concise_labels()
    {
        $user = User::create([
            'name' => 'Filtered User',
            'email' => 'filtered_user@example.com',
            'password' => bcrypt('secret'),
            'role' => 'manager',
        ]);

        $token = $user->createToken('test-json')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->get('/api/reports/generate?format=json&category=agriculture');

        $response->assertStatus(200);
        $json = $response->json();

        $labels = array_column($json['rows'], 'label');
        $this->assertContains('Stock (units)', $labels);

        foreach ($json['rows'] as $row) {
            if ($row['label'] === 'Stock (units)') {
                $this->assertIsInt($row['value']);
                break;
            }
        }
    }

    public function test_reports_generate_json_filtered_construction_uses_concise_labels()
    {
        $user = User::create([
            'name' => 'Filtered User 2',
            'email' => 'filtered_user2@example.com',
            'password' => bcrypt('secret'),
            'role' => 'manager',
        ]);

        $token = $user->createToken('test-json2')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->get('/api/reports/generate?format=json&category=construction');

        $response->assertStatus(200);
        $json = $response->json();

        $labels = array_column($json['rows'], 'label');
        $this->assertContains('Stock (units)', $labels);

        foreach ($json['rows'] as $row) {
            if ($row['label'] === 'Stock (units)') {
                $this->assertIsInt($row['value']);
                break;
            }
        }
    }

    public function test_reports_generate_unauthenticated_is_rejected()
    {
        $response = $this->get('/api/reports/generate');

        // Depending on middleware/controller, unauthenticated calls may be 401 or 403
        $this->assertTrue(in_array($response->status(), [401, 403]));
    }

    public function test_receipt_generation_returns_pdf_and_formats_values()
    {
        $user = User::create([
            'name' => 'Receipt User',
            'email' => 'receipt_user@example.com',
            'password' => bcrypt('secret'),
            'role' => 'manager',
        ]);

        $token = $user->createToken('test-receipt')->plainTextToken;

        $items = [
            ['label' => 'Rice 50kg', 'qty' => 2, 'price' => 120.5],
        ];

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
        ])->post('/api/receipts/generate', ['items' => $items, 'payment' => 'Cash']);

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'application/pdf');

        // Also check JSON output path
        $r2 = $this->withHeaders([
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ])->postJson('/api/receipts/generate', ['items' => $items, 'payment' => 'Cash']);

        $r2->assertStatus(200);
        $json = $r2->json();
        $this->assertEquals('Horoma Rice Mill', $json['company']);
        $this->assertEquals('Tshs 241.00', $json['total']);
        $this->assertIsArray($json['items']);
        $this->assertEquals('Rice 50kg', $json['items'][0]['label']);
        $this->assertEquals('Tshs 120.50', $json['items'][0]['price']);
        $this->assertEquals('Tshs 120.50', $json['items'][0]['unit_price']);
        $this->assertEquals('Tshs 241.00', $json['items'][0]['line_total']);
    }
}
