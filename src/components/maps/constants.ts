import type { InteractiveMapFeatureStyle } from './map-types';

export const DEFAULT_MAP_CENTER: [number, number] = [45.9432, 24.9668]; // Center of Romania
export const DEFAULT_MAP_ZOOM = 7;
export const DEFAULT_MIN_ZOOM = 6;
export const DEFAULT_MAX_ZOOM = 12;

// Romania bounding box
export const DEFAULT_MAX_BOUNDS: [[number, number], [number, number]] = [
    [35.5, 20.0],
    [50.5, 30.0],
];

export const DEFAULT_FEATURE_STYLE: InteractiveMapFeatureStyle = {
    color: '#cccccc', // Light gray border
    weight: 1,      // Small border
    opacity: 1,
    fillColor: '#f0f0f0', // Very light gray fill
    fillOpacity: 0.5,
};

export const HIGHLIGHT_FEATURE_STYLE: InteractiveMapFeatureStyle = {
    weight: 3,
    color: '#666',
    fillOpacity: 0.7,
};

export const PERMANENT_HIGHLIGHT_STYLE: InteractiveMapFeatureStyle = {
    weight: 5,
    dashArray: '10 5',
    color: '#000000', // Border color for permanent highlight
};
