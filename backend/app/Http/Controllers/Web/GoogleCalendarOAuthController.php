<?php

namespace App\Http\Controllers\Web;

use App\Services\CalendarConnectionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Throwable;

final class GoogleCalendarOAuthController
{
    public function callback(Request $request, CalendarConnectionService $service): RedirectResponse
    {
        $error = $request->query('error');
        if (is_string($error) && $error !== '') {
            return redirect('/schedule?calendar=error&reason='.urlencode($error));
        }

        $code = $request->query('code');
        $state = $request->query('state');
        if (! is_string($code) || $code === '' || ! is_string($state) || $state === '') {
            return redirect('/schedule?calendar=error&reason=missing_code');
        }

        try {
            $service->completeOAuth($code, $state);
        } catch (Throwable) {
            return redirect('/schedule?calendar=error&reason=token_exchange');
        }

        return redirect('/schedule?calendar=connected');
    }
}
