$base = "http://localhost:3000"
$results = @()

function Test-Endpoint {
    param(
        [string]$Id,
        [string]$Method = "GET",
        [string]$Path,
        [int]$ExpectedStatus = 200,
        [scriptblock]$Assertions = $null,
        [string]$Description = ""
    )
    $result = [ordered]@{
        ID = $Id
        Path = $Path
        Method = $Method
        Expected = $ExpectedStatus
        Actual = 0
        Status = "FAIL"
        Notes = @()
        Description = $Description
    }
    try {
        $fullUrl = "$base$Path"
        $resp = try { Invoke-WebRequest -Uri $fullUrl -Method $Method -UseBasicParsing -TimeoutSec 15 } catch { $_.Exception.Response }
        $status = [int]$resp.StatusCode
        $result.Actual = $status
        $body = if ($resp -and $resp.Content) { [System.Text.Encoding]::UTF8.GetString($resp.RawContentStream.ToArray()) } else { "" }
        try { $json = $body | ConvertFrom-Json -Depth 10 } catch { $json = $null }
        if ($status -eq $ExpectedStatus) {
            $assertionsOk = $true
            if ($Assertions -ne $null) {
                try {
                    & $Assertions $resp $body $json | ForEach-Object {
                        if ($_ -is [string]) { $result.Notes += $_ }
                        elseif ($_ -eq $false) { $assertionsOk = $false }
                    }
                } catch {
                    $result.Notes += "Exception in assertions: $_"
                    $assertionsOk = $false
                }
            }
            if ($assertionsOk) { $result.Status = "PASS" } else { $result.Status = "FAIL_ASSERT" }
        } else {
            $result.Notes += "Expected HTTP $ExpectedStatus, got $status"
        }
        if ($body.Length -gt 0) {
            $preview = if ($body.Length -gt 400) { $body.Substring(0,400) + "..." } else { $body }
            $result.Notes += "Body preview: $preview"
        }
    } catch {
        $result.Notes += "Request error: $_"
    }
    $results += [PSCustomObject]$result
    Write-Host ("[$($result.ID)] HTTP {0,-3} {1,-65} => {2,-3} expected {3,-3} [{4}]" -f $result.Actual, $result.Path, $result.Actual, $result.Expected, $result.Status)
    foreach ($n in $result.Notes) { if ($result.Status -ne "PASS") { Write-Host "      -> $n" -ForegroundColor Yellow } }
    return $result
}

Write-Host "==============================================="
Write-Host " SMOKE TESTS HTTP H1-H28"
Write-Host "==============================================="
Write-Host ""

# H1
Test-Endpoint -Id "H1" -Path "/healthz" -Assertions {
    param($r,$b,$j)
    if ($j.data.status -ne "ok") { "data.status != ok"; $false }
    if ($j.data.db -ne "ok") { "data.db != ok"; $false }
    $true
}

# H2
Test-Endpoint -Id "H2" -Path "/api/v1" -Assertions {
    param($r,$b,$j)
    $ver = $j.data.version
    $ends = $j.data.endpoints
    if ($ver -ne "1.0.0") { "version != 1.0.0 (got $ver)"; $false }
    $required = @('/cnaes','/municipios','/naturezas-juridicas','/empresas','/empresas/{cnpj}','/estabelecimentos','/estabelecimentos/{cnpj}','/socios')
    $missing = @()
    foreach ($req in $required) { if ($ends -notcontains $req) { $missing += $req } }
    if ($missing.Count -gt 0) { "Missing endpoints: $($missing -join ', ')"; $false }
    $true
}

# H3
Test-Endpoint -Id "H3" -Path "/api/v1/cnaes" -Assertions {
    param($r,$b,$j)
    $len = $j.data.Length
    $total = $j.meta.total
    $tp = $j.meta.totalPages
    if ($len -lt 1) { "data.length <1 (got $len)"; $false }
    if ($total -lt 1) { "meta.total <1 (got $total)"; $false }
    $calcTp = if ($total -eq 0) {0} else { [math]::Ceiling($total / $j.meta.limit) }
    if ($tp -ne $calcTp) { "meta.totalPages=$tp, esperado $calcTp"; $false }
    $true
}

# H4
Test-Endpoint -Id "H4" -Path "/api/v1/municipios?uf=SP" -Assertions {
    param($r,$b,$j)
    if ($j.data.Length -ne 1) { "data.length != 1 (got $($j.data.Length))"; $false }
    if ($j.data[0].descricao -notmatch "São Paulo") { "descricao nao contem Sao Paulo: $($j.data[0].descricao)"; $false }
    $true
}

# H5
Test-Endpoint -Id "H5" -Path "/api/v1/naturezas-juridicas" -Assertions {
    param($r,$b,$j)
    if ($j.data.Length -lt 1) { "data.length <1"; $false }
    $true
}

# H6
Test-Endpoint -Id "H6" -Path "/api/v1/empresas" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 1) { "meta.total !=1 (got $($j.meta.total))"; $false }
    if ($j.data[0].razao_social -ne "TECHNO MANIA TESTES LTDA") { "razao_social errada: $($j.data[0].razao_social)"; $false }
    $true
}

# H7
Test-Endpoint -Id "H7" -Path "/api/v1/empresas?razao_social=TECHNO" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 1) { "meta.total !=1 (case insensitive) (got $($j.meta.total))"; $false }
    $true
}

# H8
Test-Endpoint -Id "H8" -Path "/api/v1/empresas?cnpj_basico=12345678" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 1) { "meta.total !=1 (got $($j.meta.total))"; $false }
    $true
}

# H9
Test-Endpoint -Id "H9" -Path "/api/v1/empresas?cnpj_basico=00000000" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 0) { "meta.total !=0 (got $($j.meta.total))"; $false }
    $true
}

# H10
Test-Endpoint -Id "H10" -Path "/api/v1/empresas/12345678" -Assertions {
    param($r,$b,$j)
    $emp = $j.data.empresa
    $est = $j.data.estabelecimentos
    $soc = $j.data.socios
    $ds = $j.data.dados_simples
    $ok = $true
    if ($emp.cnpj_basico -ne "12345678") { "empresa.cnpj_basico errado: $($emp.cnpj_basico)"; $ok=$false }
    if ($est.Length -ne 2) { "estabelecimentos.Length !=2 (got $($est.Length))"; $ok=$false }
    if ($soc.Length -ne 2) { "socios.Length !=2 (got $($soc.Length))"; $ok=$false }
    if ($null -eq $ds) { "dados_simples null"; $ok=$false }
    elseif ($ds.opcao_pelo_simples -ne "S") { "dados_simples.opcao_pelo_simples != S: $($ds.opcao_pelo_simples)"; $ok=$false }
    $ok
}

# H11
Test-Endpoint -Id "H11" -Path "/api/v1/empresas/00000000" -ExpectedStatus 404 -Assertions {
    param($r,$b,$j)
    if ($null -eq $j.error) { "sem envelope error"; $false } else { "404 com envelope error OK" }
    $true
}

# H12
Test-Endpoint -Id "H12" -Path "/api/v1/estabelecimentos" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 2) { "meta.total != 2 (got $($j.meta.total))"; $false }
    $true
}

# H13
Test-Endpoint -Id "H13" -Path "/api/v1/estabelecimentos?uf=SP" -Assertions {
    param($r,$b,$j)
    $ok = $true
    if ($j.data.Length -ne 1) { "data.length !=1 (got $($j.data.Length))"; $ok=$false }
    if ($j.data[0].uf -ne "SP") { "uf != SP"; $ok=$false }
    if ($j.data[0].nome_fantasia -ne "Techno Mania Matriz") { "nome_fantasia errado: $($j.data[0].nome_fantasia)"; $ok=$false }
    $ok
}

# H14
Test-Endpoint -Id "H14" -Path "/api/v1/estabelecimentos?uf=RJ" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 1) { "meta.total !=1 (got $($j.meta.total))"; $false }
    $true
}

# H15
Test-Endpoint -Id "H15" -Path "/api/v1/estabelecimentos?situacao_cadastral=2" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 2) { "meta.total != 2 (got $($j.meta.total))"; $false }
    $true
}

# H16
Test-Endpoint -Id "H16" -Path "/api/v1/estabelecimentos/12345678000101" -Assertions {
    param($r,$b,$j)
    $e = $j.data
    $ok = $true
    if ($e.cnpj_basico -ne "12345678") { "cnpj_basico errado"; $ok=$false }
    if ($e.cnpj_ordem -ne "0001") { "cnpj_ordem != 0001"; $ok=$false }
    if ($e.uf -ne "SP") { "uf != SP"; $ok=$false }
    $ok
}

# H17
Test-Endpoint -Id "H17" -Path "/api/v1/estabelecimentos/12.345.678%2F0002-02" -Assertions {
    param($r,$b,$j)
    $e = $j.data
    $ok = $true
    if ($e.cnpj_ordem -ne "0002") { "cnpj_ordem != 0002"; $ok=$false }
    if ($e.uf -ne "RJ") { "uf != RJ"; $ok=$false }
    $ok
}

# H18
Test-Endpoint -Id "H18" -Path "/api/v1/estabelecimentos/00000000000000" -ExpectedStatus 404 -Assertions {
    param($r,$b,$j)
    if ($null -eq $j.error) { "sem envelope error"; $false } else { "404 com envelope OK" }
    $true
}

# H19
Test-Endpoint -Id "H19" -Path "/api/v1/socios" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 2) { "meta.total !=2 (got $($j.meta.total))"; $false }
    $true
}

# H20
Test-Endpoint -Id "H20" -Path "/api/v1/socios?nome_socio=silva" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 1) { "meta.total !=1 case insens (got $($j.meta.total))"; $false }
    if ($j.data[0].nome_socio -ne "JOAO DA SILVA") { "nome_socio errado: $($j.data[0].nome_socio)"; $false }
    $true
}

# H21
Test-Endpoint -Id "H21" -Path "/api/v1/socios?cnpj_basico=12345678" -Assertions {
    param($r,$b,$j)
    if ($j.meta.total -ne 2) { "meta.total !=2 (got $($j.meta.total))"; $false }
    $true
}

# H22
Test-Endpoint -Id "H22" -Path "/api/v1/socios?cnpj_cpf_do_socio=98765432100" -Assertions {
    param($r,$b,$j)
    $ok=$true
    if ($j.meta.total -ne 1) { "meta.total !=1 (got $($j.meta.total))"; $ok=$false }
    if ($j.data[0].nome_socio -ne "MARIA SOUZA") { "nome != MARIA SOUZA: $($j.data[0].nome_socio)"; $ok=$false }
    $ok
}

# H23
Test-Endpoint -Id "H23" -Path "/api/v1/empresas?page=0" -ExpectedStatus 400 -Assertions {
    param($r,$b,$j)
    $ok=$true
    if ($null -eq $j.error) { "sem envelope error"; $ok=$false }
    $detailsStr = $j.details | Out-String
    if ($detailsStr -notmatch "page|1|min") { "details nao contem page min=1: $detailsStr"; $ok=$false } else { "details contem validacao page OK" }
    $ok
}

# H24
Test-Endpoint -Id "H24" -Path "/api/v1/estabelecimentos?uf=SPX" -ExpectedStatus 400 -Assertions {
    param($r,$b,$j)
    if ($null -eq $j.error) { "sem envelope error"; $false } else { "400 envelope OK" }
    $true
}

# H25
Test-Endpoint -Id "H25" -Path "/api/v1/estabelecimentos/1234" -ExpectedStatus 400 -Assertions {
    param($r,$b,$j)
    if ($null -eq $j.error) { "sem envelope error"; $false } else { "400 envelope OK (14 digitos)" }
    $true
}

# H26
Test-Endpoint -Id "H26" -Path "/docs/json" -Assertions {
    param($r,$b,$j)
    $ok=$true
    try { $paths = $j.paths | Get-Member -MemberType NoteProperty | Select-Object -ExpandProperty Name } catch { $paths = @() }
    $required = @('/api/v1/empresas','/api/v1/socios','/api/v1/estabelecimentos','/api/v1/cnaes','/api/v1/municipios','/api/v1/naturezas-juridicas')
    foreach ($rp in $required) { if ($paths -notcontains $rp) { "Faltando path $rp"; $ok=$false } }
    if ($ok) { "paths: $($paths -join ', ') | contem todos 8 required OK" }
    $ok
}

# H27
Test-Endpoint -Id "H27" -Path "/docs/" -Assertions {
    param($r,$b,$j)
    $ct = $r.Headers['Content-Type']
    if ($ct -notmatch "text/html") { "content-type nao text/html: $ct"; $false } else { "Content-Type $ct OK (UI Scalar)" }
    $true
}

# H28
Test-Endpoint -Id "H28" -Path "/api/v1/rota-inexistente-xyz" -ExpectedStatus 404 -Assertions {
    param($r,$b,$j)
    if ($null -eq $j.error) { "sem envelope error"; $false } else { "404 envelope padronizado OK" }
    $true
}

Write-Host ""
Write-Host "==============================================="
Write-Host " RESUMO DOS TESTES"
Write-Host "==============================================="
$pass = ($results | Where-Object { $_.Status -eq "PASS" }).Count
$fail = ($results | Where-Object { $_.Status -ne "PASS" }).Count
Write-Host "PASS: $pass / $($results.Count) | FAIL: $fail"
Write-Host ""
$results | Format-Table -AutoSize ID, Status, Expected, Actual, Path
Write-Host ""

if ($fail -gt 0) {
    Write-Host "=== TESTES COM FALHA ==="
    $results | Where-Object { $_.Status -ne "PASS" } | Format-List ID, Status, Path, Expected, Actual, Notes
    exit 1
} else {
    Write-Host "TODOS OS TESTES PASSARAM!" -ForegroundColor Green
    exit 0
}
