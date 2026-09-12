<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleController extends Controller
{
    public function index(): JsonResponse
    {
        $sales = Sale::with('items')
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($sale) {
                return [
                    'id' => $sale->id,
                    'reference' => $sale->reference,
                    'total_amount' => (float) $sale->total_amount,
                    'total_kg' => (float) $sale->total_kg,
                    'payment_method' => $sale->payment_method,
                    'created_at' => $sale->created_at?->toISOString(),
                    'items' => $sale->items->map(function ($item) {
                        return [
                            'id' => $item->id,
                            'name' => $item->name,
                            'sku' => $item->sku,
                            'package_size' => (int) $item->package_size,
                            'qty' => (int) $item->qty,
                            'price' => (float) $item->price,
                            'line_total' => (float) $item->line_total,
                            'total_kg' => (float) $item->total_kg,
                        ];
                    })->values(),
                ];
            });

        return response()->json(['sales' => $sales], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required','array','min:1'],
            'items.*.product_id' => ['nullable','string'],
            'items.*.name' => ['required','string'],
            'items.*.qty' => ['required','integer','min:1'],
            'items.*.price' => ['required','numeric','min:0'],
            // A sale is recorded in packages. A zero package size produces a
            // misleading zero-weight receipt, so reject it at the API too.
            'items.*.package_size' => ['required','integer','min:1'],
            'payment_method' => ['nullable','string'],
        ]);

        $items = $data['items'];

        // Resolve the selling price before creating any database records.
        foreach ($items as $index => &$item) {
            $product = !empty($item['product_id']) ? Product::find($item['product_id']) : null;
            $price = (float) $item['price'];
            if ($price <= 0 && $product && (float) $product->price > 0) {
                $price = (float) $product->price;
            }
            if ($price <= 0) {
                throw ValidationException::withMessages([
                    "items.$index.price" => "The product '{$item['name']}' needs a selling price before it can be sold.",
                ]);
            }
            $item['price'] = $price;
        }
        unset($item);

        $totalAmount = 0;
        $totalKg = 0;

        $sale = Sale::create([
            'reference' => 'SALE-'.time(),
            'total_amount' => 0,
            'total_kg' => 0,
            'payment_method' => $data['payment_method'] ?? 'Cash',
        ]);

        foreach ($items as $it) {
            $qty = (int)$it['qty'];
            $pkg = (int)($it['package_size'] ?? 0);
            $product = !empty($it['product_id']) ? Product::find($it['product_id']) : null;
            $price = (float)$it['price'];
            $lineTotal = $price * $qty;
            $lineKg = $pkg * $qty;

            $saleItem = SaleItem::create([
                'sale_id' => $sale->id,
                'product_id' => $it['product_id'] ?? null,
                'name' => $it['name'],
                'sku' => $it['sku'] ?? null,
                'package_size' => $pkg,
                'qty' => $qty,
                'price' => $price,
                'line_total' => $lineTotal,
                'total_kg' => $lineKg,
            ]);

            $totalAmount += $lineTotal;
            $totalKg += $lineKg;

            // reduce product stock if product_id provided
            if (!empty($it['product_id'])) {
                if ($product) {
                    $product->stock = max(0, (int)$product->stock - $lineKg);
                    $product->save();
                }
            }
        }

        $sale->update(['total_amount' => $totalAmount, 'total_kg' => $totalKg]);

        return response()->json(['sale' => $sale->load('items')], 201);
    }

    public function destroy(Sale $sale): JsonResponse
    {
        DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                if (!empty($item->product_id)) {
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->stock = max(0, (int) $product->stock + (int) $item->total_kg);
                        $product->save();
                    }
                }
            }

            $sale->items()->delete();
            $sale->delete();
        });

        return response()->json([
            'deleted' => true,
            'sale_id' => $sale->id,
            'message' => 'Sale deleted successfully.',
        ], 200);
    }
}
