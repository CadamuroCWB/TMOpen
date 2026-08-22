param(
    [string]$ContainerName = "tmopen-postgres",
    [string]$DbUser = "tmopen",
    [string]$DbName = "tmopen",
    [string]$OutputDir = $(Join-Path (Split-Path -Parent $PSScriptRoot) "backups"),
    [string]$Timestamp = (Get-Date -Format "yyyyMMdd-HHmmss"),
    [string]$DockerComposeFile = "docker-compose.yml",
    [ValidateRange(0, 9)][int]$CompressionLevel = 6,
    [switch]$SevenZip,
    [string]$SevenZipExe = "7z.exe"
)

$ErrorActionPreference = "Stop"

function Write-Color($color, $text) {
    $prev = [Console]::ForegroundColor
    try {
        [Console]::ForegroundColor = $color
        Write-Output $text
    } finally {
        [Console]::ForegroundColor = $prev
    }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    Write-Color Cyan "Criado diretorio de backups: $OutputDir"
}

$dumpFileName = "tmopen-$Timestamp.dump"
$dumpPathLocal = Join-Path $OutputDir $dumpFileName
$dumpPathInsideContainer = "/backups/$dumpFileName"

Write-Color Cyan "==> Iniciando backup local do PostgreSQL via Docker Desktop"
Write-Color Gray "    Repo root        : $repoRoot"
Write-Color Gray "    Compose file     : $DockerComposeFile"
Write-Color Gray "    Container alvo   : $ContainerName"
Write-Color Gray "    DB               : $DbName (user=$DbUser)"
Write-Color Gray "    Nivel compactacao: $CompressionLevel (pg_dump -Z)"
Write-Color Gray "    Arquivo .dump    : $dumpPathLocal"
Write-Output ""

$composeArgs = @()
if ($DockerComposeFile) { $composeArgs += "-f", $DockerComposeFile }

$pgContainer = docker @composeArgs ps --format json postgres 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue
if (-not $pgContainer -or $pgContainer.State -ne "running") {
    Write-Color Yellow "    Container postgres nao esta rodando. Vou dar 'up -d postgres' agora..."
    docker @composeArgs up -d postgres
    Write-Color Gray "    Aguardando healthcheck healthy (max 60s)..."
    $secs = 0
    while ($secs -lt 60) {
        Start-Sleep -Seconds 5
        $secs += 5
        $status = (docker @composeArgs ps --format json postgres 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue)
        if ($status -and $status.Health -and $status.Health -match "healthy") { break }
    }
    if ($secs -ge 60) { throw "Timeout: postgres nao ficou healthy em 60s" }
    Write-Color Green "    Postgres esta healthy ($secs s)."
} else {
    Write-Color Green "    Postgres esta rodando."
}

$backupsDirInside = "/backups"
Write-Color Gray "    Garantindo pasta $backupsDirInside no container..."
docker @composeArgs exec -T postgres sh -c "mkdir -p $backupsDirInside"

Write-Color Cyan "==> Rodando pg_dump..."
$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
docker @composeArgs exec -T postgres pg_dump -U $DbUser -d $DbName -F c -Z $CompressionLevel -f $dumpPathInsideContainer
if ($LASTEXITCODE -ne 0) {
    throw "pg_dump falhou com exit code $LASTEXITCODE"
}
$stopwatch.Stop()
$durDump = [math]::Round($stopwatch.Elapsed.TotalSeconds, 1)
Write-Color Green "    pg_dump OK (${durDump}s)."

Write-Color Gray "==> Copiando .dump do container para $OutputDir ..."
$composeProject = (docker @composeArgs ps --format json postgres 2>$null | ConvertFrom-Json -ErrorAction SilentlyContinue).Name
if (-not $composeProject) { $composeProject = $ContainerName }
docker cp ${composeProject}:$dumpPathInsideContainer $dumpPathLocal
if ($LASTEXITCODE -ne 0) { throw "docker cp falhou" }

$dumpFile = Get-Item $dumpPathLocal
$sizeMB = [math]::Round($dumpFile.Length / 1MB, 2)
Write-Color Green "    Dump gravado em disco: $($dumpFile.FullName)  ($sizeMB MB)"

if ($SevenZip) {
    if (-not (Get-Command $SevenZipExe -ErrorAction SilentlyContinue)) {
        Write-Color Yellow "    WARNING: 7z.exe nao encontrado no PATH. Pulando compactacao extra."
    } else {
        Write-Color Cyan "==> Compactando .dump em .7z (max compressao) para envio a Hostinger..."
        $stopwatch2 = [System.Diagnostics.Stopwatch]::StartNew()
        $sevenZipPath = "$dumpPathLocal.7z"
        & $SevenZipExe a -t7z -m0=lzma2 -mx=9 -mfb=64 -md=64m -ms=on $sevenZipPath $dumpPathLocal | Out-Null
        $stopwatch2.Stop()
        if (-not (Test-Path $sevenZipPath)) { throw "7z falhou: arquivo nao gerado" }
        $szFile = Get-Item $sevenZipPath
        $szMB = [math]::Round($szFile.Length / 1MB, 2)
        $dur7z = [math]::Round($stopwatch2.Elapsed.TotalSeconds, 1)
        Write-Color Green "    7z pronto: $($szFile.FullName)  ($szMB MB em ${dur7z}s)."
        $pct = if ($dumpFile.Length -gt 0) { [math]::Round(100 - ($szFile.Length * 100 / $dumpFile.Length), 1) } else { 0 }
        Write-Color Gray "    Reducao de tamanho: ${pct}% em relacao ao .dump"
    }
}

Write-Output ""
Write-Color Green "=============================================="
Write-Color Green " BACKUP LOCAL CONCLUIDO "
Write-Color Green "=============================================="
Write-Color Cyan  "  .dump: $dumpPathLocal"
if ($SevenZip -and (Test-Path "$dumpPathLocal.7z")) {
    Write-Color Cyan "  .7z  : $dumpPathLocal.7z"
}
Write-Color Cyan  "  Proximo passo: enviar o arquivo para a Hostinger (scp/sftp) e rodar ./scripts/restore-remote.sh"
Write-Output ""
