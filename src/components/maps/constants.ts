import { LatLngExpression, PathOptions, LatLngBoundsExpression } from 'leaflet';

export const DEFAULT_MAP_CENTER: LatLngExpression = [45.9432, 24.9668]; // Romania's geographical center
export const DEFAULT_MAP_ZOOM = 8;
export const DEFAULT_MIN_ZOOM = 7;
export const DEFAULT_MAX_ZOOM = 18;
export const DEFAULT_MAX_BOUNDS: LatLngBoundsExpression = [
  [43.5, 20.0], // Southwest
  [48.5, 30.0], // Northeast
];

export const DEFAULT_FEATURE_STYLE: PathOptions = {
    fillColor: '#3388ff', // Default blue fill
    weight: 1,
    opacity: 1,
    color: 'white', // White border
    fillOpacity: 0.5,
};

export const HIGHLIGHT_FEATURE_STYLE: PathOptions = {
    weight: 3,
    color: '#666',
    fillOpacity: 0.7,
};