<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Support\InertiaPath;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

final class LegacyInertiaRedirectController extends Controller
{
    public function __invoke(Request $request, ?string $path = null): RedirectResponse
    {
        $normalizedPath = $path === null || $path === '' ? '/' : '/'.$path;
        $target = InertiaPath::toUrl($normalizedPath);
        $query = $request->getQueryString();

        if ($query !== null && $query !== '') {
            $target .= '?'.$query;
        }

        return redirect($target, 301);
    }
}
