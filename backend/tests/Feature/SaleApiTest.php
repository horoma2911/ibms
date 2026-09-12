<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SaleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_create_sale_and_reduce_stock(): void
    {
        $p = Product::create([
            'name' => 'Sale Rice',
            'sku' => 'S-RICE-1',
            'cost' => 100,
            'price' => 150,
            'stock' => 500,
            'unit' => 'kg',
        ]);

        $payload = [
            'items' => [
                ['product_id' => $p->id, 'name' => $p->name, 'sku' => $p->sku, 'package_size' => 25, 'qty' => 2, 'price' => 150],
            ],
            'payment_method' => 'Cash',
        ];

        $resp = $this->postJson('/api/sales', $payload);
        $resp->assertCreated()
            ->assertJsonPath('sale.total_kg', 50)
            ->assertJsonPath('sale.total_amount', 300);

        $p->refresh();
        $this->assertEquals(450, $p->stock);
    }

    public function test_sale_uses_product_price_when_browser_submits_zero_price(): void
    {
        $product = Product::create([
            'name' => 'Priced Rice', 'sku' => 'PRICE-RICE', 'cost' => 800,
            'price' => 1200, 'stock' => 100, 'unit' => 'kg',
        ]);

        $response = $this->postJson('/api/sales', [
            'items' => [[
                'product_id' => $product->id, 'name' => $product->name,
                'package_size' => 25, 'qty' => 2, 'price' => 0,
            ]],
        ]);

        $response->assertCreated()
            ->assertJsonPath('sale.total_amount', 2400)
            ->assertJsonPath('sale.total_kg', 50)
            ->assertJsonPath('sale.items.0.price', 1200)
            ->assertJsonPath('sale.items.0.line_total', 2400);
    }

    public function test_sale_requires_a_non_zero_package_size(): void
    {
        $this->postJson('/api/sales', [
            'items' => [[
                'name' => 'Rice', 'qty' => 1, 'price' => 1200, 'package_size' => 0,
            ]],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('items.0.package_size');
    }

    public function test_can_list_sales_history(): void
    {
        $p = Product::create([
            'name' => 'History Rice',
            'sku' => 'H-RICE-1',
            'cost' => 90,
            'price' => 130,
            'stock' => 300,
            'unit' => 'kg',
        ]);

        $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $p->id, 'name' => $p->name, 'sku' => $p->sku, 'package_size' => 10, 'qty' => 3, 'price' => 130],
            ],
            'payment_method' => 'Cash',
        ]);

        $resp = $this->getJson('/api/sales');

        $resp->assertOk()
            ->assertJsonCount(1, 'sales')
            ->assertJsonPath('sales.0.total_amount', 390)
            ->assertJsonPath('sales.0.total_kg', 30);
    }

    public function test_receipt_uses_pieces_for_construction_sales(): void
    {
        $html = view('receipts.receipt', [
            'data' => [
                'company' => 'Horoma Rice Mill',
                'generated_at' => '2026-09-11',
                'reference' => 'SALE-CON-1',
                'items' => [[
                    'name' => 'Tofali inch 5',
                    'qty' => 2,
                    'package_size' => 5,
                    'unit_price' => 'Tshs 200',
                    'line_total' => 'Tshs 400',
                ]],
                'total_units' => 2,
                'total_kg' => 10,
                'total' => 'Tshs 400',
                'payment' => 'Cash',
                'customer' => null,
            ],
        ])->render();

        $this->assertStringContainsString('5 pieces', $html);
        $this->assertStringContainsString('Total pieces:', $html);
    }

    public function test_sale_can_be_deleted_and_stock_restored(): void
    {
        $product = Product::create([
            'name' => 'Deleteable Rice',
            'sku' => 'DELETE-RICE',
            'cost' => 100,
            'price' => 150,
            'stock' => 500,
            'unit' => 'kg',
        ]);

        $sale = $this->postJson('/api/sales', [
            'items' => [
                ['product_id' => $product->id, 'name' => $product->name, 'sku' => $product->sku, 'package_size' => 25, 'qty' => 2, 'price' => 150],
            ],
            'payment_method' => 'Cash',
        ])->decodeResponseJson()['sale'];

        $product->refresh();
        $this->assertSame(450, $product->stock);

        $response = $this->withHeader('X-IBMS-ADMIN', 'localtest')
            ->deleteJson('/api/sales/' . $sale['id']);

        $response->assertOk()
            ->assertJsonPath('deleted', true)
            ->assertJsonPath('sale_id', $sale['id']);

        $this->assertDatabaseMissing('sales', ['id' => $sale['id']]);

        $product->refresh();
        $this->assertSame(500, $product->stock);
    }

    public function test_report_generation_returns_category_specific_totals(): void
    {
        $construction = Category::create([
            'name' => 'Construction',
            'slug' => 'construction',
        ]);

        $agriculture = Category::create([
            'name' => 'Agriculture',
            'slug' => 'agriculture',
        ]);

        $constructionProduct = Product::create([
            'name' => 'Tofali inch 5',
            'sku' => 'BRICK-5',
            'category_id' => $construction->id,
            'cost' => 100,
            'price' => 200,
            'stock' => 50,
            'unit' => 'pcs',
        ]);

        $agricultureProduct = Product::create([
            'name' => 'Rice Grade 1',
            'sku' => 'RICE-1',
            'category_id' => $agriculture->id,
            'cost' => 80,
            'price' => 150,
            'stock' => 20,
            'unit' => 'kg',
        ]);

        $sale = Sale::create([
            'reference' => 'SALE-REPORT-1',
            'total_amount' => 400,
            'total_kg' => 10,
            'payment_method' => 'Cash',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'product_id' => $constructionProduct->id,
            'name' => $constructionProduct->name,
            'sku' => $constructionProduct->sku,
            'package_size' => 5,
            'qty' => 2,
            'price' => 200,
            'line_total' => 400,
            'total_kg' => 10,
        ]);

        $response = $this->withHeader('X-IBMS-ADMIN', 'localtest')
            ->get('/api/reports/generate?category=construction&format=json');

        $response->assertOk();
        $response->assertJsonPath('category', 'construction');
        $response->assertJsonPath('reportTitle', 'Performance - Construction');
        $response->assertJsonFragment(['label' => 'Sales Revenue', 'value' => 'Tshs 400.00']);
    }

    public function test_report_generation_supports_all_categories(): void
    {
        Category::create(['name' => 'Construction', 'slug' => 'construction']);
        Category::create(['name' => 'Agriculture', 'slug' => 'agriculture']);
        Category::create(['name' => 'Inputs', 'slug' => 'inputs']);

        Product::create([
            'name' => 'Tofali inch 5',
            'sku' => 'BRICK-ALL',
            'category_id' => Category::where('slug', 'construction')->first()->id,
            'cost' => 100,
            'price' => 200,
            'stock' => 10,
            'unit' => 'pcs',
        ]);

        Product::create([
            'name' => 'Rice Grade 1',
            'sku' => 'RICE-ALL',
            'category_id' => Category::where('slug', 'agriculture')->first()->id,
            'cost' => 80,
            'price' => 150,
            'stock' => 15,
            'unit' => 'kg',
        ]);

        Product::create([
            'name' => 'Fertilizer Pack',
            'sku' => 'INPUT-ALL',
            'category_id' => Category::where('slug', 'inputs')->first()->id,
            'cost' => 60,
            'price' => 120,
            'stock' => 12,
            'unit' => 'bag',
        ]);

        foreach (['all', 'construction', 'agriculture', 'inputs'] as $category) {
            $response = $this->withHeader('X-IBMS-ADMIN', 'localtest')
                ->get('/api/reports/generate?category=' . $category . '&format=json');

            $response->assertOk();
            $response->assertJsonPath('category', $category);
        }
    }

    public function test_receipt_uses_the_saved_sale_amounts_and_units(): void
    {
        config(['app.name' => 'Horoma Rice Mill']);

        $user = User::create([
            'name' => 'Receipt Manager',
            'email' => 'receipt-manager@example.com',
            'role' => 'manager',
            'password' => 'secure-password',
        ]);

        $sale = Sale::create([
            'reference' => 'SALE-RECEIPT-1',
            'total_amount' => 4500,
            'total_kg' => 75,
            'payment_method' => 'Cash',
        ]);

        SaleItem::create([
            'sale_id' => $sale->id,
            'name' => 'Rice Grade A',
            'package_size' => 25,
            'qty' => 3,
            'price' => 1500,
            'line_total' => 4500,
            'total_kg' => 75,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/receipts/generate?format=json', ['sale_id' => $sale->id])
            ->assertOk()
            ->assertJsonPath('company', 'Horoma Rice Mill')
            ->assertJsonPath('reference', 'SALE-RECEIPT-1')
            ->assertJsonPath('total_units', 3)
            ->assertJsonPath('total_kg', 75)
            ->assertJsonPath('total', 'Tshs 4,500.00')
            ->assertJsonPath('items.0.label', 'Rice Grade A')
            ->assertJsonPath('items.0.unit_price', 'Tshs 1,500.00')
            ->assertJsonPath('items.0.line_total', 'Tshs 4,500.00');

    }
}
