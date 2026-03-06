import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type L from 'leaflet';
import { ScrollWheelZoomControl } from './ScrollWheelZoomControl';

const enableScrollWheelZoomMock = vi.fn();
const disableScrollWheelZoomMock = vi.fn();
const enableDraggingMock = vi.fn();
const disableDraggingMock = vi.fn();
const enableTouchZoomMock = vi.fn();
const disableTouchZoomMock = vi.fn();

const mapMock = {
  scrollWheelZoom: {
    enable: enableScrollWheelZoomMock,
    disable: disableScrollWheelZoomMock,
  },
  dragging: {
    enable: enableDraggingMock,
    disable: disableDraggingMock,
  },
  touchZoom: {
    enable: enableTouchZoomMock,
    disable: disableTouchZoomMock,
  },
} as unknown as L.Map & { _scrollWheelZoomPersistent?: boolean };

vi.mock('react-leaflet', () => ({
  useMap: () => mapMock,
}));

vi.mock('leaflet', () => {
  class MockControl {
    onAdd?: () => HTMLElement;
    container: HTMLElement | null = null;

    constructor(_options?: unknown) {}

    addTo(_map: unknown) {
      this.container = this.onAdd?.() ?? null;
      this.container?.setAttribute('data-testid', 'mock-leaflet-control');
      if (this.container) {
        document.body.appendChild(this.container);
      }
      return this;
    }

    remove() {
      this.container?.remove();
      this.container = null;
    }
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
    document.body.innerHTML = '';
    mapMock._scrollWheelZoomPersistent = false;
    enableScrollWheelZoomMock.mockReset();
    disableScrollWheelZoomMock.mockReset();
    enableDraggingMock.mockReset();
    disableDraggingMock.mockReset();
    enableTouchZoomMock.mockReset();
    disableTouchZoomMock.mockReset();
  });

  it('disables temporary scroll zoom again after releasing Control', () => {
    render(<ScrollWheelZoomControl />);

    expect(disableScrollWheelZoomMock).toHaveBeenCalled();

    enableScrollWheelZoomMock.mockClear();
    disableScrollWheelZoomMock.mockClear();
    enableDraggingMock.mockClear();
    disableDraggingMock.mockClear();

    fireEvent.keyDown(window, { key: 'Control' });
    expect(enableScrollWheelZoomMock).toHaveBeenCalledTimes(1);
    expect(disableDraggingMock).not.toHaveBeenCalled();

    fireEvent.keyUp(window, { key: 'Control' });
    expect(disableScrollWheelZoomMock).toHaveBeenCalledTimes(1);
    expect(disableDraggingMock).not.toHaveBeenCalled();
  });

  it('locks one-finger mobile dragging until the interaction toggle is enabled', () => {
    render(
      <ScrollWheelZoomControl
        isMobile={true}
        mobilePanMode="pinch-zoom-until-unlocked"
      />
    );

    expect(disableDraggingMock).toHaveBeenCalledTimes(1);
    expect(enableTouchZoomMock).toHaveBeenCalledTimes(1);

    const toggleButton = screen.getByRole('button', {
      name: 'Toggle map interaction',
    });
    expect(toggleButton).toHaveAttribute('title', 'Map interaction: Off');

    enableDraggingMock.mockClear();
    disableDraggingMock.mockClear();

    fireEvent.click(toggleButton);
    expect(enableDraggingMock).toHaveBeenCalledTimes(1);
    expect(toggleButton).toHaveAttribute('title', 'Map interaction: On');

    enableDraggingMock.mockClear();
    disableDraggingMock.mockClear();

    fireEvent.click(toggleButton);
    expect(disableDraggingMock).toHaveBeenCalledTimes(1);
    expect(toggleButton).toHaveAttribute('title', 'Map interaction: Off');
  });
});
