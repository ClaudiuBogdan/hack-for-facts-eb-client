import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

/**
 * ScrollWheelZoomControl
 * - Adds a Leaflet control next to the zoom controls to toggle persistent scroll zoom
 * - Uses Cmd/Ctrl hotkeys to temporarily enable scroll zoom while pressed
 */
export function ScrollWheelZoomControl(): ReactElement | null {
  const map = useMap() as L.Map & { _scrollWheelZoomPersistent?: boolean };
  const [enabled, setEnabled] = useState<boolean>(() => map._scrollWheelZoomPersistent === true);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const pressedModifiersRef = useRef({
    meta: false,
    ctrl: false,
  });

  // Ensure scroll is disabled by default unless persistent
  useEffect(() => {
    if (!map._scrollWheelZoomPersistent) {
      map.scrollWheelZoom.disable();
    }
  }, [map]);

  // Keep modifier-driven zoom deterministic. The previous hotkey-based
  // implementation could leave wheel zoom enabled when the release path
  // did not fire as expected.
  useEffect(() => {
    const syncTemporaryZoomState = () => {
      if (map._scrollWheelZoomPersistent) {
        return;
      }

      if (pressedModifiersRef.current.meta || pressedModifiersRef.current.ctrl) {
        map.scrollWheelZoom.enable();
        return;
      }

      map.scrollWheelZoom.disable();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        pressedModifiersRef.current.meta = true;
      }

      if (event.key === 'Control') {
        pressedModifiersRef.current.ctrl = true;
      }

      syncTemporaryZoomState();
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Meta') {
        pressedModifiersRef.current.meta = false;
      }

      if (event.key === 'Control') {
        pressedModifiersRef.current.ctrl = false;
      }

      syncTemporaryZoomState();
    };

    const handleWindowBlur = () => {
      pressedModifiersRef.current.meta = false;
      pressedModifiersRef.current.ctrl = false;
      syncTemporaryZoomState();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        handleWindowBlur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [map]);

  // Persist toggle state to map and update button visual state
  useEffect(() => {
    map._scrollWheelZoomPersistent = enabled;
    if (enabled) {
      map.scrollWheelZoom.enable();
    } else {
      pressedModifiersRef.current.meta = false;
      pressedModifiersRef.current.ctrl = false;
      map.scrollWheelZoom.disable();
    }

    const link = linkRef.current;
    if (link) {
      link.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      link.title = `Scroll zoom: ${enabled ? 'On' : 'Off'}`;
      link.style.opacity = enabled ? '1' : '0.6';
    }
  }, [enabled, map]);

  // Create Leaflet control (once)
  useEffect(() => {
    const control = new L.Control({ position: 'topleft' });
    control.onAdd = () => {
      const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      const link = L.DomUtil.create('a', 'leaflet-control-scroll-toggle', container) as HTMLAnchorElement;
      linkRef.current = link;
      link.href = '#';
      link.role = 'button';
      link.setAttribute('aria-label', 'Toggle scroll zoom');
      link.setAttribute('aria-pressed', enabled ? 'true' : 'false');
      link.title = `Scroll zoom: ${enabled ? 'On' : 'Off'}`;
      // Match Leaflet zoom button sizing
      link.style.width = '30px';
      link.style.height = '26px';
      link.style.lineHeight = '26px';
      link.style.textAlign = 'center';
      link.style.display = 'flex';
      link.style.alignItems = 'center';
      link.style.justifyContent = 'center';
      link.style.opacity = enabled ? '1' : '0.6';
      // Inline SVG mouse icon
      link.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="7" y="2" width="10" height="20" rx="5" stroke="currentColor" stroke-width="2" />
          <line x1="12" y1="6.5" x2="12" y2="10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
      `;

      // Avoid map drag on toggle interactions
      L.DomEvent.disableClickPropagation(container);
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        setEnabled((prev) => !prev);
      });
      return container;
    };
    control.addTo(map);
    return () => {
      control.remove();
    };
    // We intentionally do not re-create the control on `enabled` changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  return null;
}
