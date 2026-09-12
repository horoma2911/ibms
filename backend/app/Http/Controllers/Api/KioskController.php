<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class KioskController extends Controller
{
    public function issueToken(Request $request)
    {
        $adminHeader = $request->header('X-IBMS-ADMIN');
        if (!($adminHeader && env('IBMS_ADMIN_KEY') && $adminHeader === env('IBMS_ADMIN_KEY'))) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        // find or create a service user for kiosks
        $user = User::firstOrCreate(
            ['email' => 'kiosk@ibms.local'],
            ['name' => 'Kiosk Service', 'password' => bcrypt(Str::random(24))]
        );

        $token = $user->createToken('kiosk-'.Str::random(8), ['attendance:scan'])->plainTextToken;

        return response()->json(['token' => $token]);
    }
}
