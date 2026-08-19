$base = "http://localhost:3000"
$passed = 0
$failed = 0
$results = @()

function Curl-Json { param($url) 
    $out = docker exec tmopen-api curl -s $url 2>$null
    return $out
}

function Curl-StatusAndBody { param($url) 
    $tmp = docker exec tmopen-api curl -s -w "\n<STATUS>%{http_code}</STATUS>\n" $url 2>$null
    $statusMatch = [regex]::Match($tmp, '<STATUS>(\d+)</STATUS>')
    $status = [int]$statusMatch.Groups[1].Value
    $body = $tmp.Substring(0, $statusMatch.Index)
    return @{ Status = $status; Body = $body }
}

function Assert-Contains { param($text, $substr) if ($text -like "*$substr*") { return $true } else { Write-Host "      [DETALHE] Esperava conter: '$substr'" -ForegroundColor Yellow; return $false } }

function Test {
    param(
        [string]$ID,
        [string]$Path,
        [int]$ExpectedStatus = 200,
        [string[]]$MustContain = @(),
        [string[]]$MustNotContain = @()
    )
    Write-Host -NoNewline "[$ID] "
    $r = Curl-StatusAndBody "$base$Path"
    $stOk = ($r.Status -eq $ExpectedStatus)
    $mcOk = $true
    foreach ($m in $MustContain) { if (-not (Assert-Contains $r.Body $m)) { $mcOk = $false } }
    $mncOk = $true
    foreach ($m in $MustNotContain) { if (Assert-Contains $r.Body $m) { $mncOk = $false } }
    $ok = $stOk -and $mcOk -and $mncOk
    $statusTxt = if ($ok) { "PASS" } else { "FAIL" }
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host ("{0,-5} HTTP {1}/{2}" -f $statusTxt, $r.Status, $ExpectedStatus) -ForegroundColor $color
    if (-not $stOk) { Write-Host "      [STATUS] Esperado $ExpectedStatus, obtido $($r.Status)" -ForegroundColor Yellow }
    $preview = if ($r.Body.Length -gt 350) { $r.Body.Substring(0, 350) + "..." } else { $r.Body }
    $script:results += [PSCustomObject]@{ ID=$ID; Status=$statusTxt; HTTP="$($r.Status)/$ExpectedStatus"; Path=$Path; Preview=$preview }
    if ($ok) { $script:passed++ } else { $script:failed++ }
}

Write-Host "============================================"
Write-Host "  SMOKE TESTS H1..H28 (via curl no container)"
Write-Host "============================================"

# H1 healthz
Test H1 /healthz 200 @('"status":"ok"','"db":"ok"')

# H2 api/v1 info
Test H2 /api/v1 200 @('"version":"1.0.0"','"/cnaes"','"/municipios"','"/naturezas-juridicas"','"/empresas"','"/estabelecimentos"','"/socios"','"/empresas/{cnpj}"','"/estabelecimentos/{cnpj}"')

# H3 cnaes
Test H3 /api/v1/cnaes 200 @('"codigo":"0000000"','"total":1','"totalPages":1')

# H4 municipios uf=SP
Test H4 "/api/v1/municipios?uf=SP" 200 @('"descricao":"São Paulo"','"uf":"SP"','"total":1')

# H5 naturezas-juridicas
Test H5 /api/v1/naturezas-juridicas 200 @('"codigo":"0000"','"Não informada"','"total":1')

# H6 empresas list
Test H6 /api/v1/empresas 200 @('"TECHNO MANIA TESTES LTDA"','"cnpj_basico":"12345678"','"total":1')

# H7 filtro razao_social case insensitive
Test H7 "/api/v1/empresas?razao_social=TECHNO" 200 @('"total":1')

# H8 filtro cnpj_basico
Test H8 "/api/v1/empresas?cnpj_basico=12345678" 200 @('"total":1')

# H9 filtro cnpj_basico inexistente
Test H9 "/api/v1/empresas?cnpj_basico=00000000" 200 @('"total":0')

# H10 empresa detail aggregate
Test H10 "/api/v1/empresas/12345678" 200 @(
    '"empresa":{',
    '"cnpj_basico":"12345678"',
    '"estabelecimentos":[',
    '"socios":[',
    '"dados_simples":{',
    '"opcao_pelo_simples":"S"'
)

# H11 empresa detail 404
Test H11 "/api/v1/empresas/00000000" 404 @('"error":', '"NOT_FOUND"')

# H12 estabelecimentos list
Test H12 "/api/v1/estabelecimentos" 200 @('"total":2')

# H13 filtro uf=SP
Test H13 "/api/v1/estabelecimentos?uf=SP" 200 @('"uf":"SP"','"Techno Mania Matriz"','"total":1')

# H14 filtro uf=RJ
Test H14 "/api/v1/estabelecimentos?uf=RJ" 200 @('"uf":"RJ"','"total":1')

# H15 filtro situacao_cadastral=2
Test H15 "/api/v1/estabelecimentos?situacao_cadastral=2" 200 @('"total":2')

# H16 estabelecimento detail 14 digitos
Test H16 "/api/v1/estabelecimentos/12345678000101" 200 @('"cnpj_basico":"12345678"','"cnpj_ordem":"0001"','"uf":"SP"')

# H17 estabelecimento formatado com pontuacao URL encoded
Test H17 "/api/v1/estabelecimentos/12.345.678%2F0002-02" 200 @('"cnpj_ordem":"0002"','"uf":"RJ"')

# H18 estabelecimento 404
Test H18 "/api/v1/estabelecimentos/00000000000000" 404 @('"error":', '"NOT_FOUND"')

# H19 socios list
Test H19 "/api/v1/socios" 200 @('"total":2')

# H20 filtro nome_socio case insens
Test H20 "/api/v1/socios?nome_socio=silva" 200 @('"JOAO DA SILVA"','"total":1')

# H21 filtro cnpj_basico
Test H21 "/api/v1/socios?cnpj_basico=12345678" 200 @('"total":2')

# H22 filtro cnpj_cpf_do_socio
Test H22 "/api/v1/socios?cnpj_cpf_do_socio=98765432100" 200 @('"MARIA SOUZA"','"total":1')

# H23 validacao page min=1
Test H23 "/api/v1/empresas?page=0" 400 @('"VALIDATION_ERROR"','"page"','"Number must be greater than or equal to 1"')

# H24 validacao uf length 2 (SPX=3)
Test H24 "/api/v1/estabelecimentos?uf=SPX" 400 @('"VALIDATION_ERROR"','"error":')

# H25 validacao cnpj 14 digitos (1234=4)
Test H25 "/api/v1/estabelecimentos/1234" 400 @('"VALIDATION_ERROR"','"error":')

# H26 docs/json openapi
$h26 = Curl-StatusAndBody "$base/docs/json"
Test H26 "/docs/json" 200 @('"openapi":','"/api/v1/empresas"','"/api/v1/socios"','"/api/v1/estabelecimentos"','"Domínio"','"Empresas"','"Estabelecimentos"','"Sócios"')

# H27 docs UI scalar text/html
$h27html = docker exec tmopen-api curl -s -I "$base/docs/" 2>$null
$h27html2 = Curl-Json "/docs/"  # usar GET normal
Test H27 "/docs/" 200 @("<!doctype html>", "scalar", "Scalar")
# extra check: se o response header tem text/html (via curl -I)

# H28 rota inexistente 404 padronizado
Test H28 "/api/v1/rota-inexistente-xyz" 404 @('"error":', '"NOT_FOUND"')

Write-Host ""
Write-Host "============================================"
Write-Host ("  RESUMO: PASS {0} / {1}  |  FAIL {2}" -f $passed, $results.Count, $failed)
Write-Host "============================================"
Write-Host ""
$results | Format-Table ID, Status, HTTP, Path -AutoSize
Write-Host ""
if ($failed -gt 0) {
    Write-Host "=== FAILs ===" -ForegroundColor Red
    $results | Where-Object Status -ne PASS | Format-List ID, HTTP, Path, Preview
    exit 1
} else {
    Write-Host ">>>> TODOS OS 28 TESTES (H1..H28) PASSARAM! <<<<" -ForegroundColor Green
    exit 0
}
