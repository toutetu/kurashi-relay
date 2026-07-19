<?php

namespace App\Services\Gate2;

final class Gate2VerificationResult
{
    /** @var list<array{status: string, message: string}> */
    private array $entries = [];

    private int $failureCount = 0;

    private int $passCount = 0;

    private int $skipCount = 0;

    public function pass(string $message): void
    {
        $this->entries[] = ['status' => 'PASS', 'message' => $message];
        $this->passCount++;
    }

    public function fail(string $message): void
    {
        $this->entries[] = ['status' => 'FAIL', 'message' => $message];
        $this->failureCount++;
    }

    public function skip(string $message): void
    {
        $this->entries[] = ['status' => 'SKIP', 'message' => $message];
        $this->skipCount++;
    }

    public function isSuccessful(): bool
    {
        return $this->failureCount === 0;
    }

    public function failureCount(): int
    {
        return $this->failureCount;
    }

    public function passCount(): int
    {
        return $this->passCount;
    }

    public function skipCount(): int
    {
        return $this->skipCount;
    }

    /**
     * @return list<array{status: string, message: string}>
     */
    public function entries(): array
    {
        return $this->entries;
    }
}
