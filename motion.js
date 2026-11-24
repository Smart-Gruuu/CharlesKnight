/* Motion layer: hero network, word reveals, tilt, magnetic buttons, scroll effects. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Split headings into words ---------- */
  function split(el) {
    var i = 0;
    var nodes = Array.prototype.slice.call(el.childNodes);
    el.textContent = '';
    function wrap(content) {
      var w = document.createElement('span'); w.className = 'w';
      var wi = document.createElement('span'); wi.className = 'wi';
      wi.style.setProperty('--i', i++);
      wi.appendChild(content); w.appendChild(wi);
      return w;
    }
    nodes.forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) el.appendChild(document.createTextNode(' '));
          else el.appendChild(wrap(document.createTextNode(part)));
        });
      } else if (n.nodeName === 'BR') {
        el.appendChild(n);
      } else {
        el.appendChild(wrap(n));
      }
    });
  }
  if (!reduced) document.querySelectorAll('[data-split]').forEach(split);

  /* Stagger index for career bullets */
  document.querySelectorAll('.role-body li').forEach(function (li, idx, all) {
    li.style.setProperty('--n', Array.prototype.indexOf.call(li.parentNode.children, li));
  });

  /* ---------- Scroll progress + hide-on-scroll nav ---------- */
  var bar = document.querySelector('.progress');
  var nav = document.querySelector('.nav');
  var lastY = window.scrollY, ticking = false;
  function onScroll() {
    var y = window.scrollY;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.setProperty('--p', max > 0 ? Math.min(y / max, 1) : 0);
    if (nav && !nav.contains(document.activeElement)) {
      if (y > 480 && y > lastY + 4) nav.classList.add('hide');
      else if (y < lastY - 4 || y < 480) nav.classList.remove('hide');
    }
    lastY = y; ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (reduced) return;

  /* ---------- Cursor glow ---------- */
  if (finePointer) {
    var glow = document.querySelector('.cursor-glow');
    var gx = -999, gy = -999, tx = -999, ty = -999, glowRunning = false;
    function glowLoop() {
      gx += (tx - gx) * 0.12; gy += (ty - gy) * 0.12;
      glow.style.setProperty('--cx', gx + 'px'); glow.style.setProperty('--cy', gy + 'px');
      if (Math.abs(tx - gx) > 0.5 || Math.abs(ty - gy) > 0.5) requestAnimationFrame(glowLoop);
      else glowRunning = false;
    }
    window.addEventListener('pointermove', function (e) {
      tx = e.clientX; ty = e.clientY;
      if (gx === -999) { gx = tx; gy = ty; }
      root.classList.add('cursor-on');
      if (!glowRunning) { glowRunning = true; requestAnimationFrame(glowLoop); }
    }, { passive: true });
    document.addEventListener('pointerleave', function () { root.classList.remove('cursor-on'); });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer) {
    document.querySelectorAll('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
        b.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.35 + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; });
    });
  }

  /* ---------- Terminal tilt ---------- */
  var terminal = document.getElementById('terminal');
  var hero = document.querySelector('.hero');
  if (terminal && hero && finePointer) {
    hero.addEventListener('pointermove', function (e) {
      if (window.innerWidth < 900) return;
      var r = terminal.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      var dy = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      dx = Math.max(-1, Math.min(1, dx)); dy = Math.max(-1, Math.min(1, dy));
      terminal.classList.add('tilting');
      terminal.style.setProperty('--ry', (dx * 7).toFixed(2) + 'deg');
      terminal.style.setProperty('--rx', (-dy * 5).toFixed(2) + 'deg');
      terminal.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      terminal.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
    hero.addEventListener('pointerleave', function () {
      terminal.classList.remove('tilting');
      terminal.style.setProperty('--rx', '0deg'); terminal.style.setProperty('--ry', '0deg');
    });
  }

  /* ---------- Monitoring flow: signal steps down the diagram ---------- */
  var flow = document.querySelector('.flow');
  if (flow && hasIO) {
    var steps = flow.querySelectorAll('li'), step = -1, flowTimer = null;
    function tick() {
      step = (step + 1) % (steps.length + 2);
      steps.forEach(function (li, k) { li.classList.toggle('lit', k === step); });
    }
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) { if (!flowTimer) flowTimer = setInterval(tick, 750); }
      else { clearInterval(flowTimer); flowTimer = null; }
    }).observe(flow);
  }

  /* ---------- Hero network: agents passing signals between apps ---------- */
  var canvas = document.getElementById('net');
  if (!canvas || !hero || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0, dpr = 1, nodes = [], pulses = [], LINK = 140;
  var mouse = { x: -1e4, y: -1e4 };
  var colors = {};
  var visible = true, raf = 0, lastSpawn = 0;

  function readColors() {
    var cs = getComputedStyle(root);
    colors.accent = cs.getPropertyValue('--accent').trim() || '#ff6a3d';
    colors.accent2 = cs.getPropertyValue('--accent-2').trim() || '#c084fc';
    colors.base = root.getAttribute('data-theme') === 'light' ? '#09090b' : '#ffffff';
    colors.lineAlpha = root.getAttribute('data-theme') === 'light' ? 0.14 : 0.22;
  }
  readColors();
  new MutationObserver(readColors).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  function resize() {
    var w = hero.clientWidth, h = hero.clientHeight;
    if (w === W && h === H) return;
    W = w; H = h; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.max(24, Math.min(90, Math.floor(W * H / 15000)));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.4 + 0.8, flash: 0
      });
    }
    pulses = [];
  }

  function spawnPulse() {
    var a = nodes[Math.floor(Math.random() * nodes.length)];
    var best = null, bd = LINK;
    for (var i = 0; i < nodes.length; i++) {
      var b = nodes[i]; if (b === a) continue;
      var d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < bd && Math.random() > 0.3) { bd = d; best = b; }
    }
    if (best) pulses.push({ a: a, b: best, t: 0, hops: 2 + Math.floor(Math.random() * 3), c: Math.random() > 0.5 ? colors.accent : colors.accent2 });
  }

  function frame(now) {
    raf = 0;
    if (!visible || document.hidden) return;
    ctx.clearRect(0, 0, W, H);

    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      var mdx = n.x - mouse.x, mdy = n.y - mouse.y, md = Math.hypot(mdx, mdy);
      if (md < 120 && md > 0.1) { n.vx += mdx / md * 0.04; n.vy += mdy / md * 0.04; }
      n.vx *= 0.99; n.vy *= 0.99;
      var sp = Math.hypot(n.vx, n.vy);
      if (sp < 0.08) { n.vx += (Math.random() - 0.5) * 0.04; n.vy += (Math.random() - 0.5) * 0.04; }
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
      n.flash = Math.max(0, n.flash - 0.02);
    }

    ctx.lineWidth = 1;
    ctx.strokeStyle = colors.base;
    for (var p = 0; p < nodes.length; p++) {
      for (var q = p + 1; q < nodes.length; q++) {
        var A = nodes[p], B = nodes[q];
        var d = Math.hypot(A.x - B.x, A.y - B.y);
        if (d < LINK) {
          ctx.globalAlpha = (1 - d / LINK) * colors.lineAlpha;
          ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
        }
      }
      var m = Math.hypot(nodes[p].x - mouse.x, nodes[p].y - mouse.y);
      if (m < 180) {
        ctx.globalAlpha = (1 - m / 180) * 0.5;
        ctx.strokeStyle = colors.accent;
        ctx.beginPath(); ctx.moveTo(nodes[p].x, nodes[p].y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        ctx.strokeStyle = colors.base;
      }
    }

    if (now - lastSpawn > 420 && pulses.length < 10) { spawnPulse(); lastSpawn = now; }
    for (var k = pulses.length - 1; k >= 0; k--) {
      var s = pulses[k];
      s.t += 0.022;
      var x = s.a.x + (s.b.x - s.a.x) * s.t, y = s.a.y + (s.b.y - s.a.y) * s.t;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = s.c;
      ctx.beginPath(); ctx.moveTo(s.a.x, s.a.y); ctx.lineTo(x, y); ctx.globalAlpha = 0.35; ctx.stroke();
      ctx.globalAlpha = 1; ctx.fillStyle = s.c;
      ctx.shadowColor = s.c; ctx.shadowBlur = 12;
      ctx.beginPath(); ctx.arc(x, y, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      if (s.t >= 1) {
        s.b.flash = 1;
        if (--s.hops > 0) {
          var from = s.b, next = null, bd = LINK;
          for (var j = 0; j < nodes.length; j++) {
            var cand = nodes[j]; if (cand === from || cand === s.a) continue;
            var dd = Math.hypot(from.x - cand.x, from.y - cand.y);
            if (dd < bd && Math.random() > 0.4) { bd = dd; next = cand; }
          }
          if (next) { s.a = from; s.b = next; s.t = 0; continue; }
        }
        pulses.splice(k, 1);
      }
    }

    for (var z = 0; z < nodes.length; z++) {
      var nd = nodes[z];
      ctx.globalAlpha = 0.5 + nd.flash * 0.5;
      ctx.fillStyle = nd.flash > 0.05 ? colors.accent : colors.base;
      if (nd.flash > 0.05) { ctx.shadowColor = colors.accent; ctx.shadowBlur = 16 * nd.flash; }
      ctx.beginPath(); ctx.arc(nd.x, nd.y, nd.r + nd.flash * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  }
  function start() { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame); }

  resize();
  window.addEventListener('resize', function () { resize(); start(); });
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero.addEventListener('pointerleave', function () { mouse.x = mouse.y = -1e4; });
  document.addEventListener('visibilitychange', start);
  if (hasIO) new IntersectionObserver(function (en) { visible = en[0].isIntersecting; start(); }).observe(hero);
  start();
})();
