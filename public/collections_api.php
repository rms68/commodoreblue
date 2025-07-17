<?php
// collections_api.php - Updated to use blacklist approach
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

$config = include 'config_directus.php';

// Get type parameter (shop or programs)
$type = $_GET['type'] ?? 'shop';

// For programs, we return a different structure
if ($type === 'programs') {
    // Return program categories
    $programCategories = [
        ['name' => 'All Programs', 'count' => 0],
        ['name' => 'BASIC Programs', 'count' => 0],
        ['name' => 'Games', 'count' => 0],
        ['name' => 'Utilities', 'count' => 0],
        ['name' => 'Demos', 'count' => 0],
        ['name' => 'Educational', 'count' => 0]
    ];
    
    // You could fetch actual counts from the database here
    echo json_encode($programCategories);
    exit;
}

// Original code for shop collections continues...
$directus_url = rtrim($config['base_url'], '/') . '/collections';

$headers = ['Accept: application/json'];
if (!empty($config['api_key'])) {
    $headers[] = 'Authorization: Bearer ' . $config['api_key'];
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $directus_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    echo json_encode(['error' => 'Failed to fetch collections']);
    exit;
}

$data = json_decode($response, true);

// Simple function to get item count
function getItemCount($collectionName, $config, $headers) {
    $items_url = rtrim($config['base_url'], '/') . '/items/' . $collectionName;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $items_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($status == 200) {
        $data = json_decode($response, true);
        if (isset($data['data']) && is_array($data['data'])) {
            return count($data['data']);
        }
    }
    
    return 0;
}

$collections = [];

if (isset($data['data']) && is_array($data['data'])) {
    foreach ($data['data'] as $collection) {
        if (isset($collection['collection'])) {
            $colName = $collection['collection'];
            
            // BLACKLIST approach - exclude system collections and programs
            $excludedCollections = [
                'programs',           // Your programs collection
            ];
            
            // Exclude system collections more intelligently
            $isSystemCollection = false;
            
            // Check if it starts with 'directus_' (case insensitive)
            if (stripos($colName, 'directus_') === 0) {
                $isSystemCollection = true;
            }
            
            // Check if it contains '_files' anywhere in the name (junction tables)
            if (stripos($colName, '_files') !== false) {
                $isSystemCollection = true;
            }
            
            // Check if it's in our specific exclude list
            if (in_array(strtolower($colName), array_map('strtolower', $excludedCollections))) {
                $isSystemCollection = true;
            }
            
            // Only include if it's NOT a system collection
            if (!$isSystemCollection) {
                $itemCount = getItemCount($colName, $config, $headers);
                
                $collections[] = [
                    'name' => $colName,
                    'count' => $itemCount
                ];
            }
        }
    }
}

echo json_encode($collections);
?>