<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#fffdf9">
        <meta
            name="description"
            content="母と娘の予定・実績・支援・待機・回復を見える形にする、くらしリレー。"
        >

        <title inertia>{{ config('app.name', 'くらしリレー') }}</title>

        @vite(['resources/js/inertia/app.tsx'])
        @inertiaHead
    </head>
    <body class="antialiased">
        @inertia
    </body>
</html>
