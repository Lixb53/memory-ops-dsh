#!/usr/bin/env pwsh
<#
.SYNOPSIS
  lint-anti-slop.ps1 -- aesthetic gate for the memory-ops prototype.
.DESCRIPTION
  Exit code = number of hits. 0 means clean.
  This file is the SINGLE SOURCE OF TRUTH for aesthetic rules.
  To add or relax a rule: change this script, not the persona doc,
  and mirror the decision in design/brief.md.

  Rules are derived from design/brief.md (v7):
    section 0  -- why v6 failed (gray-layer separation, boxed layout)
    section 1  -- style: Editorial Ledger, explicit refusals
    section 3  -- type scale: T0 is digits-only
    section 6  -- motion: user-triggered only
    section 8  -- self-imposed, machine-checkable bans

.USAGE
  pwsh -File tools/lint-anti-slop.ps1 prototype/
#>
param(
  [Parameter(Position = 0)]
  [string]$Target = "prototype"
)

$ErrorActionPreference = "Stop"

# ------------------------------------------------------------------
# Collect files
# ------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $Target)) {
  Write-Host "MISSING target path: $Target"
  exit 1
}

$item = Get-Item -LiteralPath $Target
if ($item.PSIsContainer) {
  $files = Get-ChildItem -LiteralPath $Target -Recurse -File |
    Where-Object { $_.Extension -in @(".css", ".html", ".js", ".ts", ".tsx") } |
    Where-Object { $_.FullName -notmatch "\\shots|\\node_modules|\\v\d+\\|\\lib\\" }
} else {
  $files = @($item)
}

if ($files.Count -eq 0) {
  Write-Host "MISSING no lintable files under $Target"
  exit 1
}

$hits = New-Object System.Collections.Generic.List[string]

function Add-Hit {
  param([string]$Rule, [string]$File, [int]$Line, [string]$Text)
  $hits.Add("HIT  [$Rule] $File`:$Line  $Text")
}

# ------------------------------------------------------------------
# Rule table: name -> (regex, scope filter)
#   scope: css | html | js | all
# ------------------------------------------------------------------
$rules = @(
  @{ Name = "purple-blue-gradient"; Scope = "css"; Re = '(linear-gradient|radial-gradient)[^;]*?(purple|violet|indigo|#6366|#8b5cf6|#a78bfa|#7c3aed)' }
  @{ Name = "gradient-text";        Scope = "css"; Re = 'background-clip\s*:\s*text' }
  @{ Name = "default-dark-bg";      Scope = "all"; Re = '#0D1117|#0d1117' }
  @{ Name = "gray-body-text";       Scope = "css"; Re = 'color\s*:\s*(gray-400|gray-500|#9ca3af|#6b7280)' }
  @{ Name = "hover-scale";          Scope = "css"; Re = ':hover[^{]*\{[^}]*transform\s*:\s*scale' }
  @{ Name = "blanket-fade-up";      Scope = "css"; Re = 'animation\s*:\s*[^;]*(fade-up|slide-up|fadeUp|slideUp)' }
  @{ Name = "colored-glow-shadow";  Scope = "css"; Re = 'box-shadow[^;]*(rgb|rgba|#)' }
  @{ Name = "glassmorphism";        Scope = "css"; Re = 'backdrop-filter\s*:' }
  @{ Name = "emoji-structural";     Scope = "html"; Re = '[\u2600-\u27FF]|[\uD83C-\uDBFF][\uDC00-\uDFFF]' }
  @{ Name = "placeholder-fake-data"; Scope = "all"; Re = '(Jane Doe|Acme|lorem ipsum|99\.99%|Example Co)' }
)

$literalHexOk = @("tokens.css")   # tokens.css replicates host values by contract

foreach ($f in $files) {
  $rel = $f.FullName
  $lines = Get-Content -LiteralPath $rel -Encoding UTF8
  $ext = $f.Extension
  $isCss = $ext -eq ".css"
  $isHtml = $ext -eq ".html"
  $isJs = ($ext -eq ".js") -or ($ext -eq ".ts") -or ($ext -eq ".tsx")

  $inCssComment = $false
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $text = $lines[$i]
    $ln = $i + 1

    # Comment lines are documentation, not UI. Prose in a comment that names a
    # banned pattern ("not Jane Doe data") must not count as a hit -- otherwise
    # the gate cries wolf and people start ignoring it.
    $wasInCssComment = $inCssComment
    if ($isCss) {
      if ($text -match '/\*' -and $text -notmatch '\*/') { $inCssComment = $true }
      elseif ($text -match '\*/') { $inCssComment = $false }
    }
    $isComment = ($text -match '^\s*(//|\*|/\*)') -or $wasInCssComment -or ($isCss -and $text -match '/\*')
    if ($isComment) { continue }

    foreach ($r in $rules) {
      if ($null -eq $r.Re) { continue }
      $scopeOk = ($r.Scope -eq "all") -or ($r.Scope -eq "css" -and $isCss) -or
                 ($r.Scope -eq "html" -and ($isHtml -or $isJs)) -or
                 ($r.Scope -eq "js" -and $isJs)
      if (-not $scopeOk) { continue }
      if ($text -match $r.Re) { Add-Hit $r.Name $rel $ln ($text.Trim()) }
    }

    # --- literal hex colors in CSS (brief section 5: host tokens only) ---
    if ($isCss -and ($literalHexOk -notcontains $f.Name)) {
      if ($text -match '(?::|,)\s*#[0-9a-fA-F]{3,8}\b') {
        Add-Hit "literal-hex-color" $rel $ln ($text.Trim())
      }
    }

    # --- brief section 3: T0 (largest size) is digits-only -------------
    if ($isJs -and $text -match 'MO\.figure\(') {
      # argument must be a number, a numeric expression, or the em-dash for "unknown"
      if ($text -notmatch "MO\.figure\(\s*(?:'—'|`"—`"|\d|data\.|MO\.COST|entry\.|sug\.num|state\.)") {
        Add-Hit "t0-not-numeric" $rel $ln ($text.Trim())
      }
    }

    # --- brief section 8-3: 判定句 <= 20 chars, single line -------------
    # v9 起判定句入口是 MO.lede(；v8 的 MO.mastCopy( 保留兼容（同一规则，不放宽）。
    foreach ($fn in @('mastCopy', 'lede')) {
      if ($isJs -and $text -match "MO\.$fn\(") {
        $m = [regex]::Matches($text, "MO\.$fn\(\s*(?:'([^']*)'|\`"([^\`]*)\`"|``([^``]*)``)")
        foreach ($one in $m) {
          foreach ($g in 1..3) {
            $val = $one.Groups[$g].Value
            if ([string]::IsNullOrEmpty($val)) { continue }
            if ($val.Length -gt 20) { Add-Hit "lede-too-long" $rel $ln "lede '$val' = $($val.Length) chars (max 20)" }
          }
        }
      }
    }

    # --- brief section 8-1: no card containers on the paper -------------
    if ($isJs -and ($text -match 'class="card' -or $text -match 'MO\.card' -or $text -match 'cardQuiet')) {
      Add-Hit "card-container-on-paper" $rel $ln ($text.Trim())
    }
    if ($isCss -and $f.Name -eq "app.css") {
      if ($text -match '^\.card\b|^\.card-quiet\b') { Add-Hit "card-class-defined" $rel $ln ($text.Trim()) }
    }

    # --- v6 leftovers that must be gone --------------------------------
    if ($isCss -and ($text -match '\.badge\[data-tone' -or $text -match '^\.badge\b')) {
      Add-Hit "pill-badge-leftover" $rel $ln ($text.Trim())
    }
    if ($isJs -and $text -match 'MO\.badge\(|MO\.tape\(') {
      Add-Hit "v6-primitive-leftover" $rel $ln ($text.Trim())
    }
  }
}

# ------------------------------------------------------------------
# Cross-file presence checks (a missing guard is a hit, not a pass)
# ------------------------------------------------------------------
$root = if ($item.PSIsContainer) { $Target } else { $item.DirectoryName }
$cssAll = ""
$jsAll = ""
foreach ($f in $files) {
  $body = Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
  if ($f.Extension -eq ".css") { $cssAll += $body }
  if ($f.Extension -in @(".js", ".html")) { $jsAll += $body }
}

if ($cssAll -notmatch 'prefers-reduced-motion') { Add-Hit "no-reduced-motion" $root 0 "CSS lacks prefers-reduced-motion block (brief section 6)" }
if ($cssAll -notmatch ':focus-visible') { Add-Hit "no-focus-visible" $root 0 "CSS lacks :focus-visible (brief section 7-1)" }
if ($cssAll -notmatch ':active') { Add-Hit "no-active-state" $root 0 "CSS lacks :active (brief section 7-1)" }
if ($jsAll -notmatch 'role="list"') { Add-Hit "no-role-list" $root 0 "list containers lack role=list (brief section 7-5)" }
if ($jsAll -notmatch 'aria-live|role="status"|role="alert"') { Add-Hit "no-live-region" $root 0 "no status/alert announcement region" }

# remember overlay regression anchor (brief section 8-5)
if ($jsAll -match 'remember') {
  if ($cssAll -notmatch '\.remember-backdrop') { Add-Hit "remember-anchor-missing" $root 0 ".remember-* classes referenced but not defined (v4 bug root cause)" }
  if ($cssAll -notmatch '\.remember-backdrop\s*\{[^}]*position:\s*fixed') { Add-Hit "remember-backdrop-not-fixed" $root 0 "backdrop must be fixed + inset 0" }
}

# ------------------------------------------------------------------
# Report
# ------------------------------------------------------------------
if ($hits.Count -eq 0) {
  Write-Host "CLEAN  lint-anti-slop: 0 hits across $($files.Count) files"
  exit 0
}

$hits | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "TOTAL HITS: $($hits.Count)"
exit $hits.Count
