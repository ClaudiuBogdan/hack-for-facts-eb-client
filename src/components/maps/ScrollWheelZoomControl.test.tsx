import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type L from 'leaflet';
import { ScrollWheelZoomControl } from './ScrollWheelZoomControl';

const enableScrollWheelZoomMock = vi.fn();
const disableScrollWheelZoomMock = vi.fn();

const mapMock = {
  scrollWheelZoom: {
    enable: enableScrollWheelZoomMock,
    disable: disableScrollWheelZoomMock,
  },
} as unknown as L.Map & { _scrollWheelZoomPersistent?: boolean };

vi.mock('react-leaflet', () => ({
  useMap: () => mapMock,
}));

vi.mock('leaflet', () => {
  class MockControl {
    onAdd?: () => HTMLElement;

    constructor(_options?: unknown) {}

    addTo(_map: unknown) {
      this.onAdd?.();
      return this;
    }

    remove() {}
  }

  return {
    default: {
      Control: MockControl,
      DomUtil: {
        create: (tagName: string, className: string, container?: HTMLElement) => {
          const element = document.createElement(tagName);
          element.className = className;
          container?.appendChild(element);
          return element;
        },
      },
      DomEvent: {
        disableClickPropagation: vi.fn(),
      },
    },
  };
});

describe('ScrollWheelZoomControl', () => {
  beforeEach(() => {
    mapMock._scrollWheelZoomPersistent = false;
    enableScrollWheelZoomMock.mockReset();
    disableScrollWheelZoomMock.mockReset();
  });

  it('disables temporary scroll zoom again after releasing Control', () => {
    render(<ScrollWheelZoomControl />);

    expect(disableScrollWheelZoomMock).toHaveBeenCalled();

    enableScrollWheelZoomMock.mockClear();
    disableScrollWheelZoomMock.mockClear();

    fireEvent.keyDown(window, { key: 'Control' });
    expect(enableScrollWheelZoomMock).toHaveBeenCalledTimes(1);

    fireEvent.keyUp(window, { key: 'Control' });
    expect(disableScrollWheelZoomMock).toHaveBeenCalledTimes(1);
  });
});
