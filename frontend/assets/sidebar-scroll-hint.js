// Sidebar scroll hint
// The sidebar menu (.side__nav) scrolls with its scrollbar hidden, so items below the fold
// (Team, Playbooks, Settings, Support on shorter screens) looked missing. This adds:
//   - a "N more" pill at the bottom of the menu while items are hidden below (click to scroll)
//   - a stronger fade at the top/bottom edge only while there is more to scroll
//   - a slim scrollbar while hovering the menu
//   - keeps the active page's menu item scrolled into view
// It only sets data-* attributes and appends one element, so React-owned classes are untouched.
(function () {
  if (typeof window === 'undefined' || window.__sideScrollHint) return;
  window.__sideScrollHint = true;

  var css = [
    '.side__nav{scroll-padding-block:12px 44px}',
    '.side__nav[data-more-below]{-webkit-mask-image:linear-gradient(#0000 0,#000 10px calc(100% - 56px),#0000);mask-image:linear-gradient(#0000 0,#000 10px calc(100% - 56px),#0000)}',
    '.side__nav[data-more-above]{-webkit-mask-image:linear-gradient(#0000 0,#000 34px calc(100% - 18px),#0000);mask-image:linear-gradient(#0000 0,#000 34px calc(100% - 18px),#0000)}',
    '.side__nav[data-more-above][data-more-below]{-webkit-mask-image:linear-gradient(#0000 0,#000 34px calc(100% - 56px),#0000);mask-image:linear-gradient(#0000 0,#000 34px calc(100% - 56px),#0000)}',
    '.side__nav:hover{scrollbar-width:thin;scrollbar-color:color-mix(in srgb,var(--side-text) 28%,transparent) transparent}',
    '.side__nav:hover::-webkit-scrollbar{display:block;width:4px}',
    '.side__nav:hover::-webkit-scrollbar-thumb{background:color-mix(in srgb,var(--side-text) 28%,transparent);border-radius:4px}',
    '.side__more{position:absolute;left:50%;z-index:2;transform:translate(-50%,6px);opacity:0;pointer-events:none;',
    'display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 12px 0 10px;border-radius:999px;',
    'border:1px solid color-mix(in srgb,var(--side-text) 18%,transparent);',
    'background:color-mix(in srgb,var(--side) 82%,var(--side-text));color:var(--side-text);',
    'font:600 12px/1 inherit;letter-spacing:.01em;white-space:nowrap;cursor:pointer;',
    'box-shadow:0 8px 18px -10px #000a;transition:opacity .2s,transform .2s,background-color .2s}',
    '.side__more.is-on{opacity:1;transform:translate(-50%,0);pointer-events:auto}',
    '.side__more:hover{background:color-mix(in srgb,var(--side) 70%,var(--side-text))}',
    '.side__more:focus-visible{outline:2px solid var(--side-accent);outline-offset:2px}',
    '.side__more svg{width:14px;height:14px;flex:none;animation:sideMoreBob 1.6s ease-in-out infinite}',
    'html.rail-on .side__more{padding:0;width:32px;justify-content:center}',
    'html.rail-on .side__more .side__more-label{display:none}',
    '@keyframes sideMoreBob{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}',
    '@media (prefers-reduced-motion:reduce){.side__more,.side__more svg{transition:none;animation:none}}'
  ].join('');
  var style = document.createElement('style');
  style.id = 'side-scroll-hint-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // A short timer instead of requestAnimationFrame: rAF can stall in background or throttled
  // windows, and the hint must be ready as soon as the sidebar is shown.
  function nextFrame(fn) { return setTimeout(fn, 16); }

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wired = new WeakSet();

  function hiddenBelow(nav) {
    var limit = nav.getBoundingClientRect().bottom - 8;
    var n = 0;
    nav.querySelectorAll('a.nav__item').forEach(function (a) {
      if (a.offsetParent !== null && a.getBoundingClientRect().bottom > limit) n++;
    });
    return n;
  }

  function wire(nav) {
    if (wired.has(nav)) return;
    wired.add(nav);
    var side = nav.parentElement;

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'side__more';
    // Opt out of global-themed-controls.js auto-styling (it turns "Show …" buttons into table action icons)
    btn.dataset.tlAct = 'skip';
    btn.setAttribute('aria-label', 'Show more menu items');
    btn.innerHTML = '<span class="side__more-label"></span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
    btn.addEventListener('click', function () {
      nav.scrollBy({ top: Math.max(120, nav.clientHeight * 0.75), behavior: reduceMotion ? 'auto' : 'smooth' });
    });
    side.appendChild(btn);

    var raf = 0;
    function update() {
      raf = 0;
      if (!nav.isConnected) return;
      var above = nav.scrollTop > 4;
      var below = nav.scrollTop + nav.clientHeight < nav.scrollHeight - 4;
      if (above) nav.setAttribute('data-more-above', ''); else nav.removeAttribute('data-more-above');
      if (below) nav.setAttribute('data-more-below', ''); else nav.removeAttribute('data-more-below');
      var count = below ? hiddenBelow(nav) : 0;
      btn.classList.toggle('is-on', below && count > 0);
      btn.querySelector('.side__more-label').textContent = count === 1 ? '1 more' : count + ' more';
      btn.setAttribute('aria-label', 'Show ' + count + ' more menu item' + (count === 1 ? '' : 's'));
      btn.tabIndex = below && count > 0 ? 0 : -1;
      // Sit the pill just above the bottom edge of the menu
      var sr = side.getBoundingClientRect();
      var nr = nav.getBoundingClientRect();
      btn.style.top = Math.round(nr.bottom - sr.top - 38) + 'px';
    }
    function schedule() { if (!raf) raf = nextFrame(update); }

    function revealActive() {
      var active = nav.querySelector('a.nav__item.is-active');
      if (!active) return;
      var a = active.getBoundingClientRect();
      var n = nav.getBoundingClientRect();
      if (a.top < n.top + 8 || a.bottom > n.bottom - 40) {
        active.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
      }
      schedule();
    }

    nav.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(nav);
    // Menu items change with role, sub-menus open/close, and the active page changes on navigation
    new MutationObserver(function (muts) {
      var activeChanged = muts.some(function (m) {
        return m.type === 'attributes' && m.target.classList && m.target.classList.contains('is-active');
      });
      if (activeChanged) revealActive(); else schedule();
    }).observe(nav, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    revealActive();
    schedule();
    setTimeout(schedule, 400); // after the entrance animation settles
  }

  function scan() {
    document.querySelectorAll('.side__nav').forEach(wire);
  }
  // The sidebar mounts after sign-in and remounts after sign-out, so watch for it
  var scanQueued = false;
  new MutationObserver(function () {
    if (scanQueued) return;
    scanQueued = true;
    nextFrame(function () { scanQueued = false; scan(); });
  }).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan); else scan();
  document.addEventListener('visibilitychange', scan);
})();
