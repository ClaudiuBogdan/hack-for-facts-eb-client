import type { MapLayerMouseEvent } from 'maplibre-gl';

export interface InteractiveMapFeatureStyle {
  color?: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dashArray?: string | number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  interactive?: boolean;
}

export type LatLngLike =
  | readonly [number, number]
  | {
      readonly lat: number;
      readonly lng: number;
    }
  | {
      readonly lat: number;
      readonly lon: number;
    };

export type BoundsLike =
  | readonly [LatLngLike, LatLngLike]
  | {
      readonly getSouthWest?: () => LatLngLike;
      readonly getNorthEast?: () => LatLngLike;
      readonly southWest?: LatLngLike;
      readonly northEast?: LatLngLike;
    };

export interface InteractiveMapFeatureEvent {
  latlng: {
    lat: number;
    lng: number;
  };
  containerPoint: {
    x: number;
    y: number;
  };
  originalEvent: MouseEvent;
  target: unknown;
  maplibreEvent: MapLayerMouseEvent;
}
