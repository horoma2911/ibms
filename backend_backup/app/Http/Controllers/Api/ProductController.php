<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ProductService;
use App\Http\Requests\ProductRequest;
use App\Http\Resources\ProductResource;

class ProductController extends Controller
{
    protected ProductService $service;

    public function __construct(ProductService $service)
    {
        $this->service = $service;
    }

    public function index()
    {
        $products = $this->service->list([], 20);
        return ProductResource::collection($products);
    }

    public function store(ProductRequest $request)
    {
        $product = $this->service->create($request->validated());
        return new ProductResource($product);
    }

    public function show($id)
    {
        $product = $this->service->repo->find($id);
        if (!$product) return response()->json(['message' => 'Not Found'], 404);
        return new ProductResource($product);
    }

    public function update(ProductRequest $request, $id)
    {
        $product = $this->service->update($id, $request->validated());
        return new ProductResource($product);
    }

    public function destroy($id)
    {
        $this->service->delete($id);
        return response()->noContent();
    }
}
