// 生成品牌素材：撒也二维码 + 小红书封面海报（自包含 SVG，内嵌二维码）。
// 运行：npm run assets   （需 devDependency: qrcode）
import QRCode from 'qrcode';
import { writeFile, mkdir } from 'node:fs/promises';

const URL = process.env.SAYE_URL || 'https://tomorrowmo.github.io/badtogo/';
await mkdir('assets', { recursive: true });

// 1) 独立二维码（PNG，深色码 + 白底，便于贴海报/打印）
await QRCode.toFile('assets/qr-saye.png', URL, {
  margin: 1, width: 600, color: { dark: '#0b0d17', light: '#ffffff' },
});
const qrDataUrl = await QRCode.toDataURL(URL, { margin: 1, width: 420, color: { dark: '#0b0d17', light: '#ffffff' } });

// 2) 小红书封面海报（1080×1440，3:4），自包含
function poster({ hook, sub }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 1080 1440">
  <defs>
    <radialGradient id="bg" cx="50%" cy="22%" r="90%">
      <stop offset="0%" stop-color="#1a1f3d"/><stop offset="60%" stop-color="#0b0d17"/><stop offset="100%" stop-color="#06070f"/>
    </radialGradient>
    <linearGradient id="hot" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ff5a4d"/><stop offset="100%" stop-color="#ff9540"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1440" fill="url(#bg)"/>
  <!-- 品牌 -->
  <text x="540" y="240" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="120" font-weight="800" fill="#eef1ff">撒<tspan fill="url(#hot)">也</tspan></text>
  <text x="540" y="300" text-anchor="middle" font-family="sans-serif" font-size="34" letter-spacing="8" fill="#6f79b8">SAYE</text>
  <!-- 钩子主文案 -->
  <text x="540" y="520" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="76" font-weight="800" fill="#ffffff">${hook}</text>
  <text x="540" y="620" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="40" fill="#cdd2f0">${sub}</text>
  <!-- 情绪示意 8 → 3 -->
  <text x="380" y="830" text-anchor="middle" font-family="sans-serif" font-size="150" font-weight="800" fill="#ff5a4d">8</text>
  <text x="540" y="815" text-anchor="middle" font-family="sans-serif" font-size="70" fill="#9aa0c0">→</text>
  <text x="700" y="830" text-anchor="middle" font-family="sans-serif" font-size="150" font-weight="800" fill="#36d6c3">3</text>
  <text x="380" y="885" text-anchor="middle" font-family="PingFang SC, sans-serif" font-size="30" fill="#9aa0c0">发泄前</text>
  <text x="700" y="885" text-anchor="middle" font-family="PingFang SC, sans-serif" font-size="30" fill="#9aa0c0">平复后</text>
  <!-- 二维码 -->
  <rect x="430" y="980" width="220" height="220" rx="16" fill="#ffffff"/>
  <image x="440" y="990" width="200" height="200" href="${qrDataUrl}"/>
  <text x="540" y="1250" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="34" font-weight="700" fill="#eef1ff">扫码即用 · 或微信搜「撒也」</text>
  <text x="540" y="1320" text-anchor="middle" font-family="PingFang SC, Microsoft YaHei, sans-serif" font-size="30" fill="#6f79b8">撒野也可以，哭也可以。在这儿，你怎样都行。</text>
</svg>`;
}

const posters = [
  { name: 'poster-saye-1.svg', hook: '越发泄，越气？', sub: '所以我做了个反着来的' },
  { name: 'poster-saye-2.svg', hook: '在这儿，你可以不懂事', sub: '撒野也可以，哭也可以' },
  { name: 'poster-saye-3.svg', hook: '没地方吼？', sub: '对着手机，吼碎它' },
];
for (const p of posters) await writeFile('assets/' + p.name, poster(p));

// 同时输出可直接上传小红书的 PNG（需 sharp；缺失则仅保留 SVG）
try {
  const sharp = (await import('sharp')).default;
  for (const p of posters) {
    const png = p.name.replace('.svg', '.png');
    await sharp('assets/' + p.name, { density: 200 }).png().toFile('assets/' + png);
  }
  console.log('已生成：assets/qr-saye.png + 3 张海报(SVG+PNG)');
} catch (e) {
  console.log('已生成 SVG 海报；PNG 跳过（如需 PNG：npm i -D sharp 后重跑）。原因：' + e.message);
}
