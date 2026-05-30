/* =========================================================================
 * BadToGo · app.js  —  零依赖单页情绪急救应用
 * 角色：研发。架构：状态机 + Web Audio 合成 + Canvas 粒子 + localStorage。
 * 设计红线：发泄后必引导平复（见 docs/02）。文字内容绝不落盘/上传。
 * ========================================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- 工具 */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const now = () => new Date();
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  /* ---------------------------------------------------------------- 状态 */
  const session = {
    emotion: null, emotionEmoji: '', before: 5, after: 3,
    mode: null, startedAt: null,
  };

  /* =================================================================
   * 1) 音效引擎：Web Audio 实时合成（无任何二进制资源，完全离线）
   * ================================================================= */
  const Audio = (function () {
    let ctx = null;
    const ensure = () => {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) ctx = new AC();
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    };
    // 白噪声 buffer（碎裂/撕纸用）
    let noiseBuf = null;
    const noise = () => {
      const c = ensure(); if (!c) return null;
      if (!noiseBuf) {
        noiseBuf = c.createBuffer(1, c.sampleRate * 1, c.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      }
      return noiseBuf;
    };
    const env = (g, peak, dur, t0) => {
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    };

    return {
      unlock: ensure,
      // 玻璃/盘子碎裂：高通噪声爆发 + 几声高频叮
      smash() {
        const c = ensure(); if (!c) return; const t = c.currentTime;
        // ① 低频闷响：给"砸下去"加重量感
        const thud = c.createOscillator(); thud.type = 'sine';
        thud.frequency.setValueAtTime(150, t); thud.frequency.exponentialRampToValueAtTime(45, t + 0.18);
        const tg = c.createGain(); env(tg, 0.6, 0.22, t);
        thud.connect(tg).connect(c.destination); thud.start(t); thud.stop(t + 0.25);
        // ② 高频碎裂噪声
        const src = c.createBufferSource(); src.buffer = noise();
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
        const g = c.createGain(); env(g, 0.55, 0.25, t);
        src.connect(hp).connect(g).connect(c.destination); src.start(t); src.stop(t + 0.3);
        // ③ 玻璃碎片叮叮声
        [2300, 3100, 4200].forEach((f, i) => {
          const o = c.createOscillator(); const og = c.createGain(); o.type = 'triangle';
          o.frequency.setValueAtTime(f * (1 + Math.random() * .2), t + i * 0.02);
          env(og, 0.2, 0.18, t + i * 0.02);
          o.connect(og).connect(c.destination); o.start(t + i * 0.02); o.stop(t + 0.25);
        });
      },
      // 撕纸：带通噪声短促
      tear() {
        const c = ensure(); if (!c) return; const t = c.currentTime;
        const src = c.createBufferSource(); src.buffer = noise();
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2600; bp.Q.value = 0.7;
        const g = c.createGain(); env(g, 0.35, 0.4, t);
        src.connect(bp).connect(g).connect(c.destination); src.start(t); src.stop(t + 0.42);
      },
      // 火焰：低通噪声较长
      burn() {
        const c = ensure(); if (!c) return; const t = c.currentTime;
        const src = c.createBufferSource(); src.buffer = noise(); src.loop = true;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.3, t + 0.15);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        src.connect(lp).connect(g).connect(c.destination); src.start(t); src.stop(t + 1.25);
      },
      // 黑洞吸入：下滑正弦
      whoosh() {
        const c = ensure(); if (!c) return; const t = c.currentTime;
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(600, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.7);
        const g = c.createGain(); env(g, 0.3, 0.7, t);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.75);
      },
      // 拳击：低频 thump
      punch() {
        const c = ensure(); if (!c) return; const t = c.currentTime;
        const o = c.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
        const g = c.createGain(); env(g, 0.6, 0.2, t);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.22);
        // 噪声拍击层
        const src = c.createBufferSource(); src.buffer = noise();
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1200;
        const ng = c.createGain(); env(ng, 0.2, 0.08, t);
        src.connect(hp).connect(ng).connect(c.destination); src.start(t); src.stop(t + 0.1);
      },
      // 平复提示音：柔和正弦
      chime(freq = 528) {
        const c = ensure(); if (!c) return; const t = c.currentTime;
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.22, t + 0.1);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 1.5);
      },
    };
  })();

  /* =================================================================
   * 2) 粒子/碎片特效（全局 Canvas）
   * ================================================================= */
  const FX = (function () {
    const cv = $('#fx'); const cx = cv.getContext('2d');
    let parts = [], raf = null, W = 0, H = 0, dpr = 1;
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth; H = cv.clientHeight;
      cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    window.addEventListener('resize', resize); resize();

    function loop() {
      cx.clearRect(0, 0, W, H);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.99;
        p.rot += p.vr; p.life -= 1;
        const a = clamp(p.life / p.maxLife, 0, 1);
        cx.save(); cx.globalAlpha = a; cx.translate(p.x, p.y); cx.rotate(p.rot);
        cx.fillStyle = p.color;
        if (p.shape === 'rect') cx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.7);
        else { cx.beginPath(); cx.arc(0, 0, p.s / 2, 0, 7); cx.fill(); }
        cx.restore();
        if (p.life <= 0 || p.y > H + 60) parts.splice(i, 1);
      }
      if (parts.length) raf = requestAnimationFrame(loop);
      else { raf = null; cx.clearRect(0, 0, W, H); }
    }
    function go() { if (!raf) raf = requestAnimationFrame(loop); }

    return {
      resize,
      // 在(x,y)爆发 n 个碎片
      burst(x, y, n, opts = {}) {
        const colors = opts.colors || ['#cfd6ff', '#8a93c9', '#ffffff', '#6f79b8'];
        const shape = opts.shape || 'rect';
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2;
          const sp = (opts.speed || 6) * (0.4 + Math.random());
          parts.push({
            x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - (opts.up || 3),
            g: opts.g != null ? opts.g : 0.35, rot: Math.random() * 6, vr: (Math.random() - .5) * .5,
            s: (opts.size || 14) * (0.5 + Math.random()), color: colors[i % colors.length],
            shape, life: (opts.life || 60) * (0.6 + Math.random() * 0.6), maxLife: opts.life || 60,
          });
        }
        go();
      },
      // 文字碎成纸屑（撕掉模式）：碎片数量正比于文字长度
      shatterText(text, x, y) {
        const n = clamp((text || '').replace(/\s+/g, '').length, 12, 120);
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2; const sp = 3 + Math.random() * 5;
          parts.push({
            x: x + (Math.random() - .5) * 140, y: y + (Math.random() - .5) * 100,
            vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 2, g: 0.28,
            rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
            s: 10 + Math.random() * 10, color: ['#e8eaf6', '#cfd3ee', '#ffffff', '#aeb4dd'][i % 4],
            shape: 'rect', life: 70 * (0.6 + Math.random()), maxLife: 70,
          });
        }
        go();
      },
    };
  })();

  /* =================================================================
   * 3) 本地存储
   * ================================================================= */
  const Store = {
    KEY: 'badtogo.sessions.v1',
    STARTS: 'badtogo.starts.v1',
    all() { try { return JSON.parse(localStorage.getItem(this.KEY) || '[]'); } catch (e) { return []; } },
    add(rec) { const a = this.all(); a.push(rec); localStorage.setItem(this.KEY, JSON.stringify(a.slice(-500))); },
    clear() { localStorage.removeItem(this.KEY); localStorage.removeItem(this.STARTS); },
    // 漏斗：记录"开始发泄"次数，用于计算闭环完成率（纯本地，不上传）
    bumpStart() { localStorage.setItem(this.STARTS, String(this.starts() + 1)); },
    starts() { return parseInt(localStorage.getItem(this.STARTS) || '0', 10) || 0; },
    completionRate() { const s = this.starts(); return s ? Math.round(this.all().length / s * 100) : 0; },
    streak() {
      const a = this.all(); if (!a.length) return 0;
      const days = new Set(a.map(r => new Date(r.t).toISOString().slice(0, 10)));
      let s = 0; const d = new Date();
      for (;;) {
        const key = d.toISOString().slice(0, 10);
        if (days.has(key)) { s++; d.setDate(d.getDate() - 1); }
        else if (s === 0 && key === new Date().toISOString().slice(0, 10)) { d.setDate(d.getDate() - 1); }
        else break;
      }
      return s;
    },
    avgDrop() {
      const a = this.all(); if (!a.length) return null;
      const drops = a.map(r => r.before - r.after);
      return (drops.reduce((x, y) => x + y, 0) / drops.length);
    },
  };

  /* =================================================================
   * 4) 屏幕导航（状态机）
   * ================================================================= */
  const screens = {};
  $$('.screen').forEach(s => screens[s.dataset.screen] = s);
  let current = 'home';
  function go(name) {
    if (!screens[name]) return;
    screens[current].classList.remove('active');
    screens[name].classList.add('active');
    current = name;
    onEnter(name);
    window.scrollTo(0, 0);
  }
  function onEnter(name) {
    if (name === 'home') renderHome();
    if (name === 'breathe') resetBreathe();
    if (name === 'reflect') renderReflect();
    if (name === 'trends') renderTrends();
    if (name === 'share') drawShareCard();
    if (name === 'vent-scream') resetScream();
  }
  // 通用 data-go 绑定
  $$('[data-go]').forEach(b => b.addEventListener('click', () => { Audio.unlock(); go(b.dataset.go); }));

  /* =================================================================
   * 5) 首页
   * ================================================================= */
  function renderHome() {
    $('#streakNum').textContent = Store.streak();
    $('#totalSessions').textContent = Store.all().length;
    const ad = Store.avgDrop();
    $('#avgDrop').textContent = ad == null ? '—' : ('-' + ad.toFixed(1));
  }

  /* =================================================================
   * 6) Check-in
   * ================================================================= */
  const EMOTIONS = [
    ['愤怒', '😠'], ['焦虑', '😰'], ['难过', '😢'], ['烦躁', '😤'],
    ['委屈', '🥺'], ['压力大', '🤯'], ['失望', '😔'], ['孤独', '🫥'], ['空虚', '🌫️'],
  ];
  function buildEmotions() {
    const g = $('#emotionGrid');
    g.innerHTML = '';
    EMOTIONS.forEach(([name, e]) => {
      const b = document.createElement('button');
      b.innerHTML = `<span class="e">${e}</span>${name}`;
      b.addEventListener('click', () => {
        $$('#emotionGrid button').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        session.emotion = name; session.emotionEmoji = e;
        $('#toVent').disabled = false;
      });
      g.appendChild(b);
    });
  }
  buildEmotions();
  $('#intensity').addEventListener('input', e => {
    $('#intensityVal').textContent = e.target.value;
    session.before = +e.target.value;
  });
  $('#toVent').addEventListener('click', () => { session.before = +$('#intensity').value; go('vent-select'); });

  /* =================================================================
   * 7) 模式选择
   * ================================================================= */
  $$('.mode-card').forEach(c => c.addEventListener('click', () => {
    Audio.unlock();
    session.mode = c.dataset.mode; session.startedAt = Date.now();
    Store.bumpStart(); // 漏斗起点：进入发泄
    go('vent-' + c.dataset.mode);
  }));
  // 任意"发泄够了"→ 进呼吸
  $$('[data-vent-done]').forEach(b => b.addEventListener('click', () => go('breathe')));

  /* =================================================================
   * 8) 撕掉模式
   * ================================================================= */
  let shredMethod = 'tear';
  $$('[data-shred]').forEach(b => b.addEventListener('click', () => {
    shredMethod = b.dataset.shred;
    const txt = $('#shredText').value;
    const rect = $('#shredText').getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    if (shredMethod === 'tear') {
      Audio.tear();
      FX.shatterText(txt, cx, cy);
      FX.burst(cx, cy, 40, { colors: ['#e8eaf6', '#cfd3ee', '#ffffff'], size: 16, speed: 7, life: 70 });
    } else if (shredMethod === 'burn') {
      Audio.burn();
      FX.burst(cx, cy, 60, { colors: ['#ff5a4d', '#ff9540', '#ffd24d', '#7a2a16'], size: 12, speed: 5, up: 5, g: 0.12, life: 80 });
    } else {
      Audio.whoosh();
      FX.burst(cx, cy, 50, { colors: ['#5b8cff', '#36d6c3', '#2a2f5a', '#ffffff'], size: 10, speed: 4, up: 0, g: -0.05, life: 60 });
    }
    vibrate([20, 30, 20]);
    // 文字即刻清空——绝不保留
    $('#shredText').value = '';
    // 短暂提示后引导平复
    flashThenBreathe();
  }));
  function flashThenBreathe() {
    setTimeout(() => go('breathe'), 1100);
  }

  /* =================================================================
   * 9) 砸碎模式
   * ================================================================= */
  let smashCount = 0;
  const smashTarget = $('#smashTarget');
  function doSmash(clientX, clientY) {
    smashCount++; $('#smashCount').textContent = smashCount;
    Audio.smash(); vibrate(35);
    smashTarget.classList.remove('hit'); void smashTarget.offsetWidth; smashTarget.classList.add('hit');
    FX.burst(clientX, clientY, 26, { colors: ['#cfd6ff', '#8a93c9', '#ffffff', '#6f79b8'], size: 16, speed: 8, life: 55 });
    if (smashCount % 5 === 0) FX.burst(clientX, clientY, 40, { size: 20, speed: 11, life: 60 });
  }
  smashTarget.addEventListener('pointerdown', e => doSmash(e.clientX, e.clientY));
  // 拖拽连砸
  $('#smashStage').addEventListener('pointermove', e => {
    if (e.pressure > 0 || (e.buttons & 1)) {
      if (Math.random() < 0.5) doSmash(e.clientX, e.clientY);
    }
  });

  /* =================================================================
   * 10) 吼出来模式（麦克风）
   * ================================================================= */
  let micStream = null, analyser = null, micRAF = null, screamPeak = 0;
  const screamRing = $('#screamRing'), screamFill = $('#screamFill');
  // 仅在"安全上下文"(https/localhost)且浏览器支持时，麦克风才可用。
  // http://IP 下浏览器禁止麦克风——此时不去申请，直接用"狂点发泄"，避免刺眼报错。
  const micSupported = !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  function enableTapVent() {
    screamRing.style.cursor = 'pointer';
    screamRing.onpointerdown = () => {
      const r = screamRing.getBoundingClientRect();
      Audio.smash(); vibrate(20);
      FX.burst(r.left + r.width / 2, r.top + r.height / 2, 18, { size: 14, speed: 9, life: 45 });
      screamRing.style.transform = 'scale(1.32)';
      setTimeout(() => screamRing.style.transform = 'scale(1)', 100);
    };
  }
  function resetScream() {
    screamPeak = 0; $('#screamPeak').textContent = '0';
    screamFill.style.width = '0%'; screamRing.style.transform = 'scale(1)';
    screamRing.onpointerdown = null; screamRing.style.cursor = '';
    if (micSupported) {
      $('#screamStart').style.display = '';
      $('#screamStart').textContent = '开启麦克风';
      $('#screamHint').textContent = '点下面开启麦克风，越大声，冲击越猛。';
    } else {
      // 非安全环境：直接进入"狂点发泄"，正面引导
      $('#screamStart').style.display = 'none';
      $('#screamHint').textContent = '用力快速连点下面的圆圈，把它吼碎！';
      enableTapVent();
    }
  }
  async function startScream() {
    Audio.unlock();
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const c = Audio.unlock();
      const src = c.createMediaStreamSource(micStream);
      analyser = c.createAnalyser(); analyser.fftSize = 512;
      src.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      $('#screamStart').style.display = 'none';
      $('#screamHint').textContent = '吼出来！越大声越爽。';
      const tick = () => {
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const rms = Math.sqrt(sum / data.length);
        const level = clamp(rms * 220, 0, 100);
        screamFill.style.width = level + '%';
        const sc = 1 + level / 60;
        screamRing.style.transform = `scale(${sc})`;
        screamRing.style.boxShadow = `0 0 ${level}px ${level / 6}px rgba(255,90,77,.5)`;
        if (level > screamPeak) { screamPeak = level; $('#screamPeak').textContent = Math.round(level); }
        if (level > 55) {
          const r = screamRing.getBoundingClientRect();
          if (Math.random() < 0.4) FX.burst(r.left + r.width / 2, r.top + r.height / 2, 10, { size: 12, speed: 9, life: 40 });
        }
        micRAF = requestAnimationFrame(tick);
      };
      tick();
    } catch (err) {
      // 用户拒绝授权 → 退化为"狂点发泄"，正面引导，不报错
      $('#screamHint').textContent = '没开麦克风也行——快速狂点下面的圆圈发泄！';
      $('#screamStart').style.display = 'none';
      enableTapVent();
    }
  }
  function stopScream() {
    if (micRAF) cancelAnimationFrame(micRAF), micRAF = null;
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    analyser = null;
  }
  $('#screamStart').addEventListener('click', startScream);
  // 离开吼模式时关闭麦克风
  $$('[data-vent-done]').forEach(b => b.addEventListener('click', () => { if (current === 'vent-scream') stopScream(); }));

  /* =================================================================
   * 11) 捶打模式
   * ================================================================= */
  let punchTotal = 0, combo = 0, comboTimer = null;
  const punchBag = $('#punchBag');
  function doPunch(x, y) {
    punchTotal++; combo++;
    $('#punchTotal').textContent = punchTotal; $('#comboNum').textContent = combo;
    Audio.punch(); vibrate(30);
    punchBag.classList.remove('hit'); void punchBag.offsetWidth; punchBag.classList.add('hit');
    FX.burst(x, y, 14, { colors: ['#ff7a6e', '#c8342a', '#ffd24d', '#ffffff'], size: 13, speed: 7, life: 45 });
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => { combo = 0; $('#comboNum').textContent = 0; }, 1200);
  }
  punchBag.addEventListener('pointerdown', e => doPunch(e.clientX, e.clientY));

  /* =================================================================
   * 12) 呼吸引擎
   * ================================================================= */
  const PATTERNS = {
    box: { name: 'box', total: 4, steps: [['吸气', 4, 'inhale'], ['屏住', 4, 'hold'], ['呼气', 4, 'exhale'], ['屏住', 4, 'hold']] },
    exhale: { name: 'exhale', total: 5, steps: [['吸气', 4, 'inhale'], ['呼气', 6, 'exhale']] },
  };
  let breathePattern = 'box', breatheRunning = false, breatheTimer = null;
  const orb = $('#breatheOrb'), phaseEl = $('#breathePhase'), cycleEl = $('#breatheCycle');
  function resetBreathe() {
    breatheRunning = false; clearTimeout(breatheTimer);
    orb.className = 'breathe-orb'; phaseEl.textContent = '准备';
    cycleEl.textContent = '0';
    $('#breatheTotal').textContent = PATTERNS[breathePattern].total;
    $('#breatheStart').textContent = '开始呼吸'; $('#breatheStart').style.display = '';
  }
  $$('[data-pattern]').forEach(b => b.addEventListener('click', () => {
    $$('[data-pattern]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); breathePattern = b.dataset.pattern;
    resetBreathe();
  }));
  function runBreathe() {
    const pat = PATTERNS[breathePattern];
    // 同步圆球过渡时长（吸/呼用 step 秒，屏住保持）
    orb.style.transition = 'transform .4s ease, box-shadow .4s ease';
    let cycle = 0;
    breatheRunning = true;
    $('#breatheStart').style.display = 'none';
    const step = (si) => {
      if (!breatheRunning) return;
      if (si === 0) { cycle++; if (cycle > pat.total) { finishBreathe(); return; } cycleEl.textContent = cycle; }
      const [label, secs, cls] = pat.steps[si];
      phaseEl.textContent = label;
      orb.classList.remove('inhale', 'exhale');
      orb.style.transition = `transform ${secs}s ease-in-out, box-shadow ${secs}s ease-in-out`;
      if (cls === 'inhale') { orb.classList.add('inhale'); Audio.chime(528); }
      else if (cls === 'exhale') { orb.classList.add('exhale'); Audio.chime(396); }
      // 倒计时显示在 phase 文本后
      let left = secs;
      phaseEl.textContent = `${label} ${left}`;
      const cd = setInterval(() => { left--; if (left > 0) phaseEl.textContent = `${label} ${left}`; }, 1000);
      breatheTimer = setTimeout(() => {
        clearInterval(cd);
        step((si + 1) % pat.steps.length);
      }, secs * 1000);
    };
    step(0);
  }
  function finishBreathe() {
    breatheRunning = false; orb.className = 'breathe-orb';
    phaseEl.textContent = '做得好';
    Audio.chime(639);
    setTimeout(() => go('reflect'), 1200);
  }
  $('#breatheStart').addEventListener('click', runBreathe);
  $('#toReflect').addEventListener('click', () => { breatheRunning = false; clearTimeout(breatheTimer); go('reflect'); });

  /* =================================================================
   * 13) 复盘 + 保存
   * ================================================================= */
  $('#afterIntensity').addEventListener('input', e => {
    $('#afterVal').textContent = e.target.value; session.after = +e.target.value; renderReflect();
  });
  function renderReflect() {
    session.after = +$('#afterIntensity').value;
    const drop = session.before - session.after;
    const card = $('#resultCard');
    let cls, txt, head;
    if (drop > 0) { cls = 'down'; head = `↓ ${drop} 分`; txt = `从 ${session.before} 降到 ${session.after}。看，你把它发出去了，也平复下来了。`; }
    else if (drop === 0) { cls = 'same'; head = '持平'; txt = `还停在 ${session.after} 分？没关系，可以再发泄一轮，或多做几次呼吸。`; }
    else { cls = 'up'; head = `↑ ${-drop} 分`; txt = '分数升高很正常——深呼吸通常需要几分钟才起效。要不要再做一组呼吸？'; }
    card.innerHTML = `<div class="big-drop ${cls}">${head}</div><div>${txt}</div>`;
  }
  $('#saveSession').addEventListener('click', () => {
    Store.add({
      t: Date.now(), emotion: session.emotion, emoji: session.emotionEmoji,
      before: session.before, after: session.after, mode: session.mode,
      durationMs: session.startedAt ? Date.now() - session.startedAt : null,
    });
    Audio.chime(528);
    go('home');
  });
  $('#toShare').addEventListener('click', () => go('share'));

  /* =================================================================
   * 14) 趋势
   * ================================================================= */
  function renderTrends() {
    const a = Store.all();
    const stats = $('#trendStats');
    const ad = Store.avgDrop();
    const downCount = a.filter(r => r.before > r.after).length;
    const downRate = a.length ? Math.round(downCount / a.length * 100) : 0;
    stats.innerHTML = `
      <div class="ts"><b>${a.length}</b><span>累计清空</span></div>
      <div class="ts"><b>${ad == null ? '—' : '-' + ad.toFixed(1)}</b><span>平均降幅</span></div>
      <div class="ts"><b>${downRate}%</b><span>有效率(分降)</span></div>
      <div class="ts"><b>${Store.completionRate()}%</b><span>闭环完成率</span></div>`;
    drawTrendChart(a);
    const list = $('#trendList');
    if (!a.length) { list.innerHTML = '<div class="empty">还没有记录。回首页开始第一次吧。</div>'; return; }
    list.innerHTML = a.slice(-12).reverse().map(r => {
      const d = r.before - r.after;
      const cls = d > 0 ? 'down' : (d < 0 ? 'up' : '');
      const sign = d > 0 ? `↓${d}` : (d < 0 ? `↑${-d}` : '·');
      const dt = new Date(r.t);
      const md = `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
      return `<div class="trend-row"><div>${r.emoji || ''} ${r.emotion || ''} <span class="meta">${modeName(r.mode)} · ${md}</span></div>
        <div class="delta ${cls}">${r.before}→${r.after} <span>${sign}</span></div></div>`;
    }).join('');
  }
  function modeName(m) { return ({ shred: '撕掉', smash: '砸碎', scream: '吼', punch: '捶打' })[m] || '发泄'; }
  function drawTrendChart(a) {
    const cv = $('#trendCanvas'); const cx = cv.getContext('2d');
    const W = cv.width, H = cv.height; cx.clearRect(0, 0, W, H);
    const pad = 36; const data = a.slice(-30);
    cx.strokeStyle = 'rgba(255,255,255,.12)'; cx.lineWidth = 1;
    for (let v = 0; v <= 10; v += 2) {
      const y = pad + (H - pad * 2) * (1 - v / 10);
      cx.beginPath(); cx.moveTo(pad, y); cx.lineTo(W - 10, y); cx.stroke();
      cx.fillStyle = 'rgba(255,255,255,.4)'; cx.font = '20px sans-serif'; cx.fillText(v, 6, y + 6);
    }
    if (data.length < 1) { cx.fillStyle = 'rgba(255,255,255,.4)'; cx.font = '24px sans-serif'; cx.fillText('暂无数据', W / 2 - 60, H / 2); return; }
    const xAt = i => pad + (W - pad - 10) * (data.length === 1 ? 0.5 : i / (data.length - 1));
    const yAt = v => pad + (H - pad * 2) * (1 - v / 10);
    const drawLine = (key, color) => {
      cx.strokeStyle = color; cx.lineWidth = 3; cx.beginPath();
      data.forEach((r, i) => { const x = xAt(i), y = yAt(r[key]); i ? cx.lineTo(x, y) : cx.moveTo(x, y); });
      cx.stroke();
      cx.fillStyle = color;
      data.forEach((r, i) => { cx.beginPath(); cx.arc(xAt(i), yAt(r[key]), 4, 0, 7); cx.fill(); });
    };
    drawLine('before', '#ff5a4d'); drawLine('after', '#36d6c3');
    cx.font = '20px sans-serif';
    cx.fillStyle = '#ff5a4d'; cx.fillText('● 发泄前', W - 230, 26);
    cx.fillStyle = '#36d6c3'; cx.fillText('● 平复后', W - 110, 26);
  }
  $('#clearData').addEventListener('click', () => {
    if (confirm('确定清空本机全部情绪记录？此操作不可恢复。')) { Store.clear(); renderTrends(); renderHome(); }
  });

  /* =================================================================
   * 15) 分享卡（Canvas 生成，不含隐私内容）
   * ================================================================= */
  function drawShareCard() {
    const cv = $('#shareCanvas'); const cx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const grad = cx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1f3d'); grad.addColorStop(1, '#06070f');
    cx.fillStyle = grad; cx.fillRect(0, 0, W, H);
    cx.textAlign = 'center';
    cx.fillStyle = '#fff'; cx.font = '800 64px sans-serif';
    cx.fillText('Bad', W / 2 - 70, 120);
    cx.fillStyle = '#ff7a4d'; cx.fillText('To', W / 2 + 15, 120);
    cx.fillStyle = '#fff'; cx.fillText('Go', W / 2 + 90, 120);
    cx.font = '28px sans-serif'; cx.fillStyle = '#9aa0c0';
    cx.fillText('坏情绪，打包带走', W / 2, 170);

    cx.font = '120px sans-serif'; cx.fillText(session.emotionEmoji || '🌫️', W / 2, 330);
    cx.font = '34px sans-serif'; cx.fillStyle = '#eef1ff';
    cx.fillText(`今天我清空了一点「${session.emotion || '坏情绪'}」`, W / 2, 400);

    // 分数对比
    const drop = session.before - session.after;
    cx.font = '800 90px sans-serif';
    cx.fillStyle = '#ff5a4d'; cx.fillText(session.before, W / 2 - 140, 540);
    cx.fillStyle = '#9aa0c0'; cx.font = '50px sans-serif'; cx.fillText('→', W / 2, 535);
    cx.fillStyle = '#36d6c3'; cx.font = '800 90px sans-serif'; cx.fillText(session.after, W / 2 + 140, 540);
    cx.font = '26px sans-serif'; cx.fillStyle = '#9aa0c0';
    cx.fillText('发泄前', W / 2 - 140, 580); cx.fillText('平复后', W / 2 + 140, 580);

    cx.fillStyle = drop > 0 ? '#36d6c3' : '#9aa0c0'; cx.font = '700 40px sans-serif';
    cx.fillText(drop > 0 ? `情绪 ↓ ${drop} 分` : '已经发泄过了', W / 2, 660);

    cx.strokeStyle = 'rgba(255,255,255,.15)'; cx.beginPath(); cx.moveTo(80, 710); cx.lineTo(W - 80, 710); cx.stroke();
    cx.font = '22px sans-serif'; cx.fillStyle = '#6f79b8';
    cx.fillText('先发泄 · 后平复 · 看见自己变好', W / 2, 755);
  }
  $('#downloadShare').addEventListener('click', () => {
    const cv = $('#shareCanvas');
    const a = document.createElement('a');
    a.download = 'badtogo-share.png'; a.href = cv.toDataURL('image/png'); a.click();
  });

  /* =================================================================
   * 16) 启动
   * ================================================================= */
  // 任意触摸都解锁/恢复音频（移动端 AudioContext 易被系统挂起，需反复 resume）
  ['pointerdown', 'touchstart'].forEach(ev =>
    document.addEventListener(ev, () => Audio.unlock(), { passive: true }));
  renderHome();

  // 注册 Service Worker（离线可用 + 可安装）。仅在安全上下文(https/localhost)生效。
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }

  // 暴露给调试/自检
  window.BadToGo = { Store, go, session };
})();
