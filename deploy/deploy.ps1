# BadToGo · 一键部署到阿里云轻量服务器（Windows PowerShell 版，使用系统自带 OpenSSH）
# 用法（在项目根目录运行）：
#   ./deploy/deploy.ps1 -Host root@47.100.20.30
# 前置：服务器已按 DEPLOY-阿里云.md 装好 nginx 并配置好站点目录 /var/www/badtogo
param(
  [Parameter(Mandatory=$true)][string]$RemoteHost
)
$ErrorActionPreference = 'Stop'
$RemoteDir = '/var/www/badtogo'
$Files = @('index.html','styles.css','app.js','sw.js','manifest.webmanifest','icon.svg')

Write-Host '==> 校验本地构建...'
node selfcheck.mjs | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'selfcheck 未通过，已中止部署' }
Write-Host '    selfcheck 通过'

Write-Host "==> 在服务器创建目录 $RemoteDir ..."
ssh $RemoteHost "mkdir -p $RemoteDir"

Write-Host '==> 上传文件...'
foreach ($f in $Files) { scp $f "${RemoteHost}:$RemoteDir/" }

Write-Host '==> 重载 nginx...'
ssh $RemoteHost 'nginx -t && systemctl reload nginx'

Write-Host '==> 完成 ✅  访问 https://<你的域名>'
