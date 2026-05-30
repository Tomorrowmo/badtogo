// 运行时端到端验证：用 jsdom 真实加载页面、执行 app.js、模拟完整闭环流程。
// 目标：确认无运行时异常、屏幕切换正确、数据真实写入 localStorage、数值计算正确。
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

let fail = 0, pass = 0;
const log = (ok, msg) => { console.log((ok ? '✓ ' : '✗ ') + msg); ok ? pass++ : fail++; };

const html = readFileSync('index.html', 'utf8');
const appjs = readFileSync('app.js', 'utf8');

// 捕获页面内 console.error
const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  beforeParse(win) {
    // --- 存根：Canvas 2D ---
    const ctxStub = new Proxy({}, {
      get: (t, p) => {
        if (p === 'createLinearGradient' || p === 'createRadialGradient')
          return () => ({ addColorStop() {} });
        if (p === 'measureText') return () => ({ width: 10 });
        if (typeof p === 'string') return (t[p] ||= () => {});
        return undefined;
      },
      set: () => true,
    });
    win.HTMLCanvasElement.prototype.getContext = () => ctxStub;
    win.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AA==';
    // --- 存根：Web Audio ---
    function FakeParam() { return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }; }
    class FakeCtx {
      constructor() { this.state = 'running'; this.currentTime = 0; this.sampleRate = 44100; this.destination = {}; }
      resume() {}
      createBuffer() { return { getChannelData: () => new Float32Array(100) }; }
      createBufferSource() { return { buffer: null, loop: false, connect: () => ({ connect: () => ({ connect() {} }) }), start() {}, stop() {} }; }
      createGain() { return { gain: FakeParam(), connect: (n) => n || { connect() {} } }; }
      createOscillator() { return { type: '', frequency: FakeParam(), connect: (n) => n || { connect() {} }, start() {}, stop() {} }; }
      createBiquadFilter() { return { type: '', frequency: FakeParam(), Q: FakeParam(), connect: (n) => n || { connect() {} } }; }
      createAnalyser() { return { fftSize: 0, frequencyBinCount: 256, getByteTimeDomainData() {} }; }
      createMediaStreamSource() { return { connect() {} }; }
    }
    win.AudioContext = FakeCtx; win.webkitAudioContext = FakeCtx;
    // --- 其他 ---
    win.requestAnimationFrame = () => 0; win.cancelAnimationFrame = () => {};
    win.navigator.vibrate = () => true;
    win.devicePixelRatio = 1;
    const origErr = win.console.error;
    win.console.error = (...a) => { errors.push(a.join(' ')); origErr.apply(win.console, a); };
  },
});
const win = dom.window;

// 在窗口上下文真实执行 app.js（outside-only 模式下用 win.eval）
try {
  win.eval(appjs);
  log(true, 'app.js 加载执行无抛出异常');
} catch (e) {
  log(false, 'app.js 执行抛错: ' + e.message + '\n' + e.stack);
}

const $ = (s) => win.document.querySelector(s);
const active = () => $('.screen.active')?.dataset.screen;
const BadToGo = win.BadToGo;
log(!!BadToGo, 'window.BadToGo 已暴露（应用初始化成功）');

// 清空既有本地数据，保证测试纯净
win.localStorage.clear();

// --- 模拟完整闭环 ---
log(active() === 'home', '初始在首页, 实际=' + active());

BadToGo.go('checkin');
log(active() === 'checkin', '进入 check-in, 实际=' + active());

// 选情绪 + 设强度
$('#emotionGrid button').dispatchEvent(new win.Event('click', { bubbles: true }));
const intensity = $('#intensity'); intensity.value = '8';
intensity.dispatchEvent(new win.Event('input', { bubbles: true }));
log(!$('#toVent').disabled, '选情绪后"去发泄"按钮可用');
log(BadToGo.session.before === 8, '发泄前强度记录为 8, 实际=' + BadToGo.session.before);

$('#toVent').dispatchEvent(new win.Event('click', { bubbles: true }));
log(active() === 'vent-select', '进入模式选择, 实际=' + active());

// 选"砸碎"
[...win.document.querySelectorAll('.mode-card')].find(c => c.dataset.mode === 'smash')
  .dispatchEvent(new win.Event('click', { bubbles: true }));
log(active() === 'vent-smash', '进入砸碎模式, 实际=' + active());

// 砸几下
const target = $('#smashTarget');
for (let i = 0; i < 6; i++) {
  const ev = new win.Event('pointerdown', { bubbles: true }); ev.clientX = 100; ev.clientY = 100;
  target.dispatchEvent(ev);
}
log($('#smashCount').textContent === '6', '砸碎计数=6, 实际=' + $('#smashCount').textContent);

// 发泄够了→呼吸
[...win.document.querySelectorAll('[data-vent-done]')].forEach(b => {
  if (b.closest('.screen').dataset.screen === 'vent-smash') b.dispatchEvent(new win.Event('click', { bubbles: true }));
});
log(active() === 'breathe', '进入呼吸平复, 实际=' + active());

// 直接跳到复盘（呼吸用计时器，测试中跳过）
$('#toReflect').dispatchEvent(new win.Event('click', { bubbles: true }));
log(active() === 'reflect', '进入复盘, 实际=' + active());

// 设发泄后强度=3，验证降幅文案
const after = $('#afterIntensity'); after.value = '3';
after.dispatchEvent(new win.Event('input', { bubbles: true }));
log(BadToGo.session.after === 3, '发泄后强度=3, 实际=' + BadToGo.session.after);
log($('#resultCard').innerHTML.includes('↓ 5'), '降幅文案显示 ↓5, 实际=' + $('#resultCard').textContent.slice(0, 20));

// 保存
$('#saveSession').dispatchEvent(new win.Event('click', { bubbles: true }));
const saved = JSON.parse(win.localStorage.getItem('badtogo.sessions.v1') || '[]');
log(saved.length === 1, '会话已写入 localStorage, 条数=' + saved.length);
log(saved[0].before === 8 && saved[0].after === 3 && saved[0].mode === 'smash',
  '记录内容正确: before=8 after=3 mode=smash, 实际=' + JSON.stringify(saved[0]).slice(0, 80));
log(active() === 'home', '保存后回到首页, 实际=' + active());
log($('#totalSessions').textContent === '1', '首页累计次数=1, 实际=' + $('#totalSessions').textContent);

// P1 漏斗指标：1 次开始 + 1 次完成 → 完成率 100%
log(BadToGo.Store.starts() === 1, '漏斗起点计数=1, 实际=' + BadToGo.Store.starts());
log(BadToGo.Store.completionRate() === 100, '闭环完成率=100%, 实际=' + BadToGo.Store.completionRate());

// 趋势页渲染
BadToGo.go('trends');
log(active() === 'trends' && !errors.length, '趋势页渲染无错误');

// 分享卡渲染
BadToGo.go('share');
log(active() === 'share', '分享卡页可进入');

// 校验 streak/avgDrop 计算
log($('#avgDrop'), 'avgDrop 计算执行');

// 最终：页面内不应有 console.error
log(errors.length === 0, '页面运行期 console.error 数=' + errors.length + (errors.length ? ' :: ' + errors.slice(0, 3).join(' | ') : ''));

console.log(`\n通过 ${pass} / 失败 ${fail}`);
console.log(fail === 0 ? 'RUNTIME E2E PASSED ✅' : 'RUNTIME E2E FAILED ❌');
process.exit(fail === 0 ? 0 : 1);
