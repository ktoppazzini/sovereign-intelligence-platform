'use client';

import { useEffect } from 'react';

/**
 * Debug + force-unlock the nav if a style/overlay blocks it.
 * Logs with prefix: [NAV-GUARD]
 */
export default function NavGuardClient() {
  useEffect(() => {
    const root = document.getElementById('nav-root');
    if (!root) return;

    const log = (...a) => console.log('[NAV-GUARD]', ...a);

    // 1) Fix pointer-events on root & anchors
    root.style.pointerEvents = 'auto';
    root.style.zIndex = String(Math.max(50, Number(root.style.zIndex) || 0));

    const anchors = root.querySelectorAll('a');
    anchors.forEach((a) => {
      a.style.pointerEvents = 'auto';
      a.tabIndex = 0;
      a.setAttribute('aria-disabled', 'false');
    });

    // 2) Detect if something overlays the nav (elementFromPoint test)
    const rect = root.getBoundingClientRect();
    const probePoints = [
      { x: rect.left + 10, y: rect.top + rect.height / 2 },
      { x: rect.left + rect.width / 2, y: rect.top + 10 },
      { x: rect.right - 10, y: rect.top + rect.height / 2 },
    ];

    let overlayDetected = false;
    for (const p of probePoints) {
      const el = document.elementFromPoint(p.x, p.y);
      if (el && !root.contains(el)) {
        overlayDetected = true;
        log('Overlay element on nav:', el);
      }
    }

    if (overlayDetected) {
      // Lift the nav above most things
      root.style.position = 'relative';
      root.style.zIndex = '9999';
      log('Raised nav z-index to 9999');
    }

    // 3) Walk ancestors to clear pointer-events:none
    let parent = root.parentElement;
    while (parent) {
      const pe = getComputedStyle(parent).pointerEvents;
      if (pe === 'none') {
        log('Found ancestor with pointer-events:none → overriding', parent);
        parent.style.pointerEvents = 'auto';
      }
      parent = parent.parentElement;
    }

    // 4) Capture clicks to prove they’re getting through
    const onClickCapture = (e) => {
      const t = e.target;
      log('click capture ->', t?.tagName, t?.className || '');
    };
    root.addEventListener('click', onClickCapture, true);

    return () => root.removeEventListener('click', onClickCapture, true);
  }, []);

  return null;
}
