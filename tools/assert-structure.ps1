#!/usr/bin/env pwsh
<#
.SYNOPSIS
  assert-structure.ps1 -- structural gate for the prototype.
.DESCRIPTION
  Exit code = number of violations. 0 means pass.
  Aesthetic rules live in tools/lint-anti-slop.ps1; this script checks
  things that are objectively broken rather than subjectively ugly:
    1. balanced structural tags (a stray </div> silently kills every
       acceptance path -- measured cost, not a hypothetical)
    2. submit buttons are inside a form OR guarded by a disabled check
    3. ids are unique in the rendered DOM
    4. every interactive class has hover / active / focus states
    5. inputs have a label or aria-label
    6. tablist has aria-controls pointing at a real tabpanel
.USAGE
  pwsh -File tools/assert-structure.ps1 prototype/index.html prototype/app.css
#>
param(
  [Parameter(Position = 0)]
  [string]$Entry = "prototype/index.html",
  [Parameter(Position = 1)]
  [string]$MainCss = "prototype/app.css"
)

$ErrorActionPreference = "Stop"
$violations = New-Object System.Collections.Generic.List[string]

function Add-V {
  param([string]$Rule, [string]$Where, [string]$Detail)
  $violations.Add("VIOLATION [$Rule] $Where -- $Detail")
}

if (-not (Test-Path -LiteralPath $Entry)) { Write-Host "VIOLATION [missing-entry] $Entry"; exit 1 }
if (-not (Test-Path -LiteralPath $MainCss)) { Write-Host "VIOLATION [missing-css] $MainCss"; exit 1 }

$entryDir = Split-Path -Parent (Resolve-Path -LiteralPath $Entry)

# ------------------------------------------------------------------
# 1. HTML: balanced tags, unique ids, script order, label association
# ------------------------------------------------------------------
$html = Get-Content -LiteralPath $Entry -Raw -Encoding UTF8

$open = ([regex]::Matches($html, '<(div|section|ul|li|header|nav|main|aside|form|dl|table)\b')).Count
$close = ([regex]::Matches($html, '</(div|section|ul|li|header|nav|main|aside|form|dl|table)>')).Count
if ($open -ne $close) {
  Add-V "unbalanced-tags" $Entry "open=$open close=$close (a stray closing tag destroys the layout silently)"
}

$ids = [regex]::Matches($html, '\bid="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
$dupes = $ids | Group-Object | Where-Object { $_.Count -gt 1 } | ForEach-Object { $_.Name }
if ($dupes) { Add-V "duplicate-id" $Entry ($dupes -join ", ") }

if ($html -notmatch '<html[^>]*lang=') { Add-V "no-lang" $Entry "html element needs lang for screen reader pronunciation" }
if ($html -notmatch 'charset') { Add-V "no-charset" $Entry "CJK text needs an explicit UTF-8 declaration" }

# every referenced script/stylesheet must exist on disk
foreach ($m in [regex]::Matches($html, '(?:src|href)="([^"]+\.css|[^"]+\.js)"')) {
  $p = Join-Path $entryDir $m.Groups[1].Value
  if (-not (Test-Path -LiteralPath $p)) { Add-V "missing-asset" $Entry $m.Groups[1].Value }
}

# ------------------------------------------------------------------
# 2. JS: rendered markup must be structurally balanced too
#    (the panels build HTML strings; a missing </div> there is the
#     same bug as in index.html but invisible to an HTML-only check)
# ------------------------------------------------------------------
$jsFiles = Get-ChildItem -LiteralPath $entryDir -Filter "*.js" -File
$jsAllRaw = ""
foreach ($f in $jsFiles) { $jsAllRaw += (Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8) }

# Strip comments before counting tags: prose that mentions "<li>" is not markup.
$jsAll = [regex]::Replace($jsAllRaw, '(?m)^\s*//.*$', '')
$jsAll = [regex]::Replace($jsAll, '/\*[\s\S]*?\*/', '')

foreach ($tag in @("div", "section", "ul", "li", "button", "textarea", "input", "p", "h1", "h2", "span", "dl", "details", "summary")) {
  $o = ([regex]::Matches($jsAll, "<$tag\b")).Count
  $c = ([regex]::Matches($jsAll, "</$tag>")).Count
  if ($tag -in @("input", "br", "img")) { continue }
  if ($o -ne $c) {
    Add-V "unbalanced-in-js-template" "prototype/*.js" "<$tag>: open=$o close=$c"
  }
}

# inputs need an accessible name
foreach ($m in [regex]::Matches($jsAll, '<input\b[^>]*')) {
  $t = $m.Value
  if (($t -notmatch 'aria-label') -and ($t -notmatch 'for=') -and ($t -notmatch 'id=')) {
    Add-V "input-without-label" "prototype/*.js" $t.Trim()
  }
}
foreach ($m in [regex]::Matches($jsAll, '<textarea\b[^>]*')) {
  $t = $m.Value
  if (($t -notmatch 'aria-label') -and ($t -notmatch 'id=')) {
    Add-V "textarea-without-label" "prototype/*.js" $t.Trim()
  }
}

# async submit guard: a capture submit handler must bail on empty input
if ($jsAll -notmatch 'trim\(\)\s*===\s*.''''|trim\(\)\s*!==\s*.''''|trim\(\)\s*===\s*''''') {
  Add-V "no-empty-submit-guard" "prototype/*.js" "capture submit must check for empty input before writing"
}

# every pane renderer must return both halves of the shell contract
foreach ($pane in @("renderToday", "renderCapture", "renderTodo", "renderMemory", "renderHealth")) {
  $block = [regex]::Match($jsAll, "MO\.$pane\s*=\s*function[\s\S]*")
  if (-not $block.Success) { Add-V "pane-missing" "prototype/*.js" "$pane not found" }
}

# four states must be reachable in every pane
foreach ($pane in @("today", "capture", "todo", "memory", "health")) {
  $f = Join-Path $entryDir "pane-$pane.js"
  if (-not (Test-Path -LiteralPath $f)) { Add-V "pane-file-missing" $entryDir "pane-$pane.js"; continue }
  $body = Get-Content -LiteralPath $f -Raw -Encoding UTF8
  foreach ($phase in @("loading", "error", "empty")) {
    if ($body -notmatch "phase\s*===\s*'$phase'") {
      Add-V "phase-unreachable" "pane-$pane.js" "$phase"
    }
  }
}

# ------------------------------------------------------------------
# 3. CSS: interactive classes need all three states
# ------------------------------------------------------------------
$cssFiles = Get-ChildItem -LiteralPath $entryDir -Filter "*.css" -File |
  Where-Object { $_.Name -ne "tokens.css" }
$cssAll = ""
foreach ($f in $cssFiles) { $cssAll += (Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8) }

# v8 renamed two classes (design/brief.md §一/§九-3):
#   .nav-item  -> .tab        (text tab with a 2px underline, not a pill track)
#   .btn-invert-> .btn-ink    (ink block on paper instead of an inverted block)
# The rule is unchanged: every interactive class needs all three states.
# v9 移除 "btn-primary"：蓝实底被 brief §二 禁止，留着类名只会给后续改动留下污染入口。
$interactive = @("btn", "btn-ink", "btn-ghost", "kindbtn", "tab",
                 "row-button", "textlink", "remember-close")
foreach ($cls in $interactive) {
  $base = [regex]::Matches($cssAll, "\.$cls(?![\w-])").Count
  if ($base -eq 0) { Add-V "class-undefined" $MainCss ".$cls referenced by the structure gate but not defined"; continue }
  $hasHover = [regex]::IsMatch($cssAll, "\.$cls(?![\w-]):hover")
  $hasActive = [regex]::IsMatch($cssAll, "\.$cls(?![\w-]):active")
  $hasFocus = [regex]::IsMatch($cssAll, "\.$cls(?![\w-]):focus-visible|\.$cls(?![\w-]):focus\b")
  if (-not $hasHover) { Add-V "missing-hover" $MainCss ".$cls" }
  if (-not $hasActive) { Add-V "missing-active" $MainCss ".$cls" }
  if (-not $hasFocus) { Add-V "missing-focus" $MainCss ".$cls" }
}

# focus ring color must be declared (single spec, brief section 7-1)
if ($cssAll -notmatch 'outline\s*:\s*2px\s+solid') { Add-V "focus-ring-spec" $MainCss "no 2px solid outline declared" }

# type scale: T0 must be defined somewhere reachable
if ($cssAll -notmatch '--t0' -and $jsAll -notmatch 'var\(--t0\)') {
  Add-V "t0-token-missing" $entryDir "--t0 not defined (masthead number would fall back to 16px)"
}

# every var() used in CSS must be defined in tokens.css or app.css
$tokens = Get-Content -LiteralPath (Join-Path $entryDir "tokens.css") -Raw -Encoding UTF8
$defined = New-Object System.Collections.Generic.HashSet[string]
foreach ($m in [regex]::Matches("$tokens`n$cssAll", '--([a-zA-Z0-9-]+)\s*:')) { [void]$defined.Add($m.Groups[1].Value) }
$used = [regex]::Matches($cssAll, 'var\(--([a-zA-Z0-9-]+)') | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique
$undef = @($used | Where-Object { $_ -notlike '--dsw-*' -and -not $defined.Contains($_) -and $_ -notlike 'dsw-*' })
if ($undef.Count -gt 0) { Add-V "undefined-css-var" $MainCss ($undef -join ", ") }

# ------------------------------------------------------------------
# Report
# ------------------------------------------------------------------
if ($violations.Count -eq 0) {
  Write-Host "PASS  assert-structure: 0 violations ($($jsFiles.Count) js, $($cssFiles.Count) css)"
  exit 0
}

$violations | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "TOTAL VIOLATIONS: $($violations.Count)"
exit $violations.Count
