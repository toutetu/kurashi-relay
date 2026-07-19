<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class SpaLegacyRedirectController extends Controller
{
    public function __invoke(Request $request, ?string $path = null): RedirectResponse
    {
        $target = $path === null || $path === '' ? '/' : '/'.ltrim($path, '/');
        $query = $request->getQueryString();

        if ($query !== null && $query !== '') {
            $target .= '?'.$query;
        }

        return redirect($target, 301);
    }
}
