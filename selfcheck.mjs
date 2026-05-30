// 一次性自检：验证 app.js 引用的 DOM id / data-属性 与 index.html 一致，并校验静态资源。
import { readFileSync } from 'node:fs';

let fail = 0;
const log = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); if (!ok) fail++; };

const html = readFileSync('index.html', 'utf8');
const js = readFileSync('app.js', 'utf8');
const css = readFileSync('styles.css', 'utf8');

// 1) 收集 html 中的 id 与 data-screen
const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const screens = new Set([...html.matchAll(/data-screen="([^"]+)"/g)].map(m => m[1]));

// 2) app.js 中 $('#xxx') 引用的 id
const refIds = new Set([...js.matchAll(/\$\('#([A-Za-z0-9_-]+)'\)/g)].map(m => m[1]));
let missing = [...refIds].filter(id => !htmlIds.has(id));
log(missing.length === 0, `app.js 引用的 ${refIds.size} 个 id 全部存在` + (missing.length ? ` —— 缺失: ${missing.join(', ')}` : ''));

// 3) go('xxx') 目标屏幕都存在
const goTargets = new Set([...js.matchAll(/go\('([a-z-]+)'\)/g)].map(m => m[1]));
let badScreens = [...goTargets].filter(s => !screens.has(s));
log(badScreens.length === 0, `所有 go() 目标屏幕存在 (${screens.size} 屏)` + (badScreens.length ? ` —— 未定义: ${badScreens.join(', ')}` : ''));

// 4) data-go 目标都存在
const dataGo = new Set([...html.matchAll(/data-go="([^"]+)"/g)].map(m => m[1]));
let badGo = [...dataGo].filter(s => !screens.has(s));
log(badGo.length === 0, `所有 data-go 目标屏幕存在` + (badGo.length ? ` —— 未定义: ${badGo.join(', ')}` : ''));

// 5) manifest JSON 合法
try { JSON.parse(readFileSync('manifest.webmanifest', 'utf8')); log(true, 'manifest.webmanifest 是合法 JSON'); }
catch (e) { log(false, 'manifest JSON 解析失败: ' + e.message); }

// 6) 引用的外部文件存在
['styles.css', 'app.js', 'manifest.webmanifest', 'icon.svg', 'sw.js', 'server.mjs'].forEach(f => {
  try { readFileSync(f); log(true, `资源存在: ${f}`); } catch { log(false, `资源缺失: ${f}`); }
});

// 7) 关键功能符号存在（防止误删）
['function startScream', 'function runBreathe', 'function drawShareCard', 'navigator.mediaDevices.getUserMedia', 'localStorage', 'createOscillator'].forEach(sym => {
  log(js.includes(sym), `关键实现存在: ${sym}`);
});

// 8) data-screen 与 CSS .active 机制
log(css.includes('.screen.active') && css.includes('.screen{'), 'CSS 屏幕切换样式存在');

console.log('\n' + (fail === 0 ? 'ALL CHECKS PASSED ✅' : `${fail} CHECK(S) FAILED ❌`));
process.exit(fail === 0 ? 0 : 1);
