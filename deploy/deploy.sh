#!/usr/bin/env bash
# BadToGo · 一键部署到阿里云轻量服务器（从本地推送静态文件并热更新）
# 用法（在项目根目录、本地机器上运行）：
#   bash deploy/deploy.sh root@<服务器公网IP或域名>
# 例：
#   bash deploy/deploy.sh root@47.100.20.30
#
# 前置：服务器已按 DEPLOY-阿里云.md 第 1~3 步装好 nginx 并配置好站点目录 /var/www/badtogo
set -euo pipefail

HOST="${1:-}"
if [ -z "$HOST" ]; then
  echo "用法: bash deploy/deploy.sh user@host   (例: root@47.100.20.30)"
  exit 1
fi

REMOTE_DIR="/var/www/badtogo"
# 需要上传的产品文件（不含 node_modules / 测试 / 文档）
FILES=(index.html styles.css app.js sw.js manifest.webmanifest icon.svg)

echo "==> 校验本地构建..."
node selfcheck.mjs >/dev/null && echo "    selfcheck 通过"

echo "==> 在服务器创建目录 $REMOTE_DIR ..."
ssh "$HOST" "mkdir -p $REMOTE_DIR"

echo "==> 上传文件..."
# 优先用 rsync，没有则退回 scp
if command -v rsync >/dev/null 2>&1; then
  rsync -avz --delete-excluded "${FILES[@]}" "$HOST:$REMOTE_DIR/"
else
  scp "${FILES[@]}" "$HOST:$REMOTE_DIR/"
fi

echo "==> 重载 nginx..."
ssh "$HOST" "nginx -t && systemctl reload nginx"

echo "==> 完成 ✅  访问 https://<你的域名> 即可。"
