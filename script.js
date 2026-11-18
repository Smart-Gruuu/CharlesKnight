(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* ---------- Theme ---------- */
  document.getElementById('theme').addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#fafafa' : '#09090b');
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  /* ---------- Nav state ---------- */
  var nav = document.querySelector('.nav');
  function onScroll() { nav.classList.toggle('scrolled', window.scrollY > 8); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var links = document.querySelectorAll('.nav nav a');
  if (hasIO) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['work', 'clients', 'experience', 'stack', 'contact', 'top'].forEach(function (id) {
      var s = document.getElementById(id); if (s) spy.observe(s);
    });
  }

  /* ---------- Reveal ---------- */
  var items = document.querySelectorAll('.reveal');
  if (hasIO && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var siblings = Array.prototype.filter.call(el.parentNode.children, function (c) { return c.classList.contains('reveal'); });
        el.style.transitionDelay = Math.min(siblings.indexOf(el), 5) * 70 + 'ms';
        el.classList.add('in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---------- Count-up stats ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function runCount(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (reduced) { el.textContent = target.toFixed(dec); return; }
    var start = null, dur = 1600;
    function step(t) {
      if (!start) start = t;
      var p = Math.min((t - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 4);
      el.textContent = (target * eased).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (hasIO) {
    var co = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { el.textContent = '0'; co.observe(el); });
  }

  /* ---------- Spotlight hover ---------- */
  document.querySelectorAll('.spot').forEach(function (el) {
    el.addEventListener('pointermove', function (ev) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (ev.clientX - r.left) + 'px');
      el.style.setProperty('--my', (ev.clientY - r.top) + 'px');
    });
  });

  /* ---------- Copy email ---------- */
  var copy = document.getElementById('copy');
  if (copy) copy.addEventListener('click', function () {
    var text = copy.getAttribute('data-copy');
    var done = function () {
      copy.textContent = 'Copied ✓';
      setTimeout(function () { copy.textContent = 'Copy email'; }, 1800);
    };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () {});
  });

  /* ---------- MCP session demo ---------- */
  var term = document.getElementById('term');
  var callsEl = document.getElementById('calls');
  if (!term) return;

  var sessions = [
    {
      prompt: 'Find leads added this week and post a summary to #sales',
      calls: [['hubspot.find_contacts', 142], ['openai.summarize', 811], ['slack.send_channel_message', 96]],
      reply: 'Posted a summary of 18 new leads to #sales.'
    },
    {
      prompt: 'Why did the invoice sync fail last night?',
      calls: [['zapier.get_run_history', 64], ['logs.search', 230], ['claude.diagnose', 1204]],
      reply: 'Expired QuickBooks token on step 3. Reconnect suggested.'
    },
    {
      prompt: 'Add everyone from today\'s demo call to the onboarding sheet',
      calls: [['gcal.find_event', 88], ['zoom.list_participants', 175], ['sheets.create_rows', 140]],
      reply: 'Added 6 attendees to Onboarding · Nov.'
    }
  ];

  var total = 0;
  function fmt(n) { return n.toLocaleString('en-US'); }
  callsEl.textContent = fmt(total);

  function line(html, cls) {
    var d = document.createElement('div');
    d.className = 't-line' + (cls ? ' ' + cls : '');
    d.innerHTML = html;
    term.appendChild(d);
    while (term.scrollHeight > term.clientHeight && term.children.length > 1) term.removeChild(term.firstChild);
    return d;
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function type(el, text, speed) {
    return new Promise(function (resolve) {
      var i = 0, caret = '<span class="caret"></span>';
      (function tick() {
        el.innerHTML = esc(text.slice(0, i)) + caret;
        if (i++ < text.length) setTimeout(tick, speed + Math.random() * 25);
        else { el.innerHTML = esc(text); resolve(); }
      })();
    });
  }

  function staticRender() {
    var s = sessions[0];
    line('<span class="t-user">user</span><span class="t-text">' + esc(s.prompt) + '</span>');
    s.calls.forEach(function (c) { line('<span class="t-ok">✓</span><span class="t-fn">' + c[0] + '</span><span class="t-dim">' + c[1] + 'ms</span>'); });
    line('<span class="t-agent">agent</span><span class="t-text">' + esc(s.reply) + '</span>');
  }

  if (reduced) { staticRender(); return; }

  var visible = true;
  if (hasIO) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(term);

  async function play() {
    var idx = 0;
    while (true) {
      while (!visible || document.hidden) await wait(400);
      var s = sessions[idx % sessions.length];
      var u = line('<span class="t-user">user</span><span class="t-text"></span>', idx ? 't-gap' : '');
      await type(u.querySelector('.t-text'), s.prompt, 28);
      await wait(450);
      for (var i = 0; i < s.calls.length; i++) {
        var c = s.calls[i];
        var l = line('<span class="t-run">◐</span><span class="t-fn">' + c[0] + '</span><span class="t-dim">running</span>');
        await wait(Math.min(c[1], 900) + 250);
        l.innerHTML = '<span class="t-ok">✓</span><span class="t-fn">' + c[0] + '</span><span class="t-dim">' + c[1] + 'ms</span>';
        total += 1;
        callsEl.textContent = fmt(total);
      }
      await wait(300);
      var a = line('<span class="t-agent">agent</span><span class="t-text"></span>');
      await type(a.querySelector('.t-text'), s.reply, 16);
      await wait(2600);
      idx++;
    }
  }
  play();
})();
