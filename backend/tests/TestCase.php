<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        $this->serverVariables = array_replace($this->serverVariables, [
            'HTTP_X_FAMILY_TOKEN' => (string) env('FAMILY_TOKEN', 'test-family-token'),
        ]);
    }

    protected function withoutFamilyToken(): static
    {
        $this->flushHeaders();
        $this->serverVariables = array_replace($this->serverVariables, [
            'HTTP_X_FAMILY_TOKEN' => '',
        ]);

        return $this;
    }

    protected function withInvalidFamilyToken(string $token = 'invalid-token'): static
    {
        $this->flushHeaders();
        $this->serverVariables = array_replace($this->serverVariables, [
            'HTTP_X_FAMILY_TOKEN' => $token,
        ]);

        return $this->withHeader('X-Family-Token', $token);
    }

    protected function withFamilyToken(?string $token = null): static
    {
        $token ??= (string) env('FAMILY_TOKEN', 'test-family-token');

        $this->flushHeaders();
        $this->serverVariables = array_replace($this->serverVariables, [
            'HTTP_X_FAMILY_TOKEN' => $token,
        ]);

        return $this->withHeader('X-Family-Token', $token);
    }
}
