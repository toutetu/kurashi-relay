<?php

namespace App\Exceptions;

use RuntimeException;

final class IdempotencyConflictException extends RuntimeException {}
