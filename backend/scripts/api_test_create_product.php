<?php
$url = 'http://127.0.0.1:8000/api/products';
$data = json_encode([
    'name' => 'API Test Rice',
    'sku' => 'API-RICE-' . time(),
    'category_id' => null,
    'cost' => 100,
    'price' => 120,
    'stock' => 0,
    'unit' => 'kg',
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
$resp = json_decode($res, true);
if (isset($resp['id'])) {
    file_put_contents(__DIR__ . '/last_created_product.json', json_encode($resp));
}
