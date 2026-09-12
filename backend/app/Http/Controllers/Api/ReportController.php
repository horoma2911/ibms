<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Employee;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ReportController extends Controller
{
    public function payslip(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'basic' => ['nullable', 'string'],
            'bonus' => ['nullable', 'string'],
            'allowances' => ['nullable', 'string'],
            'deductions' => ['nullable', 'string'],
            'period' => ['nullable', 'string'],
        ]);

        // authorize: allow if authenticated user with role admin/hr/manager or valid admin header
        $user = $request->user();
        $adminHeader = $request->header('X-IBMS-ADMIN');
        $allowed = ($user && in_array($user->role ?? null, ['admin', 'hr', 'manager']))
            || ($adminHeader && env('IBMS_ADMIN_KEY') && hash_equals((string) env('IBMS_ADMIN_KEY'), (string) $adminHeader));

        if (! $allowed) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $employee = Employee::findOrFail($data['employee_id']);

        $pay = [
            'basic' => $data['basic'] ?? '0',
            'bonus' => $data['bonus'] ?? '0',
            'allowances' => $data['allowances'] ?? '0',
            'deductions' => $data['deductions'] ?? '0',
        ];

        $net = intval(preg_replace('/[^0-9]/', '', $pay['basic'])) + intval(preg_replace('/[^0-9]/', '', $pay['bonus'])) + intval(preg_replace('/[^0-9]/', '', $pay['allowances'])) - intval(preg_replace('/[^0-9]/', '', $pay['deductions']));

        $viewData = [
            'employee' => $employee,
            'pay' => $pay,
            'net' => number_format($net),
            'period' => $data['period'] ?? now()->format('F Y'),
        ];

        // Use barryvdh/laravel-dompdf explicitly for PDF generation.
        if (class_exists(Pdf::class)) {
            $pdf = Pdf::loadView('payslip', $viewData);
            return $pdf->stream('payslip_'.$employee->id.'.pdf');
        }

        // Fallback: return HTML view
        return response()->view('payslip', $viewData);
    }

    public function generateReport(Request $request)
    {
        // (no-op) report generation entry
        $type = $request->query('type', 'performance');
        $categoryQuery = strtolower((string) $request->query('category', 'all'));
        $category = in_array($categoryQuery, ['all', 'construction', 'agriculture', 'inputs'], true)
            ? $categoryQuery
            : 'all';

        $user = $request->user();
        $adminHeader = $request->header('X-IBMS-ADMIN');
        $allowed = ($user && in_array($user->role ?? null, ['admin', 'hr', 'manager']))
            || ($adminHeader && env('IBMS_ADMIN_KEY') && hash_equals((string) env('IBMS_ADMIN_KEY'), (string) $adminHeader));

        if (! $allowed) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $appName = config('app.name', 'Horoma Rice Mill');
        $data = [
            'type' => $type,
            'category' => $category,
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'company' => $appName,
            'reportTitle' => $this->reportTitleForCategory($category, $type),
            'rows' => $this->buildReportRows($category),
        ];

        if ($request->query('format') === 'json') {
            return response()->json($data);
        }

        if (class_exists(Pdf::class)) {
            $pdf = Pdf::loadView('reports.report', ['data' => $data]);
            return $pdf->stream('report_'.$category.'_'.date('Ymd_His').'.pdf');
        }

        return response()->view('reports.report', ['data' => $data]);
    }

    protected function reportTitleForCategory(string $category, string $type): string
    {
        $sectorLabel = $category === 'all' ? 'All Sectors' : ucfirst($category);

        return ucfirst($type) . ' - ' . $sectorLabel;
    }

    protected function buildReportRows(string $category): array
    {
        $categories = $category === 'all'
            ? ['construction', 'agriculture', 'inputs']
            : [$category];

        $rows = [];

        $single = count($categories) === 1;

        foreach ($categories as $slug) {
            $products = $this->productsForCategory($slug);
            $inventoryValue = $products->sum(fn ($product) => (float) ($product->stock ?? 0) * (float) ($product->cost ?? 0));
            $salesRevenue = SaleItem::whereIn('product_id', $products->pluck('id')->all())->sum('line_total');

            $label = ucfirst($slug);
            $prefix = $single ? '' : ($label . ' ');

            $rows[] = ['label' => $prefix . 'Products', 'value' => $products->count()];
            // Stock: numeric units (no currency). Use integer formatting.
            $rows[] = ['label' => $prefix . 'Stock (units)', 'value' => (int) $products->sum('stock')];
            $rows[] = ['label' => $prefix . 'Inventory Value', 'value' => 'Tshs ' . number_format($inventoryValue, 2)];
            $rows[] = ['label' => $prefix . 'Sales Revenue', 'value' => 'Tshs ' . number_format((float) $salesRevenue, 2)];
        }

        return $rows ?: [['label' => 'No category data', 'value' => '0']];
    }

    protected function productsForCategory(string $category): \Illuminate\Database\Eloquent\Collection
    {
        $categoryModel = Category::where('slug', $category)->first();
        $query = Product::query();

        if ($categoryModel) {
            $query->where('category_id', $categoryModel->id);
        } else {
            $query->where(function ($predicate) use ($category) {
                $predicate->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($category) . '%'])
                    ->orWhereRaw('LOWER(COALESCE(packaging, "")) LIKE ?', ['%' . strtolower($category) . '%']);
            });
        }

        if ($categoryModel === null) {
            $keywords = match ($category) {
                'construction' => ['construction', 'brick', 'tofali', 'roufer', 'roof', 'cement', 'block', 'masonry', 'concrete'],
                'agriculture' => ['agriculture', 'rice', 'maize', 'grain', 'seed', 'fertilizer', 'crop', 'farm', 'plant'],
                'inputs' => ['input', 'chemical', 'fertilizer', 'pesticide', 'tool', 'equipment', 'supplies'],
                default => [$category],
            };

            $query->orWhere(function ($predicate) use ($keywords) {
                foreach ($keywords as $keyword) {
                    $predicate->orWhereRaw('LOWER(name) LIKE ?', ['%' . strtolower($keyword) . '%'])
                        ->orWhereRaw('LOWER(COALESCE(packaging, "")) LIKE ?', ['%' . strtolower($keyword) . '%']);
                }
            });
        }

        return $query->get();
    }

    public function receipt(Request $request)
    {
        $payload = $request->validate([
            'sale_id' => ['nullable', 'uuid', 'exists:sales,id'],
            'items' => ['nullable', 'array'],
            'items.*.label' => ['nullable', 'string'],
            'items.*.name' => ['nullable', 'string'],
            'items.*.qty' => ['nullable', 'integer', 'min:1'],
            'items.*.price' => ['nullable'],
            'items.*.unit_price' => ['nullable'],
            'items.*.package_size' => ['nullable', 'integer', 'min:0'],
            'items.*.total_kg' => ['nullable', 'numeric'],
            'items.*.line_total' => ['nullable'],
            'total' => ['nullable'],
            'payment' => ['nullable', 'string', 'max:100'],
            'customer' => ['nullable', 'string', 'max:255'],
        ]);

        $user = $request->user();

        // Fallback: if middleware didn't resolve the Sanctum bearer token, try to resolve here
        if (! $user) {
            try {
                $authHeader = $request->header('Authorization') ?? $request->header('authorization');
                if ($authHeader && preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
                    $token = $m[1];
                    if (class_exists('\Laravel\Sanctum\PersonalAccessToken')) {
                        $pat = \Laravel\Sanctum\PersonalAccessToken::findToken($token);
                        if ($pat && $pat->tokenable) {
                            $user = $pat->tokenable;
                        }
                    }
                }
            } catch (\Throwable $e) {
                // ignore
            }
        }
        // Allow if authenticated user exists (sales staff should be able to generate receipts)
        $adminHeader = $request->header('X-IBMS-ADMIN');
        $allowed = ($user) || ($adminHeader && env('IBMS_ADMIN_KEY') && hash_equals((string) env('IBMS_ADMIN_KEY'), (string) $adminHeader));
        if (! $allowed) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        $sale = !empty($payload['sale_id'])
            ? Sale::with('items')->findOrFail($payload['sale_id'])
            : null;

        if ($sale) {
            $items = $sale->items->map(function ($item) {
                $qty = (int) $item->qty;
                $pkg = (int) $item->package_size;
                $unitPrice = (float) $item->price;
                $lineTotal = (float) $item->line_total;

                return [
                    'label' => $item->name ?: 'Item',
                    'name' => $item->name ?: 'Item',
                    'qty' => $qty,
                    'package_size' => $pkg,
                    'total_kg' => (int) $item->total_kg,
                    'unit_price' => 'Tshs ' . number_format($unitPrice, 2),
                    'line_total' => 'Tshs ' . number_format($lineTotal, 2),
                    'price' => 'Tshs ' . number_format($unitPrice, 2),
                ];
            })->values()->all();

            // Derive every receipt total from its saved line items. This keeps
            // receipts correct even if an earlier sale header had stale zeros.
            $totalNum = $sale->items->sum(fn ($item) => (float) $item->price * (int) $item->qty);
            $totalUnits = $sale->items->sum(fn ($item) => (int) $item->qty);
            $totalKg = $sale->items->sum(fn ($item) => (int) $item->package_size * (int) $item->qty);
            $payment = $sale->payment_method ?: 'Cash';
            $reference = $sale->reference;
        } else {
            // Normalize manually supplied items for a receipt that is not linked
            // to a saved sale.
            $rawItems = $payload['items'] ?? [
            ['label' => 'Sample Item', 'qty' => 1, 'price' => 'Tshs 0'],
            ];

            $items = [];
            foreach ($rawItems as $it) {
                $qty = isset($it['qty']) ? (int) $it['qty'] : (int) ($it['quantity'] ?? 1);
                $packageSize = isset($it['package_size']) ? (int) $it['package_size'] : 0;

                // price may be numeric or string like 'Tshs 123'
                $priceRaw = $it['price'] ?? ($it['unit_price'] ?? ($it['price_str'] ?? '0'));
                $num = is_string($priceRaw)
                    ? (float) preg_replace('/[^0-9.\-]/', '', $priceRaw)
                    : (float) $priceRaw;

                $label = $it['label'] ?? ($it['name'] ?? 'Item');
                $lineTotal = $num * $qty;
                $itemData = [
                    'label' => $label,
                    'name' => $label,
                    'qty' => $qty,
                    'package_size' => $packageSize,
                    'total_kg' => (int) ($it['total_kg'] ?? ($packageSize * $qty)),
                    'unit_price' => 'Tshs ' . number_format($num, 2),
                    'line_total' => 'Tshs ' . number_format($lineTotal, 2),
                    'price' => 'Tshs ' . number_format($num, 2),
                ];

                $items[] = $itemData;
            }

            $totalNum = array_sum(array_map(
                fn (array $item) => (float) preg_replace('/[^0-9.\-]/', '', $item['line_total']),
                $items
            ));
            $totalUnits = array_sum(array_column($items, 'qty'));
            $totalKg = array_sum(array_column($items, 'total_kg'));
            $payment = $payload['payment'] ?? 'Cash';
            $reference = null;
        }

        $appName = config('app.name', 'Horoma Rice Mill');
        $data = [
            // Receipts are business documents, so their heading must not depend
            // on a stale Laravel APP_NAME/config cache.
            'company' => $appName,
            'generated_at' => now()->format('Y-m-d H:i:s'),
            'items' => $items,
            'total' => 'Tshs ' . number_format($totalNum, 2),
            'total_units' => $totalUnits,
            'total_kg' => $totalKg,
            'reference' => $reference,
            'payment' => $payment,
            'customer' => $payload['customer'] ?? null,
        ];

        // Return JSON when a client explicitly asks for JSON. If the request can
        // accept PDF, prefer the PDF stream so the browser can open/download it.
        if ($request->query('format') === 'json' || ($request->accepts(['application/json']) && ! $request->accepts(['application/pdf']))) {
            return response()->json($data);
        }

        if (class_exists(Pdf::class)) {
            $pdf = Pdf::loadView('receipts.receipt', ['data' => $data]);
            return $pdf->stream('receipt_'.date('Ymd_His').'.pdf');
        }

        return response()->view('receipts.receipt', ['data' => $data]);
    }
}
