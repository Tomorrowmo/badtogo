// 设计预览：渲染「发泄图标」+「新主页」为 PNG，供决策。不参与产品构建。
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('design', { recursive: true });

// ---- 4 个线性图标（24x24, currentColor 描边）----
const ICONS = {
  撕: '<path d="M7 3h4l-1 3 1 3-1 3 1 3-1 3H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M17 3h-4l1 3-1 3 1 3-1 3 1 3h4a1 1 0 0 1 1-1V4a1 1 0 0 1-1-1z"/>',
  砸: '<path d="M14.5 4.5l5 5-3.2 3.2-5-5z"/><path d="M11 8l-6.2 6.2a2.1 2.1 0 1 0 3 3L14 11"/>',
  吼: '<polygon points="11 5 6 9 3 9 3 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.8 5.2a9 9 0 0 1 0 13.6"/>',
  捶: '<path d="M8 11V8a3 3 0 0 1 6 0v2"/><path d="M14 10V9a2.4 2.4 0 0 1 4.8 0v4.5a6 6 0 0 1-6 6h-2.3a5 5 0 0 1-5-5v-2a2 2 0 0 1 4 0"/><path d="M7.5 12.5H6a1.5 1.5 0 0 1 0-3h1.5"/>',
};
const icon = (d, size, color = '#eef1ff', sw = 1.8) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

// ---- 图标合订单 ----
function iconsSheet() {
  const cols = Object.entries(ICONS).map(([name, d], i) => {
    const x = 150 + i * 230;
    return `
      <rect x="${x - 70}" y="120" width="140" height="140" rx="28" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.1)"/>
      <g transform="translate(${x - 44},150)">${icon(d, 88).replace('<svg', '<svg x="0" y="0"')}</g>
      <text x="${x}" y="320" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="34" fill="#cdd2f0">${name}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="420" viewBox="0 0 1080 420">
    <rect width="1080" height="420" fill="#0b0d17"/>
    <text x="540" y="64" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="36" font-weight="700" fill="#fff">发泄图标（线性 SVG · 替换 emoji）</text>
    ${cols}</svg>`;
}

// ---- 新主页 mockup（1080x1920, 9:16）----
function home() {
  const iconRow = Object.values(ICONS).map((d, i) =>
    `<g transform="translate(${330 + i * 150},1500)">${icon(d, 56, '#9aa0c0', 1.7)}</g>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <radialGradient id="bg" cx="50%" cy="18%" r="95%"><stop offset="0%" stop-color="#1a1f3d"/><stop offset="60%" stop-color="#0b0d17"/><stop offset="100%" stop-color="#06070f"/></radialGradient>
      <linearGradient id="hot" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ff5a4d"/><stop offset="100%" stop-color="#ff9540"/></linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#bg)"/>
    <!-- 顶部小标 -->
    <text x="540" y="170" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="40" font-weight="800" fill="#eef1ff">撒<tspan fill="#ff7a4d">也</tspan></text>
    <text x="540" y="216" text-anchor="middle" font-family="sans-serif" font-size="22" letter-spacing="6" fill="#6f79b8">SAYE</text>
    <!-- 共鸣大字 -->
    <text x="540" y="620" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="96" font-weight="800" fill="#ffffff">今天，</text>
    <text x="540" y="740" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="96" font-weight="800" fill="#ffffff">又忍了一整天吧。</text>
    <text x="540" y="850" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="44" fill="#cdd2f0">这儿没人看，想砸就砸。</text>
    <!-- 巨大主按钮 -->
    <rect x="180" y="1080" width="720" height="180" rx="40" fill="url(#hot)"/>
    <text x="540" y="1198" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="72" font-weight="800" fill="#0b0d17">砸它 →</text>
    <text x="540" y="1370" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="34" fill="#9aa0c0">进去随时切：撕 · 吼 · 捶</text>
    <!-- 图标预览行 -->
    ${iconRow}
    <!-- 次要信息降级到底部 -->
    <text x="540" y="1750" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="30" fill="#6f79b8">情绪趋势      关于 / 隐私</text>
    <text x="540" y="1820" text-anchor="middle" font-family="Microsoft YaHei, sans-serif" font-size="24" fill="#3a3f66">撒也 SAYE · 你怎样都行</text>
  </svg>`;
}

await writeFile('design/icons.svg', iconsSheet());
await writeFile('design/home.svg', home());
await sharp(Buffer.from(iconsSheet()), { density: 200 }).png().toFile('design/preview-icons.png');
await sharp(Buffer.from(home()), { density: 160 }).png().toFile('design/preview-home.png');
console.log('已渲染：design/preview-icons.png + design/preview-home.png');
