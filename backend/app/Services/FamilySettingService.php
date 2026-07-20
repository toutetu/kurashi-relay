<?php

namespace App\Services;

use App\Models\FamilySetting;
use Illuminate\Validation\ValidationException;

final class FamilySettingService
{
    public function get(): FamilySetting
    {
        $settings = FamilySetting::query()->first();

        if ($settings === null) {
            $settings = FamilySetting::query()->create([
                'day_type' => 'weekday',
                'report_exclude_last_war' => true,
                'display_note' => null,
            ]);
        }

        return $settings;
    }

    /**
     * @param  array{
     *   day_type?: string|null,
     *   report_exclude_last_war?: bool|null,
     *   display_note?: string|null
     * }  $input
     */
    public function update(array $input): FamilySetting
    {
        $settings = $this->get();

        if (isset($input['day_type'])) {
            if (! in_array($input['day_type'], ['weekday', 'holiday', 'long_vacation'], true)) {
                throw ValidationException::withMessages([
                    'day_type' => ['日種別の指定が正しくありません。'],
                ]);
            }
            $settings->day_type = $input['day_type'];
        }

        if (array_key_exists('report_exclude_last_war', $input) && $input['report_exclude_last_war'] !== null) {
            $settings->report_exclude_last_war = (bool) $input['report_exclude_last_war'];
        }

        if (array_key_exists('display_note', $input)) {
            $settings->display_note = $input['display_note'];
        }

        $settings->save();

        return $settings->refresh();
    }
}
