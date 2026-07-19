<?php

namespace App\Services\Gate2;

use Carbon\Carbon;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

final class Gate2MinimalSmokeRunner
{
    public function __construct(private Application $app) {}

    public function run(string $familyToken): Gate2VerificationResult
    {
        $result = new Gate2VerificationResult;

        try {
            $this->assertHealth($result);
            $this->assertAuthenticatedRead($result, $familyToken);
            $this->assertTaskRecordWriteCycle($result, $familyToken);
        } catch (Throwable $exception) {
            $result->fail('unexpected exception: '.$exception->getMessage());
        } finally {
            Carbon::setTestNow();
        }

        return $result;
    }

    private function assertHealth(Gate2VerificationResult $result): void
    {
        $response = $this->request('GET', '/api/health');
        $payload = $this->decodeJson($response);

        if ($response->getStatusCode() !== 200) {
            $result->fail('health: GET /api/health returned HTTP '.$response->getStatusCode());

            return;
        }

        if (($payload['data']['service'] ?? null) !== 'kurashi-relay-api') {
            $result->fail('health: unexpected service name');

            return;
        }

        $result->pass('health: GET /api/health returned service kurashi-relay-api');
    }

    private function assertAuthenticatedRead(Gate2VerificationResult $result, string $familyToken): void
    {
        $response = $this->request('GET', '/api/dashboard', [], [
            'X-Family-Token' => $familyToken,
        ]);
        $payload = $this->decodeJson($response);

        if ($response->getStatusCode() !== 200) {
            $result->fail('authenticated read: GET /api/dashboard returned HTTP '.$response->getStatusCode());

            return;
        }

        if (($payload['status'] ?? null) !== 'success') {
            $result->fail('authenticated read: GET /api/dashboard did not return success status');

            return;
        }

        $result->pass('authenticated read: GET /api/dashboard returned success');
    }

    private function assertTaskRecordWriteCycle(Gate2VerificationResult $result, string $familyToken): void
    {
        Carbon::setTestNow(Carbon::parse('2026-07-21 08:00:00', 'Asia/Tokyo'));

        $headers = ['X-Family-Token' => $familyToken];
        $idempotencyKey = 'gate2-smoke-'.uniqid('', true);
        $payload = [
            'member' => 'child',
            'task' => 'shokki',
            'date' => '2026-07-21',
            'idempotency_key' => $idempotencyKey,
        ];

        $createResponse = $this->request('POST', '/api/task-records', $payload, $headers);
        $createBody = $this->decodeJson($createResponse);

        if ($createResponse->getStatusCode() !== 201) {
            $result->fail('task-record write: POST /api/task-records returned HTTP '.$createResponse->getStatusCode());

            return;
        }

        $recordId = $createBody['data']['record']['id'] ?? null;

        if (! is_numeric($recordId)) {
            $result->fail('task-record write: created record id missing');

            return;
        }

        $recordId = (int) $recordId;

        $result->pass('task-record write: POST /api/task-records created record '.$recordId);

        $replayResponse = $this->request('POST', '/api/task-records', $payload, $headers);
        $replayBody = $this->decodeJson($replayResponse);

        if ($replayResponse->getStatusCode() !== 200) {
            $result->fail('task-record replay: POST /api/task-records returned HTTP '.$replayResponse->getStatusCode());

            return;
        }

        $replayRecordId = $replayBody['data']['record']['id'] ?? null;

        if (! is_numeric($replayRecordId) || (int) $replayRecordId !== $recordId) {
            $result->fail('task-record replay: idempotency replay returned a different record id');

            return;
        }

        if (($replayBody['meta']['deduplicated'] ?? null) !== true) {
            $result->fail('task-record replay: expected meta.deduplicated=true');

            return;
        }

        $result->pass('task-record replay: same idempotency_key returned record '.$recordId);

        $deleteResponse = $this->request('DELETE', '/api/task-records/'.$recordId, [], $headers);
        $deleteBody = $this->decodeJson($deleteResponse);

        if ($deleteResponse->getStatusCode() !== 200) {
            $result->fail('task-record cancel: DELETE /api/task-records/'.$recordId.' returned HTTP '.$deleteResponse->getStatusCode());

            return;
        }

        $cancelledAt = $deleteBody['data']['record']['cancelled_at'] ?? null;

        if (! is_string($cancelledAt) || $cancelledAt === '') {
            $result->fail('task-record cancel: cancelled_at was not set');

            return;
        }

        $result->pass('task-record cancel: DELETE /api/task-records/'.$recordId.' marked record cancelled');
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $headers
     */
    private function request(string $method, string $uri, array $payload = [], array $headers = []): Response
    {
        $server = [];

        foreach ($headers as $key => $value) {
            $server['HTTP_'.strtoupper(str_replace('-', '_', $key))] = $value;
        }

        $content = in_array($method, ['POST', 'PUT', 'PATCH'], true)
            ? json_encode($payload, JSON_THROW_ON_ERROR)
            : null;

        $request = Request::create($uri, $method, [], [], [], $server, $content);
        $request->headers->set('Accept', 'application/json');

        if ($content !== null) {
            $request->headers->set('Content-Type', 'application/json');
        }

        return $this->app->handle($request);
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeJson(Response $response): array
    {
        $decoded = json_decode($response->getContent(), true);

        return is_array($decoded) ? $decoded : [];
    }
}
