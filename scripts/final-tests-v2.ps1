$base = "http://localhost:3000"
$passed = 0
$failed = 0
$results = @()

function Get-Status { param($u) 
    return [int](docker exec tmopen-api curl -s -o /tmp/.ignore -w "%{http_code}" $u 2>$null)
}
function Get-Body { param($u) 
    $lines = @(docker exec tmopen-api curl -s $u 2>$null)
    return [string]::Join("`n", $lines)
}
function Assert-Contains { param($text, $substr) 
    if ($null -eq $text -or [string]::IsNullOrEmpty($text.ToString())) { Write-Host "      [ERRO] Body VAZIO!" -ForegroundColor Yellow; return $false }
    $str = $text.ToString()
    if ($str.Contains($substr)) { return $true } 
    Write-Host "      [DETALHE] Nao continha: '$substr'" -ForegroundColor Yellow
    return $false 
}

function Test {
    param(
        [string]$ID,
        [string]$Path,
        [int]$ExpectedStatus = 200,
        [string[]]$MustContain = @()
    )
    Write-Host -NoNewline "[$ID] "
    $fullUrl = "$base$Path"
    $st = Get-Status $fullUrl
    $body = Get-Body $fullUrl
    $stOk = ($st -eq $ExpectedStatus)
    $mcOk = $true
    if ($stOk) {
        foreach ($m in $MustContain) { if (-not (Assert-Contains $body $m)) { $mcOk = $false } }
    } else {
        Write-Host "      [STATUS] Esperado $ExpectedStatus, obtido $st" -ForegroundColor Yellow
        if (-not [string]::IsNullOrEmpty($body)) { 
            $p = if ($body.Length -gt 250) { $body.Substring(0, 250) + "..." } else { $body }
            Write-Host "      [BODY] $p" -ForegroundColor DarkGray
        }
    }
    $ok = $stOk -and $mcOk
    $statusTxt = if ($ok) { "PASS" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host ("{0,-5} HTTP {1}/{2}" -f $statusTxt, $st, $ExpectedStatus) -ForegroundColor $color
    $preview = if ([string]::IsNullOrEmpty($body)) { "(vazio)" } elseif ($body.Length -gt 350) { $body.Substring(0, 350) + "..." } else { $body }
    $script:results += [PSCustomObject]@{ ID=$ID; Status=$statusTxt; HTTP="$st/$ExpectedStatus"; Path=$Path; Preview=$preview }
    if ($ok) { $script:passed++ } else { $script:failed++ }
}

Write-Host "============================================"
Write-Host "  SMOKE TESTS H1..H28 (curl via docker exec)"
Write-Host "============================================"

Test H1  /healthz 200 @('"status":"ok"','"db":"ok"')
Test H2  /api/v1 200 @('"version":"1.0.0"','"/cnaes"','"/municipios"','"/naturezas-juridicas"','"/empresas"','"/estabelecimentos"','"/socios"')
Test H3  /api/v1/cnaes 200 @('"codigo":"0000000"','"total":1','"totalPages":1')
Test H4  "/api/v1/municipios?uf=SP" 200 @('"total":1')
Test H5  /api/v1/naturezas-juridicas 200 @('"codigo":"0000"','"total":1')
Test H6  /api/v1/empresas 200 @('"TECHNO MANIA TESTES LTDA"','"cnpj_basico":"12345678"','"total":1')
Test H7  "/api/v1/empresas?razao_social=TECHNO" 200 @('"total":1')
Test H8  "/api/v1/empresas?cnpj_basico=12345678" 200 @('"total":1')
Test H9  "/api/v1/empresas?cnpj_basico=00000000" 200 @('"total":0')
Test H10 "/api/v1/empresas/12345678" 200 @('"cnpj_basico":"12345678"','"opcao_pelo_simples":"S"')
Test H11 "/api/v1/empresas/00000000" 404 @('"error"','"NOT_FOUND"')
Test H12 /api/v1/estabelecimentos 200 @('"total":2')
Test H13 "/api/v1/estabelecimentos?uf=SP" 200 @('"uf":"SP"','"Techno Mania Matriz"','"total":1')
Test H14 "/api/v1/estabelecimentos?uf=RJ" 200 @('"uf":"RJ"','"total":1')
Test H15 "/api/v1/estabelecimentos?situacao_cadastral=2" 200 @('"total":2')
Test H16 "/api/v1/estabelecimentos/12345678000101" 200 @('"cnpj_basico":"12345678"','"cnpj_ordem":"0001"','"uf":"SP"')
Test H17 "/api/v1/estabelecimentos/12.345.678%2F0002-02" 200 @('"cnpj_ordem":"0002"','"uf":"RJ"')
Test H18 "/api/v1/estabelecimentos/00000000000000" 404 @('"error"','"NOT_FOUND"')
Test H19 /api/v1/socios 200 @('"total":2')
Test H20 "/api/v1/socios?nome_socio=silva" 200 @('"JOAO DA SILVA"','"total":1')
Test H21 "/api/v1/socios?cnpj_basico=12345678" 200 @('"total":2')
Test H22 "/api/v1/socios?cnpj_cpf_do_socio=98765432100" 200 @('"MARIA SOUZA"','"total":1')
Test H23 "/api/v1/empresas?page=0" 400 @('"VALIDATION_ERROR"','"page"')
Test H24 "/api/v1/estabelecimentos?uf=SPX" 400 @('"VALIDATION_ERROR"','"error"')
Test H25 "/api/v1/estabelecimentos/1234" 400 @('"VALIDATION_ERROR"','"error"')
Test H26 "/docs/json" 200 @('"openapi"','"TMOpen API"','"1.0.0"','"/api/v1/empresas"','"/api/v1/socios"','"/api/v1/estabelecimentos"','"/api/v1/cnaes"','"Empresas"','"Estabelecimentos"')
Test H27 "/docs/" 200 @('<!doctype html>','<title>')
Test H28 "/api/v1/rota-inexistente-xyz" 404 @('"error"','"NOT_FOUND"')

Write-Host ""
Write-Host "============================================"
Write-Host ("  RESUMO: PASS {0} / {1}   FAIL {2}" -f $passed, $results.Count, $failed)
Write-Host "============================================"
Write-Host ""
$results | Format-Table ID, Status, HTTP, Path -AutoSize | Out-String -Width 220
Write-Host ""
if ($failed -gt 0) {
    Write-Host "=== FAILS (detalhes) ===" -ForegroundColor Red
    $results | Where-Object Status -ne PASS | Format-List ID, HTTP, Path, Preview
    exit 1
} else {
    Write-Host ">>>> TODOS OS 28 TESTES (H1..H28) PASSARAM! <<<<" -ForegroundColor Green
    exit 0
}
