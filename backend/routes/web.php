<?php

use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Illuminate\View\Middleware\ShareErrorsFromSession;

$frontendRoot = realpath(base_path('..'));

$serveFrontendFile = function (string $relativePath) use ($frontendRoot) {
    $file = realpath($frontendRoot.DIRECTORY_SEPARATOR.$relativePath);

    abort_unless(
        $file
        && is_file($file)
        && str_starts_with($file, $frontendRoot.DIRECTORY_SEPARATOR),
        404
    );

    $mimeTypes = [
        'css' => 'text/css; charset=UTF-8',
        'html' => 'text/html; charset=UTF-8',
        'js' => 'application/javascript; charset=UTF-8',
        'json' => 'application/json; charset=UTF-8',
        'svg' => 'image/svg+xml',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'ico' => 'image/x-icon',
    ];

    $extension = strtolower(pathinfo($file, PATHINFO_EXTENSION));
    $headers = isset($mimeTypes[$extension])
        ? ['Content-Type' => $mimeTypes[$extension]]
        : [];

    return response()->file($file, $headers);
};

$frontendMiddleware = [
    EncryptCookies::class,
    AddQueuedCookiesToResponse::class,
    StartSession::class,
    ShareErrorsFromSession::class,
    ValidateCsrfToken::class,
];

$serve = fn ($route) => $route->withoutMiddleware($frontendMiddleware);

$serve(Route::get('/', fn () => $serveFrontendFile('index.html')));
$serve(Route::get('/index.html', fn () => $serveFrontendFile('index.html')));
$serve(Route::get('/login.html', fn () => $serveFrontendFile('login.html')));

$serve(
    Route::get('/assets/{path}', fn (string $path) => $serveFrontendFile('assets/'.$path))
        ->where('path', '.*')
);

$serve(
    Route::get('/lang/{path}', fn (string $path) => $serveFrontendFile('lang/'.$path))
        ->where('path', '.*')
);

$serve(
    Route::get('/pages/{path}', fn (string $path) => $serveFrontendFile('pages/'.$path))
        ->where('path', '.*')
);
