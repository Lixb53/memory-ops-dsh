# run-shot.ps1 — run a node script with file-redirected stdio.
#
# Why: under the Windows workspace-write sandbox, pwsh cannot capture a
# child program's output through piped stdio (EPERM on the named pipe).
# Start-Process with -RedirectStandard* avoids pipes entirely.
param(
  [Parameter(Mandatory = $true)][string]$Script,
  [string]$Args = "",
  [string]$Out = ".tmp/shot-out.txt",
  [string]$Err = ".tmp/shot-err.txt"
)

$p = Start-Process -FilePath "node" -ArgumentList $Script, $Args `
  -NoNewWindow -Wait -PassThru `
  -RedirectStandardOutput $Out -RedirectStandardError $Err

Write-Host "--- stdout ---"
Get-Content -LiteralPath $Out -Encoding UTF8
Write-Host "--- stderr ---"
Get-Content -LiteralPath $Err -Encoding UTF8
Write-Host "--- exit: $($p.ExitCode) ---"
exit $p.ExitCode
