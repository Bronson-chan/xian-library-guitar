$ErrorActionPreference = 'Stop'
$gitExe = 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe'
$credentialInput = "protocol=https`nhost=github.com`nusername=Bronson-chan`n`n"
$credentials = @{}
$credentialInput | & $gitExe credential fill | ForEach-Object {
  $parts = $_ -split '=', 2
  if ($parts.Count -eq 2) { $credentials[$parts[0]] = $parts[1] }
}
$headers = @{Accept='application/vnd.github+json'; Authorization="Bearer $($credentials.password)"; 'User-Agent'='xian-library-check'}
$runs = Invoke-RestMethod -Headers $headers -Uri 'https://api.github.com/repos/Bronson-chan/xian-library-guitar/actions/runs?per_page=1'
$run = $runs.workflow_runs[0]
$run | Select-Object id,status,conclusion,head_sha,html_url | ConvertTo-Json
if ($run.conclusion -eq 'failure') {
  $jobs = Invoke-RestMethod -Headers $headers -Uri $run.jobs_url
  $jobs.jobs | Select-Object id,conclusion,steps | ConvertTo-Json -Depth 6
}
