<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

final class InertiaPageController extends Controller
{
    public function home(): Response
    {
        return $this->render('Home/Index');
    }

    public function scheduleComparison(): Response
    {
        return $this->render('ScheduleComparison/Index');
    }

    public function schedule(): Response
    {
        return $this->render('Schedule/Index');
    }

    public function childPlan(): Response
    {
        return $this->render('ChildPlan/Index');
    }

    public function summary(): Response
    {
        return $this->render('Summary/Index');
    }

    public function lastWar(): Response
    {
        return $this->render('LastWar/Index');
    }

    public function support(): Response
    {
        return $this->render('Support/Index');
    }

    public function reports(): Response
    {
        return $this->render('Reports/Index');
    }

    public function settings(): Response
    {
        return $this->render('Settings/Index');
    }

    public function oshigoto(): Response
    {
        return $this->render('Oshigoto/Index');
    }

    public function oshigotoZukan(): Response
    {
        return $this->render('Oshigoto/Zukan');
    }

    public function oshigotoUsj(): Response
    {
        return $this->render('Oshigoto/Usj');
    }

    public function mamaKaji(): Response
    {
        return $this->render('MamaKaji/Index');
    }

    public function mamaKajiZukan(): Response
    {
        return $this->render('MamaKaji/Zukan');
    }

    public function musume(): Response
    {
        return $this->render('Musume/Index');
    }

    public function koekake(): Response
    {
        return $this->render('Koekake/Index');
    }

    /**
     * @param  array<string, mixed>  $props
     */
    private function render(string $component, array $props = []): Response
    {
        return Inertia::render($component, $props);
    }
}
