import { describe, expect, it } from 'vitest';

import {
  readMapEditorViewportRestore,
  writeMapEditorViewportRestore,
} from './map-editor-viewport-restore';

describe('map editor viewport restore', () => {
  it('stores rounded runtime viewport outside the map draft', () => {
    const mapId = `map-${crypto.randomUUID()}`;

    writeMapEditorViewportRestore(mapId, {
      mapCenter: [46.123456, 24.987654],
      mapZoom: 7.26,
    });

    expect(readMapEditorViewportRestore(mapId)).toEqual({
      mapCenter: [46.12346, 24.98765],
      mapZoom: 7.3,
    });
  });

  it('returns an empty restore viewport when nothing was stored', () => {
    expect(readMapEditorViewportRestore(`missing-${crypto.randomUUID()}`)).toEqual({});
  });
});
