/**
 * PRD ↔ 原型 双向高亮联动
 *
 * 用法：
 *   1) 引入 shared.css（含 .is-highlight / li[data-target] / .is-bullet-active 样式）
 *   2) 在原型组件上加 data-comp="<key>"，在 PRD bullet (<li>) 上加 data-target="<key>"
 *   3) 多对一写法：data-target="key1,key2"（hover 该 bullet 高亮多个组件）
 *
 * Scope：每个 .proto-with-prd 是独立命名空间，跨 section 不传染。
 * 视觉键：outline + var(--primary) 描边（跟随当前主题）/ 外发光，与组件自身 :hover 的 background 完全分离。
 */
(function() {
  function init() {
    document.querySelectorAll('.proto-with-prd').forEach(function(scope) {
      function decorateCard(target, on) {
        var card = target.closest && target.closest('.channel-card');
        if (!card) return;
        card.classList[on ? 'add' : 'remove']('is-bullet-active');
      }

      /* 正向：bullet → component */
      scope.querySelectorAll('li[data-target]').forEach(function(bullet) {
        var keys = bullet.dataset.target.split(',').map(function(s) { return s.trim(); }).filter(Boolean);
        var targets = [];
        keys.forEach(function(k) {
          scope.querySelectorAll('[data-comp="' + k + '"]').forEach(function(el) { targets.push(el); });
        });
        if (!targets.length) return;
        bullet.addEventListener('mouseenter', function() {
          bullet.classList.add('is-highlight');
          targets.forEach(function(t) { t.classList.add('is-highlight'); decorateCard(t, true); });
        });
        bullet.addEventListener('mouseleave', function() {
          bullet.classList.remove('is-highlight');
          targets.forEach(function(t) { t.classList.remove('is-highlight'); decorateCard(t, false); });
        });
      });

      /* 反向：component → bullet（子组件 stopPropagation 避免被父组件遮盖） */
      scope.querySelectorAll('[data-comp]').forEach(function(comp) {
        var key = comp.dataset.comp;
        var matched = [];
        scope.querySelectorAll('li[data-target]').forEach(function(b) {
          if (b.dataset.target.split(',').map(function(s) { return s.trim(); }).indexOf(key) !== -1) matched.push(b);
        });
        if (!matched.length) return;
        comp.addEventListener('mouseenter', function(e) {
          e.stopPropagation();
          comp.classList.add('is-highlight');
          matched.forEach(function(b) { b.classList.add('is-highlight'); });
        });
        comp.addEventListener('mouseleave', function(e) {
          e.stopPropagation();
          comp.classList.remove('is-highlight');
          matched.forEach(function(b) { b.classList.remove('is-highlight'); });
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

/* ============================================================================
 * 顶部页面导航（v2）
 * ----------------------------------------------------------------------------
 * 取代左侧 .toc-sidebar：读取其 .toc-item 作为数据源，运行时构建
 *   ① 固定顶栏的页面标签（随滚动自动高亮当前页，可点击切换）
 *   ② 右侧抽屉的完整页面目录（点击切换并自动关闭）
 *
 * 为什么读 .toc-sidebar 而不是新标记：存量原型的 HTML 里已有它，
 * 这样重跑一次注入即可升级，无需逐个改 HTML。
 * ========================================================================== */
(function protoNav() {
  if (window.__protoNavReady) return;

  const boot = () => {
    const toc = document.querySelector('.toc-sidebar');
    if (!toc || document.querySelector('.proto-topbar')) return;

    const items = Array.from(toc.querySelectorAll('.toc-item'))
      .map((a) => {
        const href = a.getAttribute('href') || '';
        const target = href.startsWith('#') ? document.querySelector(href) : null;
        return target ? { label: a.textContent.trim(), target } : null;
      })
      .filter(Boolean);
    if (!items.length) return;

    const TOP_OFFSET = 64; // 与 shared.css 的 body padding-top 保持一致
    const svg = (d) =>
      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

    // ---- 顶栏 ----
    const bar = document.createElement('div');
    bar.className = 'proto-topbar';
    bar.innerHTML =
      `<div class="proto-topbar__brand">页面导航</div>` +
      `<button class="proto-nav-btn" data-nav="prev" aria-label="上一页">${svg('<path d="m15 18-6-6 6-6"/>')}</button>` +
      `<div class="proto-tabs" role="tablist"></div>` +
      `<button class="proto-nav-btn" data-nav="next" aria-label="下一页">${svg('<path d="m9 18 6-6-6-6"/>')}</button>` +
      `<button class="proto-nav-btn proto-nav-btn--menu" data-nav="menu">${svg('<path d="M4 6h16M4 12h16M4 18h16"/>')}<span>目录</span></button>`;
    document.body.insertBefore(bar, document.body.firstChild);

    const tabsWrap = bar.querySelector('.proto-tabs');
    const tabs = items.map((it, i) => {
      const t = document.createElement('button');
      t.className = 'proto-tab';
      t.innerHTML = `<span class="proto-tab__dot"></span>${it.label}`;
      t.addEventListener('click', () => go(i));
      tabsWrap.appendChild(t);
      return t;
    });

    // ---- 抽屉 ----
    const mask = document.createElement('div');
    mask.className = 'proto-drawer-mask';
    const drawer = document.createElement('aside');
    drawer.className = 'proto-drawer';
    drawer.innerHTML =
      `<div class="proto-drawer__head">全部页面（${items.length}）` +
      `<button class="proto-nav-btn" data-nav="close" aria-label="关闭">${svg('<path d="M18 6 6 18M6 6l12 12"/>')}</button></div>` +
      `<div class="proto-drawer__body"></div>`;
    document.body.appendChild(mask);
    document.body.appendChild(drawer);

    const drawerBody = drawer.querySelector('.proto-drawer__body');
    const drawerItems = items.map((it, i) => {
      const d = document.createElement('div');
      d.className = 'proto-drawer__item';
      d.innerHTML = `<span class="proto-drawer__idx">${i + 1}</span><span>${it.label}</span>`;
      d.addEventListener('click', () => { go(i); toggleDrawer(false); });
      drawerBody.appendChild(d);
      return d;
    });

    const toggleDrawer = (open) => {
      mask.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
    };
    bar.querySelector('[data-nav="menu"]').addEventListener('click', () => toggleDrawer(true));
    drawer.querySelector('[data-nav="close"]').addEventListener('click', () => toggleDrawer(false));
    mask.addEventListener('click', () => toggleDrawer(false));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleDrawer(false); });

    // ---- 切换 ----
    let current = 0;
    function go(i) {
      const it = items[i];
      if (!it) return;
      const y = it.target.getBoundingClientRect().top + window.scrollY - TOP_OFFSET + 1;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    bar.querySelector('[data-nav="prev"]').addEventListener('click', () => go(current - 1));
    bar.querySelector('[data-nav="next"]').addEventListener('click', () => go(current + 1));

    function setActive(i) {
      if (i === current) return;
      current = i;
      tabs.forEach((t, n) => t.classList.toggle('is-active', n === i));
      drawerItems.forEach((d, n) => d.classList.toggle('is-active', n === i));
      bar.querySelector('[data-nav="prev"]').disabled = i === 0;
      bar.querySelector('[data-nav="next"]').disabled = i === items.length - 1;
      // 当前标签滚入可视范围
      const t = tabs[i];
      if (t) {
        const l = t.offsetLeft, r = l + t.offsetWidth;
        if (l < tabsWrap.scrollLeft) tabsWrap.scrollLeft = l - 8;
        else if (r > tabsWrap.scrollLeft + tabsWrap.clientWidth) tabsWrap.scrollLeft = r - tabsWrap.clientWidth + 8;
      }
    }

    // ---- 滚动联动：取「已越过顶栏」的最后一个 section ----
    let ticking = false;
    const sync = () => {
      ticking = false;
      let idx = 0;
      for (let i = 0; i < items.length; i++) {
        if (items[i].target.getBoundingClientRect().top <= TOP_OFFSET + 8) idx = i;
        else break;
      }
      setActive(idx);
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(sync); }
    }, { passive: true });
    window.addEventListener('resize', sync, { passive: true });

    setActive(-1); // 强制首次刷新
    sync();
    window.__protoNavReady = true;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ============================================================================
 * 声明式交互运行时（v3）
 * ----------------------------------------------------------------------------
 * 让原型可点击走通核心流程，而不是一堆静态截图。
 * 原则：页面只写 data-* 属性，不写一行 JS —— 否则每个原型各写各的，很快就散。
 *
 * 用法速查：
 *   data-act="open"  data-for="ID"   点击 → 显示所有 [data-overlay="ID"]
 *   data-act="close"                 点击 → 关闭所在的 overlay（遮罩/Esc 亦可）
 *   data-act="submit" data-toast="…" 点击 → 关闭 overlay + 顶部提示
 *   data-act="check"                 点击 → 切换选中（加/去 .on）
 *   data-act="check" 在 [data-tree] 内  → 带父子级联与半选
 *   data-act="check-all" data-scope="SEL" → 表头全选，控制 SEL 内所有 check
 *   data-act="pick" data-group="G"   点击 → 组内单选（互斥加 .on）
 *   data-act="tab" data-group="G" data-panel="ID" → 切页签并显示对应 [data-panel-id]
 *
 * 层级：节点层级取 data-level，缺省从 .*-lv2 / .*-lv3 类名推断，再缺省为 1。
 * ========================================================================== */
(function protoInteract() {
  if (window.__protoInteractReady) return;

  const boot = () => {
    const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

    /* ---------- Toast ---------- */
    let toastBox;
    function toast(msg, kind = 'success') {
      if (!toastBox) {
        toastBox = document.createElement('div');
        toastBox.className = 'proto-toast-wrap';
        document.body.appendChild(toastBox);
      }
      const t = document.createElement('div');
      t.className = `proto-toast proto-toast--${kind}`;
      t.textContent = msg;
      toastBox.appendChild(t);
      requestAnimationFrame(() => t.classList.add('is-in'));
      setTimeout(() => {
        t.classList.remove('is-in');
        setTimeout(() => t.remove(), 240);
      }, 2000);
    }

    /* ---------- Overlay（弹窗 / 抽屉 / 遮罩） ---------- */
    const setOverlay = (id, open) => {
      $$(`[data-overlay="${id}"]`).forEach((el) => { el.hidden = !open; });
    };
    const closeFrom = (el) => {
      const host = el.closest('[data-overlay]');
      if (host) setOverlay(host.getAttribute('data-overlay'), false);
      else $$('[data-overlay]').forEach((o) => { o.hidden = true; });
    };

    /* ---------- 复选与树级联 ---------- */
    const isOn = (el) => el.classList.contains('on');
    const setState = (el, on, half = false) => {
      el.classList.toggle('on', on && !half);
      el.classList.toggle('is-indeterminate', half);
    };
    const levelOf = (node) => {
      const d = node.getAttribute('data-level');
      if (d) return +d;
      if (/-lv3\b/.test(node.className)) return 3;
      if (/-lv2\b/.test(node.className)) return 2;
      return 1;
    };
    const rowOf = (chk) => chk.closest('[data-level], [class*="-lv2"], [class*="-lv3"]') || chk.parentElement;

    function cascade(tree) {
      const rows = $$('[data-act="check"]', tree).map(rowOf);
      // 自顶向下：父变则子跟随（由点击处触发，见 handler）
      // 自底向上：重算每个父节点的态
      for (let i = rows.length - 1; i >= 0; i--) {
        const lv = levelOf(rows[i]);
        const kids = [];
        for (let j = i + 1; j < rows.length; j++) {
          const l = levelOf(rows[j]);
          if (l <= lv) break;
          if (l === lv + 1) kids.push(rows[j]);
        }
        if (!kids.length) continue;
        const chks = kids.map((k) => k.querySelector('[data-act="check"]'));
        const on = chks.filter(isOn).length;
        const half = chks.some((c) => c.classList.contains('is-indeterminate'));
        setState(rows[i].querySelector('[data-act="check"]'), on === chks.length && !half, half || (on > 0 && on < chks.length));
      }
    }

    function setSubtree(tree, row, on) {
      const rows = $$('[data-act="check"]', tree).map(rowOf);
      const i = rows.indexOf(row), lv = levelOf(row);
      for (let j = i + 1; j < rows.length; j++) {
        if (levelOf(rows[j]) <= lv) break;
        setState(rows[j].querySelector('[data-act="check"]'), on, false);
      }
    }

    /* ---------- 事件委托 ---------- */
    document.addEventListener('click', (e) => {
      // 链路跳转：data-goto="section-id" —— 点击后滚到对应 section
      const jump = e.target.closest('[data-goto]');
      if (jump) {
        const t = document.getElementById(jump.getAttribute('data-goto'));
        if (t) {
          window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 64 + 1, behavior: 'smooth' });
          return;
        }
      }
      const mask = e.target.closest('[data-overlay][data-mask]');
      if (mask) { setOverlay(mask.getAttribute('data-overlay'), false); return; }

      const el = e.target.closest('[data-act]');
      if (!el) return;
      const act = el.getAttribute('data-act');

      if (act === 'open') { setOverlay(el.getAttribute('data-for'), true); return; }
      if (act === 'close') { closeFrom(el); return; }
      if (act === 'submit') {
        closeFrom(el);
        const m = el.getAttribute('data-toast');
        if (m) toast(m, el.getAttribute('data-toast-kind') || 'success');
        return;
      }
      if (act === 'check') {
        const tree = el.closest('[data-tree]');
        const next = !isOn(el) || el.classList.contains('is-indeterminate');
        setState(el, next, false);
        if (tree) { setSubtree(tree, rowOf(el), next); cascade(tree); }
        return;
      }
      if (act === 'check-all') {
        const next = !isOn(el);
        setState(el, next, false);
        const scope = el.getAttribute('data-scope');
        $$(`${scope} [data-act="check"]`).forEach((c) => setState(c, next, false));
        return;
      }
      if (act === 'pick') {
        const g = el.getAttribute('data-group');
        $$(`[data-act="pick"][data-group="${g}"]`).forEach((o) => o.classList.toggle('on', o === el));
        return;
      }
      if (act === 'tab') {
        const g = el.getAttribute('data-group');
        $$(`[data-act="tab"][data-group="${g}"]`).forEach((o) => o.classList.toggle('on', o === el));
        const pid = el.getAttribute('data-panel');
        if (pid) $$(`[data-panel-group="${g}"]`).forEach((p) => { p.hidden = p.getAttribute('data-panel-id') !== pid; });
        return;
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') $$('[data-overlay]').forEach((o) => { o.hidden = true; });
    });

    $$('[data-tree]').forEach(cascade);   // 初始态按已勾选项算一遍半选
    window.__protoInteractReady = true;
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
