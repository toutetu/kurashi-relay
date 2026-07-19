<?php

namespace App\Console\Commands;

use App\Services\Gate2\Gate2SchemaVerifier;
use Illuminate\Console\Command;

class Gate2VerifyCommand extends Command
{
    protected $signature = 'gate2:verify';

    protected $description = 'Verify Phase C/D1/E target schema, seed counts, and driver-specific constraints for Gate 2';

    public function handle(Gate2SchemaVerifier $verifier): int
    {
        $result = $verifier->verify();

        foreach ($result->entries() as $entry) {
            $line = "[{$entry['status']}] {$entry['message']}";

            match ($entry['status']) {
                'FAIL' => $this->error($line),
                'SKIP' => $this->warn($line),
                default => $this->line($line),
            };
        }

        $this->newLine();
        $this->info(sprintf(
            'Gate 2 verify summary: pass=%d fail=%d skip=%d',
            $result->passCount(),
            $result->failureCount(),
            $result->skipCount(),
        ));

        return $result->isSuccessful() ? self::SUCCESS : self::FAILURE;
    }
}
