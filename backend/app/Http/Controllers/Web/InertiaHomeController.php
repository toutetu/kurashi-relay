<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

final class InertiaHomeController extends Controller
{
    public function __invoke(): Response
    {
        return Inertia::render('Welcome', [
            'recordsPath' => route('inertia.records.index'),
        ]);
    }
}
