param(
  [switch]$NoOpen,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = "C:\Users\Ghaxt\Desktop\arc-builder-journal"
$logPath = Join-Path $repo "data\daily-routine.log"

Set-Location $repo

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Iniciando rotina autonoma do Arcade." | Out-File -FilePath $logPath -Append -Encoding utf8

try {
  npm run challenges:seed:mvp | Out-File -FilePath $logPath -Append -Encoding utf8
  npm run posts:audit | Out-File -FilePath $logPath -Append -Encoding utf8

  $selectionJson = npx tsx scripts/select-next-post.ts
  $selection = $selectionJson | ConvertFrom-Json

  if ($selection.selected) {
    "[$timestamp] Proxima pauta escolhida: [$($selection.selected.kind)] $($selection.selected.title)" | Out-File -FilePath $logPath -Append -Encoding utf8
  } else {
    "[$timestamp] Fila editorial esgotada. Nenhuma pauta pendente encontrada." | Out-File -FilePath $logPath -Append -Encoding utf8
  }

  $publishArgs = @("tsx", "scripts/autonomous-publish-next-post.ts")

  if ($DryRun) {
    $publishArgs += "--dry-run"
  }

  $publishJson = & npx $publishArgs
  $publish = $publishJson | ConvertFrom-Json

  if ($publish.status -eq "published") {
    "[$timestamp] Post publicado automaticamente: $($publish.post.slug)" | Out-File -FilePath $logPath -Append -Encoding utf8
    "[$timestamp] Gerador usado: $($publish.generator)" | Out-File -FilePath $logPath -Append -Encoding utf8
    "[$timestamp] Resultado social: $($publish.social.status)" | Out-File -FilePath $logPath -Append -Encoding utf8
  } elseif ($publish.status -eq "preview") {
    "[$timestamp] Rotina executada em preview; nada foi publicado." | Out-File -FilePath $logPath -Append -Encoding utf8
  } elseif ($publish.status -eq "empty") {
    "[$timestamp] Nenhum post novo foi publicado porque a fila editorial esta vazia." | Out-File -FilePath $logPath -Append -Encoding utf8
  } else {
    "[$timestamp] Nenhum post novo foi publicado. Status: $($publish.status)" | Out-File -FilePath $logPath -Append -Encoding utf8
  }

  "[$timestamp] Rotina autonoma concluida sem abrir paginas." | Out-File -FilePath $logPath -Append -Encoding utf8
} catch {
  "[$timestamp] Falha na rotina: $($_.Exception.Message)" | Out-File -FilePath $logPath -Append -Encoding utf8
  throw
}

if ($NoOpen) {
  "[$timestamp] Parametro -NoOpen mantido apenas por compatibilidade; a rotina ja nao abre paginas." | Out-File -FilePath $logPath -Append -Encoding utf8
}

if ($DryRun) {
  "[$timestamp] Parametro -DryRun usado; a rotina validou a esteira sem publicar no banco." | Out-File -FilePath $logPath -Append -Encoding utf8
}
