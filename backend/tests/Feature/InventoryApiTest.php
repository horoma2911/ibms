<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoint_returns_ok(): void
    {
        $response = $this->getJson('/api/health');

        $response->assertOk()
            ->assertJson(['status' => 'ok']);
    }

    public function test_can_create_and_list_category(): void
    {
        $payload = [
            'name' => 'Rice Products',
            'slug' => 'rice-products',
            'description' => 'A category for rice inventory items.',
        ];

        $this->postJson('/api/categories', $payload)
            ->assertCreated()
            ->assertJsonFragment(['name' => 'Rice Products', 'slug' => 'rice-products']);

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonFragment(['name' => 'Rice Products']);
    }

    public function test_can_create_update_and_delete_product(): void
    {
        $category = Category::create([
            'name' => 'Food',
            'slug' => 'food',
        ]);

        $payload = [
            'name' => 'Premium Rice',
            'sku' => 'RICE-001',
            'category_id' => $category->id,
            'cost' => 1200.50,
            'price' => 1500.75,
            'stock' => 45,
            'unit' => 'kg',
        ];

        $response = $this->postJson('/api/products', $payload);

        $response->assertCreated()
            ->assertJsonFragment(['name' => 'Premium Rice', 'sku' => 'RICE-001'])
            ->assertJsonPath('category.id', $category->id);

        $productId = $response->json('id');

        $this->putJson("/api/products/{$productId}", [
            'name' => 'Premium Rice Updated',
            'sku' => 'RICE-001',
            'category_id' => $category->id,
            'cost' => 1250,
            'price' => 1550,
            'stock' => 50,
            'unit' => 'kg',
        ])
            ->assertOk()
            ->assertJsonFragment(['name' => 'Premium Rice Updated', 'stock' => 50]);

        $this->deleteJson("/api/products/{$productId}")
            ->assertNoContent();

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(0);
    }
}
