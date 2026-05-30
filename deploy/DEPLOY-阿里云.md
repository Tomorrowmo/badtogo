# BadToGo · 阿里云轻量应用服务器部署手册

> 目标：把 BadToGo 部署到你的阿里云轻量服务器，公网可访问、HTTPS、可安装 PWA。  
> 推荐方案 A（nginx 静态 + HTTPS），适合生产；方案 B（Node 直跑）适合快速验证。  
> ⚠️ **"吼出来"麦克风功能必须 HTTPS** 才能用，所以强烈建议配域名 + 证书。

---

## 0. 你需要准备的 4 样东西（这是我无法替你做的部分）

| 项 | 说明 |
|---|---|
| 服务器公网 IP | 阿里云轻量控制台能看到 |
| SSH 登录方式 | root 密码，或密钥。本地用 `ssh root@<IP>` 能连上即可 |
| 一个域名 | 必需（HTTPS 证书需要）。可在阿里云买，几十块/年 |
| 域名解析 | 在阿里云"云解析 DNS"把域名 A 记录指向服务器公网 IP |

> 把这 4 样准备好后，下面命令复制粘贴即可。如果你愿意把 IP + 临时 SSH 方式发我，我也可以直接远程帮你执行。

---

## 方案 A：nginx 静态托管 + HTTPS（推荐）

### 第 1 步：放行端口
阿里云轻量控制台 → 你的实例 → **防火墙** → 添加规则，放行 **80** 和 **443**。

### 第 2 步：登录服务器、装 nginx
```bash
ssh root@<你的IP>

# Ubuntu/Debian
apt update && apt install -y nginx
# 或 CentOS/Alibaba Cloud Linux
# yum install -y nginx

mkdir -p /var/www/badtogo
systemctl enable --now nginx
```

### 第 3 步：配置站点
把本仓库 `deploy/nginx-badtogo.conf` 里的 `YOUR_DOMAIN` 改成你的域名，然后：
```bash
# 在本地把配置传上去（在项目根目录执行）
scp deploy/nginx-badtogo.conf root@<你的IP>:/etc/nginx/conf.d/badtogo.conf
# 服务器上校验并重载
ssh root@<你的IP> "nginx -t && systemctl reload nginx"
```

### 第 4 步：从本地一键上传产品文件
- Windows（PowerShell）：
  ```powershell
  ./deploy/deploy.ps1 -RemoteHost root@<你的IP>
  ```
- macOS/Linux（或 Windows 的 Git Bash）：
  ```bash
  bash deploy/deploy.sh root@<你的IP>
  ```
脚本会自动跑 `selfcheck`、上传 6 个产品文件、重载 nginx。

### 第 5 步：签发 HTTPS 证书（Let's Encrypt，免费）
```bash
ssh root@<你的IP>
apt install -y certbot python3-certbot-nginx     # CentOS: yum install -y certbot python3-certbot-nginx
certbot --nginx -d <你的域名>                      # 按提示填邮箱、同意条款
# certbot 会自动改写 nginx 配置、加上证书、配置自动续期
```

### 完成 ✅
浏览器打开 `https://<你的域名>`，即可使用，并可"添加到主屏幕"安装为 App。

### 以后更新版本
改完代码后，本地再跑一次部署脚本即可：
```powershell
./deploy/deploy.ps1 -RemoteHost root@<你的IP>
```

---

## 方案 B：Node 直跑（最快，先不配域名验证用）

```bash
# 本地上传全部文件（含 server.mjs）
scp index.html styles.css app.js sw.js manifest.webmanifest icon.svg server.mjs root@<你的IP>:/var/www/badtogo/
ssh root@<你的IP>

# 装 Node（若没有）
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -   # Debian/Ubuntu
apt install -y nodejs

# 用 systemd 守护进程
cp /var/www/badtogo/... # 见 deploy/badtogo-node.service，把它放到 /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now badtogo
```
然后在阿里云防火墙放行 **5173**，访问 `http://<你的IP>:5173`。  
⚠️ 这是 http，**麦克风(吼)功能不可用**；其余功能正常。要用吼模式请走方案 A。

---

## 常见问题

- **打开是 nginx 默认页**：说明站点配置没生效或域名没解析对。检查 `nginx -t`、DNS A 记录、`/var/www/badtogo` 里有没有 index.html。
- **证书签发失败**：确认域名已解析到本机 IP、80 端口已放行且未被占用。
- **PWA 装不上 / 不离线**：必须 HTTPS；清缓存后重进；确认 `sw.js` 能访问到（`https://域名/sw.js`）。
- **吼模式没反应**：必须 HTTPS，并在浏览器允许麦克风权限。
