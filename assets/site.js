// Tab switching for the one-page site. The header (title, description and
// tabs) stays put; only the panel underneath changes. The URL hash
// (#overview, #guide, #hiscores) records the tab, so a link can open a
// specific one. Without JavaScript every panel is simply shown in a stack.

(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  var ids = tabs.map(function (t) { return t.getAttribute('data-tab'); });

  function show(id) {
    if (ids.indexOf(id) === -1) id = ids[0];
    tabs.forEach(function (t) {
      var on = t.getAttribute('data-tab') === id;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute('data-panel') !== id;
    });
  }

  function fromHash() {
    return (location.hash || '').replace('#', '');
  }

  // Tab links and in-page links that carry data-tab ("Read the Guide", ...).
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('[data-tab]') : null;
    if (link) {
      e.preventDefault();
      var id = link.getAttribute('data-tab');
      if (history.pushState) history.pushState(null, '', '#' + id);
      show(id);
      return;
    }
    var jump = e.target.closest ? e.target.closest('[data-scroll]') : null;
    if (jump) {
      var target = document.getElementById(jump.getAttribute('data-scroll'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  // Arrow keys move between tabs, as people expect from a tab strip.
  document.querySelector('[role="tablist"]').addEventListener('keydown', function (e) {
    var i = ids.indexOf(fromHash() || ids[0]);
    if (e.key === 'ArrowRight') i = (i + 1) % ids.length;
    else if (e.key === 'ArrowLeft') i = (i + ids.length - 1) % ids.length;
    else return;
    e.preventDefault();
    if (history.pushState) history.pushState(null, '', '#' + ids[i]);
    show(ids[i]);
    tabs[i].focus();
  });

  window.addEventListener('popstate', function () { show(fromHash()); });
  window.addEventListener('hashchange', function () { show(fromHash()); });
  show(fromHash());
})();
