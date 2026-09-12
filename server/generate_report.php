<?php
// Simple PDF generator endpoint using dompdf
// Usage: /server/generate_report.php?type=performance

// Basic safety: ensure autoload exists
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    http_response_code(500);
    echo "Composer autoload not found. Run `composer require dompdf/dompdf` in the project root.`";
    exit;
}

require_once __DIR__ . '/../vendor/autoload.php';

use Dompdf\Dompdf;

$type = isset($_GET['type']) ? preg_replace('/[^a-z0-9_\-]/i','',$_GET['type']) : 'performance';

// Provide any data to template
$data = [
    'type' => $type,
    'generated_at' => date('Y-m-d H:i:s'),
    'company' => 'IBMS',
    'reportTitle' => ucfirst($type) . ' Report',
    'rows' => [
        ['label' => 'Today Sales', 'value' => 'Tshs 1.24M'],
        ['label' => 'Monthly Revenue', 'value' => 'Tshs 8.6M'],
        ['label' => 'Expenses', 'value' => 'Tshs 3.1M'],
    ],
];

// Capture HTML
ob_start();
include __DIR__ . '/report_template.php';
$html = ob_get_clean();

$dompdf = new Dompdf();
$dompdf->loadHtml($html);
$dompdf->setPaper('A4', 'portrait');
$dompdf->render();

$filename = sprintf('report_%s_%s.pdf', $type, date('Ymd_His'));
$dompdf->stream($filename, ['Attachment' => 1]);

exit;
