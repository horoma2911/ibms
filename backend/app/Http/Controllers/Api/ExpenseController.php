<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::query();

        if ($request->filled('category') && $request->string('category')->value() !== 'all') {
            $query->where('category', $request->string('category')->value());
        }

        if ($request->filled('month')) {
            $month = $request->string('month')->value();
            if (preg_match('/^\d{4}-\d{2}$/', $month)) {
                [$year, $monthNumber] = explode('-', $month);
                $query->whereYear('date', (int) $year)
                    ->whereMonth('date', (int) $monthNumber);
            }
        }

        if ($request->filled('from')) {
            $query->whereDate('date', '>=', $request->string('from')->value());
        }

        if ($request->filled('to')) {
            $query->whereDate('date', '<=', $request->string('to')->value());
        }

        $expenses = $query->orderByDesc('date')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['expenses' => $expenses], 200);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['nullable', 'date'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $expense = Expense::create([
            'title' => $data['title'],
            'category' => $data['category'] ?? 'general',
            'amount' => (float) $data['amount'],
            'date' => $data['date'] ?? now()->toDateString(),
            'payment_method' => $data['payment_method'] ?? 'Cash',
            'notes' => $data['notes'] ?? null,
        ]);

        return response()->json($expense, 201);
    }

    public function update(Request $request, Expense $expense): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'date' => ['nullable', 'date'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ]);

        $expense->update([
            'title' => $data['title'],
            'category' => $data['category'] ?? 'general',
            'amount' => (float) $data['amount'],
            'date' => $data['date'] ?? $expense->date,
            'payment_method' => $data['payment_method'] ?? $expense->payment_method,
            'notes' => $data['notes'] ?? $expense->notes,
        ]);

        return response()->json($expense->fresh(), 200);
    }

    public function destroy(Expense $expense): JsonResponse
    {
        $expense->delete();

        return response()->json(['deleted' => true, 'message' => 'Expense deleted successfully.'], 200);
    }
}
