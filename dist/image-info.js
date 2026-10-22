/* Small, accessible context disclosure; no animation, persistence or service. */
(() => {
  'use strict';
  const controls = [];
  for (const group of document.querySelectorAll('[data-image-info]')) {
    const button = group.querySelector('button'), note = group.querySelector('[data-image-note]');
    let pinned = false, dismissed = false;
    const show = () => { note.hidden = false; button.setAttribute('aria-expanded', 'true'); };
    const hide = () => { note.hidden = true; button.setAttribute('aria-expanded', 'false'); };
    const close = () => { pinned = false; dismissed = true; hide(); };
    controls.push({group, close});
    group.addEventListener('mouseenter', () => { if (!dismissed) show(); });
    group.addEventListener('mouseleave', () => {
      dismissed = false;
      if (!pinned && !group.contains(document.activeElement)) hide();
    });
    group.addEventListener('focusin', () => { dismissed = false; show(); });
    group.addEventListener('focusout', event => {
      if (!group.contains(event.relatedTarget)) { pinned = false; dismissed = false; hide(); }
    });
    button.addEventListener('click', () => {
      if (pinned) close();
      else { for (const c of controls) if (c.group !== group) c.close(); pinned = true; dismissed = false; show(); }
    });
    button.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
    });
  }
  document.addEventListener('pointerdown', event => {
    for (const c of controls) if (!c.group.contains(event.target)) c.close();
  });
  for (const name of ['hashchange', 'popstate']) window.addEventListener(name, () => { for (const c of controls) c.close(); });
})();
