<?php

$localOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

$configuredOrigins = [];

$frontendUrl = trim((string) env('FRONTEND_URL', ''));
if ($frontendUrl !== '') {
    $configuredOrigins[] = rtrim($frontendUrl, '/');
}

$corsAllowedOrigins = env('CORS_ALLOWED_ORIGINS');
if ($corsAllowedOrigins !== null && trim((string) $corsAllowedOrigins) !== '') {
    foreach (explode(',', (string) $corsAllowedOrigins) as $origin) {
        $trimmed = trim($origin);
        if ($trimmed !== '') {
            $configuredOrigins[] = rtrim($trimmed, '/');
        }
    }
}

$allowedOrigins = array_values(array_unique([
    ...$localOrigins,
    ...$configuredOrigins,
]));

return [
    'paths' => ['api/*'],
    'allowed_methods' => ['*'],
    'allowed_origins' => $allowedOrigins,
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => false,
];
