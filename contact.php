<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Método no permitido']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);

if (!is_array($data)) {
    $data = $_POST;
}

$nombre = trim($data['nombre'] ?? '');
$email = trim($data['email'] ?? '');
$telefono = trim($data['telefono'] ?? '');
$servicio = trim($data['servicio'] ?? '');
$mensaje = trim($data['mensaje'] ?? '');

if ($nombre === '' || $email === '' || $mensaje === '') {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Faltan completar campos obligatorios.']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode(['success' => false, 'message' => 'Email inválido.']);
    exit;
}

$recipient = 'hola@blomsterflower.com';
$subject = 'Nuevo contacto - ' . ($servicio !== '' ? $servicio : 'Blomster Flower');

$bodyLines = [
    "Nombre: {$nombre}",
    "Email: {$email}",
    "Teléfono: " . ($telefono !== '' ? $telefono : '-'),
    "Servicio: " . ($servicio !== '' ? $servicio : '-'),
    "",
    $mensaje
];
$body = implode("\n", $bodyLines);

$smtpConfig = [
    'host' => 'guarani.lineadns.com',
    'port' => 465,
    'username' => 'info@blomsterflower.com.ar',
    'password' => 'rH-jSi8y08;1WM',
    'from_email' => 'info@blomsterflower.com.ar',
    'from_name' => 'Blomster Flower'
];

try {
    sendSmtpMail($smtpConfig, $recipient, $subject, $body, "{$nombre} <{$email}>");
    echo json_encode(['success' => true, 'message' => 'Mensaje enviado correctamente.']);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'No se pudo enviar el email.', 'error' => $e->getMessage()]);
}

function sendSmtpMail(array $config, string $to, string $subject, string $body, string $replyTo): void
{
    $host = $config['host'];
    $port = (int)$config['port'];
    $username = $config['username'];
    $password = $config['password'];
    $fromEmail = $config['from_email'];
    $fromName = $config['from_name'];

    $context = stream_context_create([
        'ssl' => [
            'verify_peer' => false,
            'verify_peer_name' => false
        ]
    ]);

    $socket = @stream_socket_client(
        "ssl://{$host}:{$port}",
        $errno,
        $errstr,
        30,
        STREAM_CLIENT_CONNECT,
        $context
    );

    if (!$socket) {
        throw new RuntimeException("No se pudo conectar al servidor SMTP: {$errstr} ({$errno})");
    }

    stream_set_timeout($socket, 30);

    smtp_expect($socket, 220);
    smtp_command($socket, "EHLO blomsterflower.com");
    smtp_expect($socket, 250);

    smtp_command($socket, "AUTH LOGIN");
    smtp_expect($socket, 334);

    smtp_command($socket, base64_encode($username));
    smtp_expect($socket, 334);

    smtp_command($socket, base64_encode($password));
    smtp_expect($socket, 235);

    smtp_command($socket, "MAIL FROM:<{$fromEmail}>");
    smtp_expect($socket, 250);

    smtp_command($socket, "RCPT TO:<{$to}>");
    smtp_expect($socket, 250);

    smtp_command($socket, "DATA");
    smtp_expect($socket, 354);

    $headers = [
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'From: ' . formatAddress($fromName, $fromEmail),
        'Reply-To: ' . $replyTo,
        'Date: ' . date(DATE_RFC2822),
        'Message-ID: <' . uniqid('', true) . '@blomsterflower.com>'
    ];

    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body;
    $safeMessage = preg_replace('/^\./m', '..', str_replace("\n", "\r\n", $message));

    fwrite($socket, $safeMessage . "\r\n.\r\n");
    smtp_expect($socket, 250);

    smtp_command($socket, "QUIT");
    fclose($socket);
}

function smtp_command($socket, string $command): void
{
    fwrite($socket, $command . "\r\n");
}

function smtp_expect($socket, int $code): void
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    if ((int)substr($response, 0, 3) !== $code) {
        throw new RuntimeException("Error SMTP ({$code} esperado): {$response}");
    }
}

function formatAddress(string $name, string $email): string
{
    $encoded = '=?UTF-8?B?' . base64_encode($name) . '?=';
    return "{$encoded} <{$email}>";
}
