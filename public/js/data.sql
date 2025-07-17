<?php
// setup_basic_db.php - Run this once to set up the database
// Access: https://commodoreblue.com/setup_basic_db.php

$host = 'localhost:3306';
$username = 'rsoussan';
$password = '3611Sketch88';

try {
    // Connect to MySQL server (no database selected)
    $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h2>Setting up basic_db database...</h2>";
    
    // Create database
    $pdo->exec("CREATE DATABASE IF NOT EXISTS basic_db");
    echo "✓ Database 'basic_db' created/verified<br>";
    
    // Use the database
    $pdo->exec("USE basic_db");
    
    // Create programs table
    $sql = "CREATE TABLE IF NOT EXISTS programs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        filename VARCHAR(20) NOT NULL,
        title VARCHAR(100) NOT NULL,
        author VARCHAR(50) DEFAULT 'ANONYMOUS',
        blocks INT DEFAULT 0,
        type VARCHAR(20) DEFAULT 'PRG',
        requires VARCHAR(20) DEFAULT 'C64',
        description TEXT,
        code LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_filename (filename)
    )";
    
    $pdo->exec($sql);
    echo "✓ Table 'programs' created/verified<br>";
    
    // Check if we already have programs
    $count = $pdo->query("SELECT COUNT(*) FROM programs")->fetchColumn();
    
    if ($count == 0) {
        echo "<br>Adding initial programs...<br>";
        
        // Add your tic tac toe game
        $tictactoe_code = '10 PRINT
20 C1=3:C2=7     :REM RED , YELLOW
25 BR=3          :REM BORDER (6 = BLUE)
30 BG=0          :REM BACKGROUND (6 = BLUE)
40 FG=3          :REM FOREGROUND / FRAME / TEXT (1 = WHITE)
[... PASTE YOUR FULL TIC TAC TOE CODE HERE ...]
5240 RETURN';
        
        $stmt = $pdo->prepare("INSERT INTO programs (filename, title, author, blocks, type, requires, description, code) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        
        // Insert programs
        $programs = [
            ['TICTACTOE.BAS', 'TIC TAC TOE 2025', 'RSOUSSAN', 52, 'GAME', 'C64', 'Two-player tic tac toe with graphics and sound', $tictactoe_code],
            ['HELLO.BAS', 'HELLO WORLD', 'SYSTEM', 1, 'DEMO', 'BASIC', 'Simple hello world demo', '10 PRINT "HELLO WORLD!"
20 FOR I = 1 TO 10
30 PRINT "COMMODORE 64 ROCKS!"
40 NEXT I
50 END'],
            ['SINEWAVE.BAS', 'SINE WAVE DEMO', 'SYSTEM', 3, 'DEMO', 'BASIC', 'Animated sine wave display', '10 REM SINE WAVE DEMO
20 FOR X = 0 TO 39
30 Y = 12 + INT(10 * SIN(X/5))
40 PRINT TAB(X); "*"
50 NEXT X
60 GOTO 20']
        ];
        
        foreach ($programs as $program) {
            $stmt->execute($program);
            echo "✓ Added: " . $program[0] . "<br>";
        }
    } else {
        echo "<br>Database already contains $count programs.<br>";
    }
    
    // Show current programs
    echo "<br><h3>Current Programs in Database:</h3>";
    echo "<table border='1' cellpadding='5'>";
    echo "<tr><th>ID</th><th>Filename</th><th>Title</th><th>Blocks</th><th>Type</th></tr>";
    
    $stmt = $pdo->query("SELECT id, filename, title, blocks, type FROM programs ORDER BY filename");
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "<tr>";
        echo "<td>{$row['id']}</td>";
        echo "<td>{$row['filename']}</td>";
        echo "<td>{$row['title']}</td>";
        echo "<td>{$row['blocks']}</td>";
        echo "<td>{$row['type']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    echo "<br><strong>Setup complete!</strong><br>";
    echo "<br><em>Security note: Delete this file after setup is complete.</em>";
    
} catch (PDOException $e) {
    echo "<h2>Setup Error:</h2>";
    echo "<pre>" . $e->getMessage() . "</pre>";
}
?>