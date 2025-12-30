$results = @()

for ($i = 1; $i -le 5; $i++) {
    Write-Host "`n========== RUN $i/5 ==========" -ForegroundColor Cyan
    
    $output = & npm run performance 2>&1 | Out-String
    
    # Extract metrics using regex
    $load = if ($output -match 'Loaded in (\d+)ms') { $matches[1] } else { '0' }
    $fcp = if ($output -match 'First Contentful Paint:\s+(\d+)ms') { $matches[1] } else { '0' }
    $avgFps = if ($output -match 'Average FPS:\s+([\d.]+)') { $matches[1] } else { '0' }
    $minFps = if ($output -match 'Min FPS:\s+([\d.]+)') { $matches[1] } else { '0' }
    $maxFps = if ($output -match 'Max FPS:\s+([\d.]+)') { $matches[1] } else { '0' }
    $mem = if ($output -match 'Used JS Heap:\s+([\d.]+) MB') { $matches[1] } else { '0' }
    
    $results += [PSCustomObject]@{
        Run = $i
        'Load (ms)' = $load
        'FCP (ms)' = $fcp
        'Avg FPS' = $avgFps
        'Min FPS' = $minFps
        'Max FPS' = $maxFps
        'Memory (MB)' = $mem
    }
    
    Write-Host "✓ Load: $load ms, FCP: $fcp ms, Avg FPS: $avgFps, Min: $minFps, Max: $maxFps, Mem: $mem MB" -ForegroundColor Green
}

Write-Host "`n========== SUMMARY ==========" -ForegroundColor Cyan
$results | Format-Table -AutoSize

# Calculate averages
$avgLoad = ($results | Measure-Object 'Load (ms)' -Average).Average
$avgFCP = ($results | Measure-Object 'FCP (ms)' -Average).Average
$avgAvgFPS = ($results | Measure-Object 'Avg FPS' -Average).Average
$avgMinFPS = ($results | Measure-Object 'Min FPS' -Average).Average
$avgMaxFPS = ($results | Measure-Object 'Max FPS' -Average).Average
$avgMem = ($results | Measure-Object 'Memory (MB)' -Average).Average

Write-Host "`nAVERAGES:" -ForegroundColor Yellow
Write-Host "  Load: $($avgLoad.ToString('F0')) ms"
Write-Host "  FCP: $($avgFCP.ToString('F0')) ms"
Write-Host "  Avg FPS: $($avgAvgFPS.ToString('F1'))"
Write-Host "  Min FPS: $($avgMinFPS.ToString('F1'))"
Write-Host "  Max FPS: $($avgMaxFPS.ToString('F1'))"
Write-Host "  Memory: $($avgMem.ToString('F1')) MB"
