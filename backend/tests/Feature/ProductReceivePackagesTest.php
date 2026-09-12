<?php

namespace Tests\Feature;

use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductReceivePackagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_receive_packages_updates_stock_and_counts(): void
    {
        $product = Product::create([
            'name' => 'Test Rice',
            'sku' => 'TR-001',
            'cost' => 100,
            'price' => 120,
            'stock' => 0,
            'unit' => 'kg',
        ]);

        $payload = [
            'packages' => [
                ['size' => 25, 'count' => 100],
                ['size' => 5, 'count' => 200],
                ['size' => 10, 'count' => 50],
            ],
        ];

        $resp = $this->postJson("/api/products/{$product->id}/receive-packages", $payload);

        $resp->assertOk()

            ->assertJsonPath('summary.total_kg_added', 25 * 100 + 5 * 200 + 10 * 50)
            ->assertJsonPath('summary.total_package_units_added', 100 + 200 + 50)
            ->assertJsonPath('summary.packaging_counts.25', 100)
            ->assertJsonPath('summary.packaging_counts.5', 200)
            ->assertJsonPath('summary.packaging_counts.10', 50);

        $product->refresh();
        $this->assertEquals(25 * 100 + 5 * 200 + 10 * 50, $product->stock);
        $this->assertIsArray($product->packaging_counts);
        $this->assertEquals(100, $product->packaging_counts['25']);
        $this->assertEquals(200, $product->packaging_counts['5']);
        $this->assertEquals(50, $product->packaging_counts['10']);
    }
}
