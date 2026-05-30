# BadToGo · 坏情绪，打包带走

> 一个**先发泄、后平复**的情绪急救工具。60 秒安全地把坏情绪发出去，再用循证呼吸把你拉回平静，最后让你**看见情绪分下降**。本地优先，隐私零上传，零安装，可直接打开使用。

![status](https://img.shields.io/badge/tests-23%2F23%20passing-brightgreen) ![type](https://img.shields.io/badge/stack-zero--dependency%20web-blue) ![privacy](https://img.shields.io/badge/privacy-local--first-success)

> 🌐 **线上体验（HTTPS，「吼」可用）**：https://tomorrowmo.github.io/badtogo/ — 免费托管、自动 HTTPS，全部功能（含麦克风「吼」、离线安装）均可用。
> 备用（大陆服务器，http）：http://39.96.207.137:9000/ （http 下「吼」与离线安装不可用）

---

## 它为什么不一样

市面上的"发泄器"要么是纯解压玩具（**研究表明单纯发泄反而会让你更气** — Bushman, 2002），要么是节奏很慢的冥想 App，没人管"我现在就很气"的瞬间。

**BadToGo 把"宣泄 + 循证平复"做成一个闭环**，并用发泄前后的情绪打分让你亲眼看到自己变好——这是它的护城河，也是它"真有用"的证据。

```
①命名情绪  →  ②发泄(撕/砸/吼/捶)  →  ③呼吸平复  →  ④复盘:看见分数下降
```

## 功能

- **四种发泄模式**：✍️ 撕掉（写下来撕碎/烧掉/扔进黑洞）· 🔨 砸碎 · 📣 吼出来（麦克风实时可视化）· 🥊 捶打
- **循证平复**：盒式呼吸 4-4-4-4 / 延长呼气 4-6（带视觉与音效引导）
- **情绪度量**：发泄前后 0–10 打分，自动算降幅
- **趋势**：本地情绪曲线、累计清空次数、有效率（分数下降占比）
- **分享卡**：一键生成"今天我清空了一点坏情绪"图片（不含任何隐私内容）
- **隐私**：无需注册、不联网、不收集个人信息；发泄文字只在内存中，销毁后即丢弃

## 快速开始

> 推荐用本地服务器启动（"吼出来"模式需要 `localhost`/https 才能获取麦克风权限）。

```bash
# 方式一：用内置零依赖服务器（推荐）
npm start
# 然后浏览器打开 http://localhost:5173

# 方式二：用 Python（无需 Node 依赖）
python -m http.server 5173
# 然后打开 http://localhost:5173
```

也可以直接双击 `index.html` 用浏览器打开——除"吼出来"麦克风外，其余功能均可用。

## 运行测试

```bash
npm test      # 静态交叉检查 + jsdom 端到端 21 项测试
npm run check # 仅静态检查
```

## 部署到阿里云

完整步骤见 [`deploy/DEPLOY-阿里云.md`](deploy/DEPLOY-阿里云.md)。准备好「服务器 IP + 域名 + 解析」后，本地一条命令即可上线：

```powershell
# Windows
./deploy/deploy.ps1 -RemoteHost root@<你的IP>
```
```bash
# macOS / Linux / Git Bash
bash deploy/deploy.sh root@<你的IP>
```

> 「吼出来」麦克风功能需要 HTTPS，部署手册含 Let's Encrypt 免费证书一键签发。

## 技术栈

纯前端、**零运行时依赖、零构建**：HTML + CSS + 原生 JS。音效用 Web Audio 实时合成、特效用 Canvas、数据用 localStorage。`jsdom` 仅用于测试（devDependency）。

```
badtogo/
├─ index.html            # 单页结构（12 个屏幕）
├─ styles.css            # 视觉系统（暗→暖→青蓝的情绪叙事）
├─ app.js                # 状态机 + 音效引擎 + 粒子 + 各模式 + 呼吸 + 存储
├─ server.mjs            # 零依赖本地静态服务器
├─ manifest.webmanifest  # PWA 清单
├─ icon.svg              # 应用图标
├─ selfcheck.mjs         # 静态交叉检查
├─ runtime.test.mjs      # jsdom 端到端测试
└─ docs/
   ├─ 01-商业分析与战略.md
   ├─ 02-产品设计与心理学依据.md
   ├─ 03-融资与路线图.md
   ├─ 04-产品之魂-见自己.md  # 「允许做自己」— 使命/定位/三重境界路线图
   ├─ 05-增长冷启动作战手册.md # 命名/小红书7条/短视频3条/承接/纪律
   └─ CHANGELOG-留痕.md   # 重大决策日志（黑匣子）
```

## 重要声明

BadToGo **不是医疗或诊断工具，不能替代专业心理治疗**。如果你有持续的痛苦、自伤或伤害他人的念头，请立即寻求专业帮助：中国大陆心理援助热线 **400-161-9995**（24h），紧急情况拨打 **110 / 120**。

## License

MIT
