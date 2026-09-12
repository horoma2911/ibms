<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;
use Illuminate\Support\Facades\Log;

class RequireAuthOrAdminHeader
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next)
    {
        // 1) Allow if authenticated via default (session) guard
        $user = $request->user();
        if ($user) {
            auth()->setUser($user);
            $request->setUserResolver(fn () => $user);
            return $next($request);
        }

        // 2) Allow if admin header matches env key
        $adminHeader = $request->header('X-IBMS-ADMIN');
        if ($adminHeader && env('IBMS_ADMIN_KEY') && hash_equals((string) env('IBMS_ADMIN_KEY'), (string) $adminHeader)) {
            return $next($request);
        }

        // 3) Try explicit PersonalAccessToken lookup from Authorization header
        $authHeader = $request->header('Authorization') ?? $request->header('authorization');
        if ($authHeader && preg_match('/Bearer\s+(\S+)/i', $authHeader, $m)) {
            $token = $m[1];
            try {
                $pat = PersonalAccessToken::findToken($token);
                if ($pat && $pat->tokenable) {
                    $user = $pat->tokenable;
                    auth()->setUser($user);
                    $request->setUserResolver(fn () => $user);
                    return $next($request);
                }
            } catch (\Throwable $e) {
                // ignore and continue to other checks
            }
        }

        // 4) Last resort: try sanctum guard user
        try {
            $user = auth('sanctum')->user() ?? $request->user('sanctum');
            if ($user) {
                auth()->setUser($user);
                $request->setUserResolver(fn () => $user);
                return $next($request);
            }
        } catch (\Throwable $e) {
            // ignore
        }

        return response()->json(['message' => 'Unauthenticated'], 401);
    }
}
