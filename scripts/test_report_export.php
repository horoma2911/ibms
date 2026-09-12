<?php

function http_post_json($url, $data, $headers = []){
    $opts = [
        'http' => [
            'method' => 'POST',
            'header' => array_merge(["Content-Type: application/json", "Accept: application/json"], $headers),
            'content' => json_encode($data),
            'ignore_errors' => true,
            'timeout' => 10,
        ]
    ];
    $context = stream_context_create($opts);
    $resp = file_get_contents($url, false, $context);
    return [$resp, $http_response_header ?? []];
}

function http_get($url, $headers = []){
    $opts = [
        'http' => [
            'method' => 'GET',
            'header' => $headers,
            'ignore_errors' => true,
            'timeout' => 20,
        ]
    ];
    $context = stream_context_create($opts);
    $resp = file_get_contents($url, false, $context);
    return [$resp, $http_response_header ?? []];
}

$loginUrl = 'http://127.0.0.1:8000/api/auth/login';
list($loginResp, $loginHdr) = http_post_json($loginUrl, ['email'=>'manager@example.com','password'=>'secure-password']);
if (!$loginResp) {
    echo "Login request failed or empty response.\n";
    exit(1);
}
$json = json_decode($loginResp, true);
if (!isset($json['token'])) {
    echo "Login did not return token. Response: " . $loginResp . "\n";
    exit(1);
}
$token = $json['token'];
echo "Obtained token (truncated): " . substr($token,0,20) . "...\n";

$reportUrl = 'http://127.0.0.1:8000/api/reports/generate?type=performance&category=all';
$headers = ["Accept: application/pdf, application/json", "Authorization: Bearer $token"];
list($reportResp, $reportHdr) = http_get($reportUrl, $headers);
$httpStatus = "";
foreach ($reportHdr as $h) {
    if (stripos($h, 'HTTP/') === 0) $httpStatus = $h;
}
echo "Report request status: " . ($httpStatus ?: 'unknown') . "\n";
$ct = null;
foreach ($reportHdr as $h) {
    if (stripos($h, 'Content-Type:') === 0) $ct = trim(substr($h, strlen('Content-Type:')));
}
echo "Content-Type: " . ($ct ?: 'unknown') . "\n";
if ($ct && stripos($ct, 'application/pdf') !== false) {
    $outFile = __DIR__ . '/report_test_output.pdf';
    file_put_contents($outFile, $reportResp);
    echo "Saved PDF to: " . $outFile . "\n";
} else {
    echo "Report response body:\n" . substr($reportResp,0,1000) . "\n";
}

// Also request /api/auth/user to inspect authenticated user details
list($userResp, $userHdr) = http_get('http://127.0.0.1:8000/api/auth/user', ["Authorization: Bearer $token", "Accept: application/json"]);
echo "Auth user response:\n" . $userResp . "\n";

?>