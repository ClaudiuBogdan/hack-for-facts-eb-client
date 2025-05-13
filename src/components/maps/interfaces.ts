import { Feature, Geometry } from 'geojson';

// Properties expected for each UAT feature
export interface UatProperties {
    natcode: string;
    name: string;
    county: string;
    // Allow any other properties that might come from the GeoJSON
    [key: string]: string | number | boolean | null | undefined | object;
}

// Specific Feature type using UatProperties
export type UatFeature = Feature<Geometry, UatProperties>;

