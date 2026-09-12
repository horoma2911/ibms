<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Product::with('category')->orderBy('name');

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn ($subQuery) =>
                $subQuery->where('name', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
            );
        }

        return response()->json($query->get());
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100', 'unique:products,sku'],
            'category_id' => ['nullable', 'string', 'exists:categories,id'],
            'cost' => ['required', 'numeric', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'packaging' => ['nullable', 'string', 'max:100'],
        ]);

        $product = Product::create($data);

        return response()->json($product->load('category'), 201);
    }

    public function show(Product $product): JsonResponse
    {
        return response()->json($product->load('category'));
    }

    public function update(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'sku' => ['nullable', 'string', 'max:100', Rule::unique('products', 'sku')->ignore($product->id)],
            'category_id' => ['nullable', 'string', 'exists:categories,id'],
            'cost' => ['required', 'numeric', 'min:0'],
            'price' => ['required', 'numeric', 'min:0'],
            'stock' => ['required', 'integer', 'min:0'],
            'unit' => ['nullable', 'string', 'max:50'],
            'packaging' => ['nullable', 'string', 'max:100'],
        ]);

        $product->update($data);

        return response()->json($product->load('category'));
    }

    public function destroy(Product $product): JsonResponse
    {
        $product->delete();

        return response()->json(null, 204);
    }

    public function receivePackages(Request $request, Product $product): JsonResponse
    {
        $data = $request->validate([
            'packages' => ['required', 'array', 'min:1'],
            'packages.*.size' => ['required', 'numeric', 'in:5,10,25,50,100'],
            'packages.*.count' => ['required', 'integer', 'min:0'],
        ]);

        $packages = $data['packages'];
        $totalKg = 0;
        $totalUnits = 0;

        $existing = $product->packaging_counts ?? [];

        foreach ($packages as $p) {
            $size = (int)$p['size'];
            $count = (int)$p['count'];
            $totalKg += $size * $count;
            $totalUnits += $count;

            $key = (string)$size;
            $existing[$key] = ($existing[$key] ?? 0) + $count;
        }

        // We treat product stock as total kilograms available
        $product->stock = (int)$product->stock + $totalKg;
        $product->packaging_counts = $existing;
        $product->save();

        return response()->json([
            'product' => $product->fresh(),
            'summary' => [
                'total_kg_added' => $totalKg,
                'total_package_units_added' => $totalUnits,
                'packaging_counts' => $existing,
            ],
        ], 200);
    }
}
