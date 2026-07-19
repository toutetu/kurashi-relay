<?php

namespace Tests\Feature\Database;

use App\Models\ActivityEvent;
use App\Models\FamilyMember;
use App\Models\PlannedActivity;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ModelFactoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_activity_event_factory_creates_valid_row(): void
    {
        $event = ActivityEvent::factory()->create();

        $this->assertDatabaseHas('activity_events', [
            'id' => $event->id,
            'event_type' => 'activity',
            'source' => 'manual',
        ]);
        $this->assertNotNull($event->activity_definition_id);
        $this->assertNotNull($event->recorded_by_member_id);
    }

    public function test_planned_activity_factory_creates_valid_row(): void
    {
        $planned = PlannedActivity::factory()->create();

        $this->assertDatabaseHas('planned_activities', [
            'id' => $planned->id,
            'source_type' => 'manual',
            'status' => 'planned',
        ]);
        $this->assertNotNull($planned->subject_member_id);
    }

    public function test_family_member_factory_creates_valid_row(): void
    {
        $member = FamilyMember::factory()->mother()->create();

        $this->assertDatabaseHas('family_members', [
            'id' => $member->id,
            'role' => 'mother',
        ]);
    }
}
