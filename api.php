<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . DIRECTORY_SEPARATOR . 'data';

function respond(array $payload, int $status = 200) {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail_response(string $message, int $status = 400) {
    respond(array('ok' => false, 'error' => $message), $status);
}

function safeFamilyId(string $id): string {
    $id = trim($id);
    if ($id === '' || !preg_match('/^[A-Za-z0-9._-]{1,80}$/', $id)) {
        fail_response('ID de familia no válido.');
    }
    return $id;
}

if (!is_dir($dataDir)) {
    if (!mkdir($dataDir, 0770, true) && !is_dir($dataDir)) {
        fail_response('No se pudo crear data/.', 500);
    }
}

$action = isset($_GET['action']) ? $_GET['action'] : '';

if ($action === 'list') {
    $items = array();
    $files = glob($dataDir . DIRECTORY_SEPARATOR . '*.json');
    if ($files === false) $files = array();

    foreach ($files as $file) {
        $raw = @file_get_contents($file);
        $obj = ($raw !== false) ? json_decode($raw, true) : null;

        $familyId = pathinfo($file, PATHINFO_FILENAME);
        $indication = '';
        $reviewed = false;
        $reviewedAt = '';

        if (is_array($obj)) {
            if (isset($obj['family_id'])) $familyId = (string)$obj['family_id'];
            if (isset($obj['indication'])) $indication = (string)$obj['indication'];

            if (
                isset($obj['review_status']) &&
                is_array($obj['review_status'])
            ) {
                $reviewed =
                    isset($obj['review_status']['reviewed']) &&
                    $obj['review_status']['reviewed'] === true;

                if (
                    $reviewed &&
                    isset($obj['review_status']['reviewed_at'])
                ) {
                    $reviewedAt =
                        (string)$obj['review_status']['reviewed_at'];
                }
            }
        }

        $items[] = array(
            'family_id' => $familyId,
            'indication' => $indication,
            'reviewed' => $reviewed,
            'reviewed_at' => $reviewedAt,
            'modified' => date(DATE_ATOM, (int)filemtime($file))
        );
    }

    usort($items, function ($a, $b) {
        return strcmp($a['family_id'], $b['family_id']);
    });

    respond(array('ok' => true, 'families' => $items));
}

if ($action === 'load') {
    $id = safeFamilyId(isset($_GET['id']) ? (string)$_GET['id'] : '');
    $file = $dataDir . DIRECTORY_SEPARATOR . $id . '.json';

    if (!is_file($file)) fail_response('No existe el caso.', 404);

    $raw = file_get_contents($file);
    if ($raw === false) fail_response('No se pudo leer el caso.', 500);

    $data = json_decode($raw, true);
    if (!is_array($data)) fail_response('JSON almacenado no válido.', 500);

    respond(array('ok' => true, 'family' => $data));
}

if ($action === 'delete') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail_response('Método no permitido.', 405);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw !== false ? $raw : '', true);

    if (!is_array($data)) {
        fail_response('JSON recibido no válido.');
    }

    $id = safeFamilyId(
        isset($data['family_id'])
            ? (string)$data['family_id']
            : ''
    );

    $file =
        $dataDir .
        DIRECTORY_SEPARATOR .
        $id .
        '.json';

    if (!is_file($file)) {
        fail_response('No existe el caso.', 404);
    }

    if (!@unlink($file)) {
        fail_response(
            'No se pudo borrar el caso. Revisa permisos en data/.',
            500
        );
    }

    respond(array(
        'ok' => true,
        'family_id' => $id
    ));
}

if ($action === 'save') {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        fail_response('Método no permitido.', 405);
    }

    $raw = file_get_contents('php://input');
    $data = json_decode($raw !== false ? $raw : '', true);

    if (!is_array($data)) fail_response('JSON recibido no válido.');

    $id = safeFamilyId(isset($data['family_id']) ? (string)$data['family_id'] : '');

    if (!isset($data['people']) || !is_array($data['people'])) {
        fail_response("Falta 'people'.");
    }

    if (!isset($data['relationships']) || !is_array($data['relationships'])) {
        fail_response("Falta 'relationships'.");
    }

    $data['family_id'] = $id;
    $data['updated_at'] = date(DATE_ATOM);

    $json = json_encode(
        $data,
        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
    );

    if ($json === false) fail_response('No se pudo serializar.', 500);

    $file = $dataDir . DIRECTORY_SEPARATOR . $id . '.json';
    $tmp = $file . '.tmp.' . uniqid();

    if (file_put_contents($tmp, $json . PHP_EOL, LOCK_EX) === false) {
        fail_response('No se pudo escribir en data/. Revisa permisos.', 500);
    }

    if (!rename($tmp, $file)) {
        @unlink($tmp);
        fail_response('No se pudo finalizar el guardado.', 500);
    }

    @chmod($file, 0660);

    respond(array(
        'ok' => true,
        'family_id' => $id,
        'updated_at' => $data['updated_at']
    ));
}

fail_response('Acción no válida.', 404);
