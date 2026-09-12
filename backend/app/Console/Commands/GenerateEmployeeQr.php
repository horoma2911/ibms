<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Employee;
use Illuminate\Support\Str;

class GenerateEmployeeQr extends Command
{
    protected $signature = 'ibms:generate-employee-qr {--force : Regenerate even when token exists}';
    protected $description = 'Generate QR tokens for employees without tokens (or regenerate when --force is used)';

    public function handle()
    {
        $force = $this->option('force');
        $query = Employee::query();
        $count = 0;
        foreach ($query->cursor() as $emp) {
            if (!$emp->qr_token || $force) {
                $emp->qr_token = Employee::generateUniqueQrToken();
                $emp->qr_generated_at = now();
                $emp->save();
                $count++;
                $this->info("Generated QR for employee {$emp->id}");
            }
        }
        $this->info("Done. Tokens generated: {$count}");
        return 0;
    }
}
