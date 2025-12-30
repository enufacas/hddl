Write-Host "`n========================================"
Write-Host "CLEAN TEST - CSS Transform Optimization"
Write-Host "========================================`n"

$results = @()

for ($i = 1; $i -le 5; $i++) {
    Write-Host "Run $i/5..." -NoNewline
    
    $output = npm run performance 2>&1 | Out-String
    
    $load = if ($output -match 'Loaded in (\d+)ms') { $matches[1] } else { '0' }
    $fcp = if ($output -match 'First Contentful Paint:\s+(\d+)ms') { $matches[1] } else { '0' }
    $avgFps = if ($output -match 'Average FPS:\s+([\d.]+)') { $matches[1] } else { '0' }
    $minFps = if ($output -match 'Min FPS:\s+([\d.]+)') { $matches[1] } else { '0' }
    $maxFps = if ($output -match 'Max FPS:\s+([\d.]+)') { $matches[1] } else { '0' }
    $mem = if ($output -match 'Used JS Heap:\s+([\d.]+) MB') { $matches[1] } else { '0' }
    
    $results += [PSCustomObject]@{
        Run = $i
        Load = [int]$load
        FCP = [int]$fcp
        AvgFPS = [decimal]$avgFps
        MinFPS = [decimal]$minFps
        MaxFPS = [decimal]$maxFps
        Mem = [decimal]$mem
    }
    
    Write-Host " DONE: $load ms, FCP $fcp ms, Avg $avgFps fps" -ForegroundColor Green
}

Write-Host "`n========== RESULTS =========="
$results | Format-Table -AutoSize

$avgLoad = ($results.Load | Measure-Object -Average).Average
$avgFCP = ($results.FCP | Measure-Object -Average).Average
$avgAvgFPS = ($results.AvgFPS | Measure-Object -Average).Average
$avgMinFPS = ($results.MinFPS | Measure-Object -Average).Average
$avgMaxFPS = ($results.MaxFPS | Measure-Object -Average).Average
$avgMem = ($results.Mem | Measure-Object -Average).Average

Write-Host "`nAVERAGES:"
Write-Host "  Load:    $([math]::Round($avgLoad)) ms"
Write-Host "  FCP:     $([math]::Round($avgFCP)) ms"
Write-Host "  Avg FPS: $([math]::Round($avgAvgFPS, 1))"
Write-Host "  Min FPS: $([math]::Round($avgMinFPS, 1))"
Write-Host "  Max FPS: $([math]::Round($avgMaxFPS, 1))"
Write-Host "  Memory:  $([math]::Round($avgMem, 1)) MB"

# Save results
$results | Export-Csv -Path "clean-test-results.csv" -NoTypeInformation
Write-Host "`nResults saved to clean-test-results.csv" -ForegroundColor Cyan
