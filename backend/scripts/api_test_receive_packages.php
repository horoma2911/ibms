<?php
$meta = @json_decode(@file_get_contents(__DIR__ . '/last_created_product.json'), true);
if (!isset($meta['id'])) {
    echo "No product id found in last_created_product.json\n";
    exit(1);
}
$id = $meta['id'];
$url = "http://127.0.0.1:8000/api/products/{$id}/receive-packages";
$data = json_encode([
    'packages' => [
        ['size' => 25, 'count' => 2],
        ['size' => 10, 'count' => 3],
    ],
]);
$opts = [
    'http' => [
        'method' => 'POST',
        'header' => "Content-Type: application/json\r\n",
        'content' => $data,
        'timeout' => 5,
    ],
];
$res = @file_get_contents($url, false, stream_context_create($opts));
if ($res === false) {
    $err = error_get_last();
    echo "ERROR: ", ($err['message'] ?? 'unknown'), PHP_EOL;
    exit(1);
}
echo $res, PHP_EOL;
file_put_contents(__DIR__ . '/last_receive_response.json', $res);
