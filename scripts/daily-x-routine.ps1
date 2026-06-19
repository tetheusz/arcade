$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$repo = "C:\Users\Ghaxt\Desktop\arc-builder-journal"
$logPath = Join-Path $repo "data\daily-x-routine.log"

Set-Location $repo

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
"[$timestamp] Iniciando rotina diária do X." | Out-File -FilePath $logPath -Append -Encoding utf8

try {
  npm run x:web:post-next | Out-File -FilePath $logPath -Append -Encoding utf8
  "[$timestamp] Rotina diária do X concluída." | Out-File -FilePath $logPath -Append -Encoding utf8
} catch {
  "[$timestamp] Falha na rotina do X: $($_.Exception.Message)" | Out-File -FilePath $logPath -Append -Encoding utf8
  throw
}
