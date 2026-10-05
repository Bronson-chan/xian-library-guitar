$ErrorActionPreference = 'Stop'

$repository = 'Bronson-chan/xian-library-guitar'
$branch = 'main'
$projectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$gitExe = 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe'
if (-not (Test-Path -LiteralPath $gitExe)) { $gitExe = 'git' }
$gitConfig = @('-c', "safe.directory=$projectRoot")

Push-Location $projectRoot
try {
  $dirty = & $gitExe @gitConfig status --porcelain
  if ($dirty) { throw 'Commit the local changes before publishing.' }

  $credentialInput = "protocol=https`nhost=github.com`nusername=Bronson-chan`n`n"
  $credentialLines = $credentialInput | & $gitExe @gitConfig credential fill
  $credential = @{}
  foreach ($line in $credentialLines) {
    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) { $credential[$parts[0]] = $parts[1] }
  }
  $token = $credential['password']
  if (-not $token) { throw 'GitHub credential was not available.' }

  $headers = @{
    Accept = 'application/vnd.github+json'
    Authorization = "Bearer $token"
    'X-GitHub-Api-Version' = '2022-11-28'
    'User-Agent' = 'xian-library-guitar-publisher'
  }
  $apiBase = "https://api.github.com/repos/$repository"

  $ref = Invoke-RestMethod -Headers $headers -Uri "$apiBase/git/ref/heads/$branch"
  $parentSha = $ref.object.sha
  $parentCommit = Invoke-RestMethod -Headers $headers -Uri "$apiBase/git/commits/$parentSha"
  $remoteTree = Invoke-RestMethod -Headers $headers -Uri "$apiBase/git/trees/$($parentCommit.tree.sha)?recursive=1"
  $remoteByPath = @{}
  foreach ($entry in $remoteTree.tree) {
    if ($entry.type -eq 'blob') { $remoteByPath[$entry.path] = $entry.sha }
  }

  $trackedPaths = @(& $gitExe @gitConfig ls-files)
  $treeElements = @()
  $changedCount = 0
  foreach ($path in $trackedPaths) {
    $fullPath = Join-Path $projectRoot ($path.Replace('/', '\'))
    $sha = (& $gitExe @gitConfig hash-object -- $fullPath).Trim()
    if ($remoteByPath[$path] -ne $sha) {
      $body = @{
        content = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($fullPath))
        encoding = 'base64'
      } | ConvertTo-Json -Compress
      $blob = Invoke-RestMethod -Method Post -Headers $headers -Uri "$apiBase/git/blobs" -Body $body -ContentType 'application/json'
      $sha = $blob.sha
      $changedCount++
    }
    $treeElements += [pscustomobject]@{ path = $path; mode = '100644'; type = 'blob'; sha = $sha }
  }

  $remotePaths = @($remoteByPath.Keys | Sort-Object)
  $localPaths = @($trackedPaths | Sort-Object)
  $pathsChanged = (Compare-Object $remotePaths $localPaths).Count -gt 0
  if ($changedCount -eq 0 -and -not $pathsChanged) {
    Write-Host 'GitHub is already up to date.'
    exit 0
  }

  $treeBody = @{ tree = $treeElements } | ConvertTo-Json -Depth 6 -Compress
  $tree = Invoke-RestMethod -Method Post -Headers $headers -Uri "$apiBase/git/trees" -Body $treeBody -ContentType 'application/json'
  $localCommit = (& $gitExe @gitConfig log -1 --format='%h %s').Trim()
  $commitBody = @{
    message = "Publish: $localCommit"
    tree = $tree.sha
    parents = @($parentSha)
  } | ConvertTo-Json -Depth 4 -Compress
  $commit = Invoke-RestMethod -Method Post -Headers $headers -Uri "$apiBase/git/commits" -Body $commitBody -ContentType 'application/json'
  $updateBody = @{ sha = $commit.sha; force = $false } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Patch -Headers $headers -Uri "$apiBase/git/refs/heads/$branch" -Body $updateBody -ContentType 'application/json' | Out-Null
  Write-Host "Published $changedCount changed files in commit $($commit.sha)"
} finally {
  Pop-Location
}
