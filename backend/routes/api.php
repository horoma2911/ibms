<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\KioskController;
use Illuminate\Support\Facades\Route;

Route::get('health', function () {
    return response()->json(['status' => 'ok']);
});

Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
Route::post('auth/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
Route::get('auth/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

Route::apiResource('categories', CategoryController::class);
Route::apiResource('products', ProductController::class);
Route::apiResource('expenses', \App\Http\Controllers\Api\ExpenseController::class);
Route::post('products/{product}/receive-packages', [ProductController::class, 'receivePackages']);
Route::get('sales', [\App\Http\Controllers\Api\SaleController::class, 'index']);
Route::post('sales', [\App\Http\Controllers\Api\SaleController::class, 'store']);
Route::delete('sales/{sale}', [\App\Http\Controllers\Api\SaleController::class, 'destroy'])->middleware(\App\Http\Middleware\RequireAuthOrAdminHeader::class);

Route::get('employees', [EmployeeController::class, 'index']);
Route::get('employees/{employee}', [EmployeeController::class, 'show'])->middleware('auth:sanctum');
Route::post('employees', [EmployeeController::class, 'store'])->middleware('auth:sanctum');
Route::put('employees/{employee}', [EmployeeController::class, 'update'])->middleware('auth:sanctum');
Route::delete('employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('auth:sanctum');

// Attendance endpoints (protect with Sanctum token auth)
Route::post('attendance/scan', [AttendanceController::class, 'scan'])->middleware('auth:sanctum');
Route::get('attendance', [AttendanceController::class, 'index'])->middleware('auth:sanctum');
Route::get('attendance/{attendance}', [AttendanceController::class, 'show'])->middleware('auth:sanctum');

// Employee QR management (regeneration requires auth)
Route::post('employees/{employee}/regenerate-qr', [EmployeeController::class, 'regenerateQr'])->middleware('auth:sanctum');
Route::post('employees/generate-qr-all', [EmployeeController::class, 'generateAllQr'])->middleware('auth:sanctum');

// Reports and payslip generation (allow Sanctum tokens or local admin header)
Route::post('reports/payslip', [ReportController::class, 'payslip'])->middleware(\App\Http\Middleware\RequireAuthOrAdminHeader::class);
Route::get('reports/generate', [ReportController::class, 'generateReport'])->middleware(\App\Http\Middleware\RequireAuthOrAdminHeader::class);
Route::post('receipts/generate', [ReportController::class, 'receipt'])->middleware(\App\Http\Middleware\RequireAuthOrAdminHeader::class);

// Kiosk token issuance (admin header required)
Route::post('kiosks/token', [KioskController::class, 'issueToken'])->middleware(\App\Http\Middleware\RequireAuthOrAdminHeader::class);
