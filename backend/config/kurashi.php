<?php

return [

    'family_token' => env('FAMILY_TOKEN', ''),

    'family_token_max_attempts' => (int) env('FAMILY_TOKEN_MAX_ATTEMPTS', 5),

    'family_token_decay_seconds' => (int) env('FAMILY_TOKEN_DECAY_SECONDS', 60),

    'inertia' => [
        'enabled' => filter_var(env('INERTIA_ENABLED', false), FILTER_VALIDATE_BOOL),
        'path_prefix' => env('INERTIA_PATH_PREFIX', 'app'),
    ],

    'timezone' => 'Asia/Tokyo',

    'stamp_size' => 10,

    'coin_per_full_moon' => 100,

    'max_record_past_days' => 30,

    'reward_catalog' => [
        'zombie' => [
            'pierrot',
            'exec',
            'prisoner',
            'testsub',
            'doll',
            'vampire',
            'demon',
        ],
        'sweet' => [
            'lamington',
            'macaron',
            'pannacotta',
            'mooncake',
        ],
    ],

];
