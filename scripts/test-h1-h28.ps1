$base = "http://localhost:3000"
$report = @()

function Run-Test {
    param(
        [string]$ID,
        [string]$Method = "GET",
        [string]$Path,
        [int]$Expected = 200,
        [string[]]$Checks = @()
    )
    $status = 0
    $body = ""
    $json = $null
    try {
        $resp = Invoke-WebRequest -Uri "$base$Path" -Method $Method -UseBasicParsing -TimeoutSec 15 -ErrorAction Stop
        $status = [int]$resp.StatusCode
        $body = [System.Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray())
    } catch {
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                $reader.Close()
            } catch {}
        }
    }
    try { $json = $body | ConvertFrom-Json -Depth 20 } catch {}

    $ok = ($status -eq $Expected)
    $notes = @()
    if (-not $ok) { $notes += "HTTP status esperado=$Expected, obtido=$status" }

    foreach ($c in $Checks) {
        try {
            $res = Invoke-Expression "`$result = 0; `$j = `$json; `$b = `$body; `$s = `$status; $c"
            if ($res -eq $false) { $ok = $false; $notes += "Check falhou: $c" }
            elseif ($res -is [string]) { $notes += $res }
        } catch {
            $ok = $false; $notes += "Check exception: $c -> $_"
        }
    }

    $preview = if ($body.Length -gt 250) { $body.Substring(0,250) + "..." } else { $body }
    $row = [PSCustomObject]@{
        ID = $ID
        Status = if ($ok) { "PASS" } else { "FAIL" }
        HTTP = "$status/$Expected"
        Path = $Path
        Notes = ($notes -join " | ")
        BodyPreview = $preview
    }
    $global:report += $row
    $color = if ($ok) { "Green" } else { "Red" }
    Write-Host ("[{0}] {1,-5} {2}  {3}" -f $row.ID, $row.Status, $row.HTTP, $row.Path) -ForegroundColor $color
    if (-not $ok) {
        foreach ($n in $notes) { Write-Host "      -> $n" -ForegroundColor Yellow }
    }
}

Write-Host "==============================================="
Write-Host "  TMOpen HTTP Smoke Tests H1..H28"
Write-Host "==============================================="
Write-Host ""

# H1
Run-Test -ID H1 -Path "/healthz" -Checks @(
    '$j.data.status -eq "ok"',
    '$j.data.db -eq "ok"'
)
# H2
Run-Test -ID H2 -Path "/api/v1" -Checks @(
    '$j.data.version -eq "1.0.0"',
    '$j.data.endpoints.Count -ge 8'
)
# H3
Run-Test -ID H3 -Path "/api/v1/cnaes" -Checks @(
    '$j.data.Count -ge 1',
    '$j.meta.total -ge 1',
    '$j.meta.totalPages -ge 1'
)
# H4
Run-Test -ID H4 -Path "/api/v1/municipios?uf=SP" -Checks @(
    '$j.data.Count -eq 1',
    '$j.data[0].descricao -like "*São Paulo*"'
)
# H5
Run-Test -ID H5 -Path "/api/v1/naturezas-juridicas" -Checks @(
    '$j.data.Count -ge 1'
)
# H6
Run-Test -ID H6 -Path "/api/v1/empresas" -Checks @(
    '$j.meta.total -eq 1',
    '$j.data[0].razao_social -eq "TECHNO MANIA TESTES LTDA"'
)
# H7
Run-Test -ID H7 -Path "/api/v1/empresas?razao_social=TECHNO" -Checks @(
    '$j.meta.total -eq 1'
)
# H8
Run-Test -ID H8 -Path "/api/v1/empresas?cnpj_basico=12345678" -Checks @(
    '$j.meta.total -eq 1'
)
# H9
Run-Test -ID H9 -Path "/api/v1/empresas?cnpj_basico=00000000" -Checks @(
    '$j.meta.total -eq 0'
)
# H10
Run-Test -ID H10 -Path "/api/v1/empresas/12345678" -Checks @(
    '$j.data.empresa.cnpj_basico -eq "12345678"',
    '$j.data.estabelecimentos.Count -eq 2',
    '$j.data.socios.Count -eq 2',
    '$j.data.dados_simples -ne $null',
    '$j.data.dados_simples.opcao_pelo_simples -eq "S"'
)
# H11
Run-Test -ID H11 -Path "/api/v1/empresas/00000000" -Expected 404 -Checks @(
    '$j.error -ne $null',
    '($j.code -ne $null) -or ($j.error -ne $null)'
)
# H12
Run-Test -ID H12 -Path "/api/v1/estabelecimentos" -Checks @(
    '$j.meta.total -eq 2'
)
# H13
Run-Test -ID H13 -Path "/api/v1/estabelecimentos?uf=SP" -Checks @(
    '$j.data.Count -eq 1',
    '$j.data[0].uf -eq "SP"',
    '$j.data[0].nome_fantasia -eq "Techno Mania Matriz"'
)
# H14
Run-Test -ID H14 -Path "/api/v1/estabelecimentos?uf=RJ" -Checks @(
    '$j.meta.total -eq 1'
)
# H15
Run-Test -ID H15 -Path "/api/v1/estabelecimentos?situacao_cadastral=2" -Checks @(
    '$j.meta.total -eq 2'
)
# H16
Run-Test -ID H16 -Path "/api/v1/estabelecimentos/12345678000101" -Checks @(
    '$j.data.cnpj_basico -eq "12345678"',
    '$j.data.cnpj_ordem -eq "0001"',
    '$j.data.uf -eq "SP"'
)
# H17
Run-Test -ID H17 -Path "/api/v1/estabelecimentos/12.345.678%2F0002-02" -Checks @(
    '$j.data.cnpj_ordem -eq "0002"',
    '$j.data.uf -eq "RJ"'
)
# H18
Run-Test -ID H18 -Path "/api/v1/estabelecimentos/00000000000000" -Expected 404 -Checks @(
    '$j.error -ne $null'
)
# H19
Run-Test -ID H19 -Path "/api/v1/socios" -Checks @(
    '$j.meta.total -eq 2'
)
# H20
Run-Test -ID H20 -Path "/api/v1/socios?nome_socio=silva" -Checks @(
    '$j.meta.total -eq 1',
    '$j.data[0].nome_socio -eq "JOAO DA SILVA"'
)
# H21
Run-Test -ID H21 -Path "/api/v1/socios?cnpj_basico=12345678" -Checks @(
    '$j.meta.total -eq 2'
)
# H22
Run-Test -ID H22 -Path "/api/v1/socios?cnpj_cpf_do_socio=98765432100" -Checks @(
    '$j.meta.total -eq 1',
    '$j.data[0].nome_socio -eq "MARIA SOUZA"'
)
# H23 - validação page=0
Run-Test -ID H23 -Path "/api/v1/empresas?page=0" -Expected 400 -Checks @(
    '$j.error -ne $null'
)
# H24 - validação uf length
Run-Test -ID H24 -Path "/api/v1/estabelecimentos?uf=SPX" -Expected 400 -Checks @(
    '$j.error -ne $null'
)
# H25 - validação cnpj length
Run-Test -ID H25 -Path "/api/v1/estabelecimentos/1234" -Expected 400 -Checks @(
    '$j.error -ne $null'
)
# H26 - /docs/json
Run-Test -ID H26 -Path "/docs/json" -Checks @(
    '$j.openapi -ne $null',
    '($j.paths | Get-Member -MemberType NoteProperty | Where-Object Name -like "*empresas*").Count -ge 1',
    '($j.paths | Get-Member -MemberType NoteProperty | Where-Object Name -like "*socios*").Count -ge 1',
    '($j.paths | Get-Member -MemberType NoteProperty | Where-Object Name -like "*estabelecimentos*").Count -ge 1'
)
# H27 - /docs/ UI Scalar
Run-Test -ID H27 -Path "/docs/" -Checks @(
    # content type check via separate; pass if 200
    '$true'
)
# H28 - 404 padronizado
Run-Test -ID H28 -Path "/api/v1/rota-inexistente-xyz" -Expected 404 -Checks @(
    '$j.error -ne $null'
)

Write-Host ""
Write-Host "==============================================="
Write-Host "  RESUMO FINAL"
Write-Host "==============================================="
$passCount = ($report | Where-Object Status -eq PASS).Count
$failCount = ($report | Where-Object Status -eq FAIL).Count
Write-Host "Total: $($report.Count) | PASS: $passCount | FAIL: $failCount"
Write-Host ""
Write-Host "--- Tabela H1..H28 ---"
$report | Format-Table ID, Status, HTTP, Path -AutoSize
Write-Host ""
if ($failCount -gt 0) {
    Write-Host "--- Detalhes dos FAILs ---" -ForegroundColor Red
    $report | Where-Object Status -eq FAIL | Format-List ID, HTTP, Path, Notes, BodyPreview
    exit 1
} else {
    Write-Host ">>>> TODOS OS TESTES PASSARAM! <<<<" -ForegroundColor Green
    exit 0
}
