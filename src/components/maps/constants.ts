import { LatLngExpression, PathOptions } from 'leaflet';

export const DEFAULT_MAP_CENTER: LatLngExpression = [45.9432, 24.9668]; // Center of Romania
export const DEFAULT_MAP_ZOOM = 7;

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