<?php
// public/products_api.php - DYNAMIC VERSION
// Auto-detects collection fields and adapts accordingly

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Load Directus configuration
$config = include 'config_directus.php';

// Use the provided collection parameter, or fall back to the config file's default.
$collection = $_GET['collection'] ?? $config['collection'];

// Configure request headers if API key is provided
$headers = [];
if (!empty($config['api_key'])) {
    $headers = [
        'Authorization: Bearer ' . $config['api_key']
    ];
}

// STEP 1: Get collection field structure dynamically
function getCollectionFields($collection, $config, $headers) {
    $fields_url = rtrim($config['base_url'], '/') . '/fields/' . $collection;
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fields_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($status == 200) {
        $data = json_decode($response, true);
        if (isset($data['data'])) {
            return $data['data'];
        }
    }
    
    error_log("Failed to get fields for collection: $collection");
    return [];
}

// STEP 2: Build dynamic fields query based on what exists
function buildFieldsQuery($collectionFields) {
    $fields = ['*']; // Always include all basic fields
    
    foreach ($collectionFields as $field) {
        $fieldName = $field['field'];
        $fieldType = $field['type'] ?? '';
        $fieldSpecial = $field['meta']['special'] ?? [];
        
        // Make special into array if it's not
        if (!is_array($fieldSpecial)) {
            $fieldSpecial = $fieldSpecial ? [$fieldSpecial] : [];
        }
        
        // Detect ANY file-related field regardless of configuration
        $isFileField = false;
        
        // Method 1: Direct file type
        if ($fieldType === 'file') {
            $isFileField = true;
        }
        
        // Method 2: UUID with file special (Directus file reference)
        elseif ($fieldType === 'uuid' && in_array('file', $fieldSpecial)) {
            $isFileField = true;
        }
        
        // Method 3: M2M or O2M relationships
        elseif (in_array($fieldType, ['m2m', 'o2m'])) {
            $relatedCollection = $field['meta']['one_collection'] ?? $field['meta']['many_collection'] ?? '';
            // Check if it's related to directus_files
            if (strpos($relatedCollection, 'files') !== false || strpos($relatedCollection, 'directus_files') !== false) {
                $fields[] = $fieldName . '.directus_files_id.*';
                error_log("Added M2M expansion for field: $fieldName");
                continue;
            }
        }
        
        // Method 4: Field name suggests it's an image/file
        elseif (preg_match('/image|photo|picture|media|file|attachment/i', $fieldName)) {
            $isFileField = true;
        }
        
        // Add file field expansion if detected
        if ($isFileField) {
            $fields[] = $fieldName . '.*';
        }
    }
    
    return implode(',', $fields);
}

// STEP 3: Get collection fields and build dynamic query
error_log("Fetching fields for collection: $collection");
$collectionFields = getCollectionFields($collection, $config, $headers);

if (empty($collectionFields)) {
    error_log("No fields found for collection: $collection");
    echo json_encode([
        'error' => 'Collection not found or no fields available',
        'collection' => $collection
    ]);
    exit;
}

// Log detected fields for debugging
$fieldNames = array_map(function($f) { return $f['field']; }, $collectionFields);
error_log("Detected fields: " . implode(', ', $fieldNames));

// Build the dynamic fields query
$dynamicFields = buildFieldsQuery($collectionFields);
error_log("Dynamic fields query: $dynamicFields");

// Build the Directus items endpoint with dynamic fields
$directus_url = rtrim($config['base_url'], '/') 
  . '/items/' . $collection 
  . '?fields=' . urlencode($dynamicFields);

// Optional: handle `query` param for filtering by name, etc.
$query = $_GET['query'] ?? '';
if ($query) {
    $directus_url .= '&filter[name][_contains]=' . urlencode($query);
}

// Add debugging log
error_log("Fetching from Directus URL: $directus_url");

// Set up cURL for better debugging
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $directus_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);

// Execute the request
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false || $status != 200) {
    error_log("Error fetching from Directus: $error (Status: $status)");
    http_response_code(500);
    echo json_encode([
        'error' => 'Unable to fetch data from Directus API',
        'url'   => $directus_url,
        'status' => $status,
        'curl_error' => $error,
        'collection' => $collection
    ]);
    exit;
}

$data = json_decode($response, true);

// STEP 4: Dynamic field mapping - detect image fields automatically
if (isset($data['data']) && is_array($data['data'])) {
    $products = [];
    foreach ($data['data'] as $item) {
        // Build an array of all file URLs from detected image fields
        $allFiles = [];
        
        // Helper function to add a file URL with auth token
        $addFileToArray = function($fileId) use (&$allFiles, $config) {
            // Strict validation to prevent empty/invalid file IDs
            if (empty($fileId) || !is_string($fileId) || strlen($fileId) < 10) {
                error_log("Skipping invalid file ID: " . var_export($fileId, true));
                return;
            }
            
            // Add the access token to the URL
            $fileUrl = rtrim($config['base_url'], '/') . '/assets/' . $fileId;
            
            // Add access token if provided
            if (!empty($config['api_key'])) {
                $fileUrl .= '?access_token=' . urlencode($config['api_key']);
            }
            
            $allFiles[] = $fileUrl;
            error_log("Added valid file ID: $fileId");
        };
        
        // Track single_image separately
        $singleImageUrl = '';
        
        // Dynamically detect and process ANY image field regardless of configuration
        foreach ($collectionFields as $field) {
            $fieldName = $field['field'];
            $fieldType = $field['type'] ?? '';
            $fieldSpecial = $field['meta']['special'] ?? [];
            
            if (!isset($item[$fieldName]) || empty($item[$fieldName])) continue;
            
            // Make special into array if it's not
            if (!is_array($fieldSpecial)) {
                $fieldSpecial = $fieldSpecial ? [$fieldSpecial] : [];
            }
            
            $isFileField = false;
            $fieldValue = $item[$fieldName];
            
            // Special debug logging for files field
            if ($fieldName === 'files' && is_array($fieldValue)) {
                error_log("Files field structure for product {$item['id']}: " . json_encode($fieldValue));
            }
            
            // Detection Method 1: Field type is 'file'
            if ($fieldType === 'file') {
                $isFileField = true;
            }
            
            // Detection Method 2: UUID with file special (standard Directus file reference)
            elseif ($fieldType === 'uuid' && in_array('file', $fieldSpecial)) {
                $isFileField = true;
            }
            
            // Detection Method 3: Field name suggests it's a file/image
            elseif (preg_match('/^(single_|many_)?(image|photo|picture|file|attachment)s?$/i', $fieldName)) {
                $isFileField = true;
            }
            
            // Detection Method 4: Value structure suggests it's a file
            elseif (is_array($fieldValue) && isset($fieldValue['id'])) {
                $isFileField = true;
            }
            
            // Process file field
            if ($isFileField) {
                if (is_array($fieldValue)) {
                    if (isset($fieldValue['id'])) {
                        $fileId = $fieldValue['id'];
                        
                        // If this is single_image field, track it separately
                        if ($fieldName === 'single_image') {
                            $singleImageUrl = rtrim($config['base_url'], '/') . '/assets/' . $fileId;
                            if (!empty($config['api_key'])) {
                                $singleImageUrl .= '?access_token=' . urlencode($config['api_key']);
                            }
                        } else {
                            $addFileToArray($fileId);
                        }
                    }
                } elseif (is_string($fieldValue) && $fieldValue) {
                    // If this is single_image field, track it separately
                    if ($fieldName === 'single_image') {
                        $singleImageUrl = rtrim($config['base_url'], '/') . '/assets/' . $fieldValue;
                        if (!empty($config['api_key'])) {
                            $singleImageUrl .= '?access_token=' . urlencode($config['api_key']);
                        }
                    } else {
                        $addFileToArray($fieldValue);
                    }
                }
            }
            
            // Handle M2M/O2M file relationships (this is for the 'files' field)
            elseif (in_array($fieldType, ['m2m', 'o2m']) && is_array($fieldValue)) {
                error_log("Processing M2M field '$fieldName' with " . count($fieldValue) . " items");
                
                foreach ($fieldValue as $index => $rel) {
                    error_log("M2M item $index structure: " . json_encode($rel));
                    
                    // Handle different possible structures
                    if (isset($rel['directus_files_id'])) {
                        if (is_array($rel['directus_files_id']) && isset($rel['directus_files_id']['id'])) {
                            // Nested structure: junction -> file object -> id
                            $addFileToArray($rel['directus_files_id']['id']);
                        } elseif (is_string($rel['directus_files_id'])) {
                            // Direct file ID in junction
                            $addFileToArray($rel['directus_files_id']);
                        }
                    } elseif (isset($rel['id'])) {
                        // Fallback to rel id
                        error_log("Using fallback rel['id'] for M2M");
                        $addFileToArray($rel['id']);
                    }
                }
            }
        }

        // Log file detection
        error_log("Product ID: {$item['id']}, Single Image: " . ($singleImageUrl ? 'yes' : 'no') . ", Files found: " . count($allFiles));

        // Ensure we have unique files
        $allFiles = array_unique($allFiles);

        // Use single_image for image_url if available, otherwise use first file
        $imageUrl = $singleImageUrl ?: ((count($allFiles) > 0) ? $allFiles[0] : '');

        // Use standardized field names - no fallbacks needed
        $price = isset($item['price']) ? (float)$item['price'] : 0;
        $stock = isset($item['stock']) ? (int)$item['stock'] : 0;

        // Special handling for programs collection
        if ($collection === 'programs') {
            $products[] = [
                'product_id'  => $item['id'],
                'name'        => $item['name'] ?? 'Unnamed Program',
                'description' => $item['description'] ?? '',
                'price'       => 0,  // Programs are free
                'stock'       => 999, // Unlimited stock for programs
                'image_url'   => $imageUrl,
                'single_image' => $singleImageUrl,
                'files'       => $allFiles,
                'category'    => 'programs',
                'filetype'    => $item['filetype'] ?? 'BASIC',  // Using standardized field name
                'author'      => $item['author'] ?? '',
                'filename'    => $item['filename'] ?? '',
                'date_created' => $item['date_created'] ?? '',
                'date_updated' => $item['date_updated'] ?? ''
            ];
        } else {
            // Regular products
            $products[] = [
                'product_id'  => $item['id'],
                'name'        => $item['name'] ?? 'Unnamed Product',
                'description' => $item['description'] ?? '',
                'price'       => $price,
                'stock'       => $stock,
                'image_url'   => $imageUrl,
                'single_image' => $singleImageUrl,
                'files'       => $allFiles,
                'category'    => $item['category'] ?? $collection,
                'date_created' => $item['date_created'] ?? '',
                'date_updated' => $item['date_updated'] ?? ''
            ];
        }
    }

    // Log the response for debugging
    error_log("Products API returning " . count($products) . " products for collection: $collection");
    
    echo json_encode($products);
} else {
    error_log("No data array found in Directus response for collection: $collection");
    echo json_encode([]);
}
?>