import { EntityDetailsData } from '@/lib/api/entities';
import type { LatLngExpression } from 'leaflet';
import { GeoJsonObject, Feature, FeatureCollection, Geometry } from 'geojson';
import bbox from '@turf/bbox';
import center from '@turf/center';
import { TMonth, TQuarter } from '@/schemas/reporting';

interface FeatureInfo {
    center: LatLngExpression;
    zoom: number;
    featureId: string | number;
}

const MIN_FEATURE_BBOX_DELTA = 1e-6;
const DEFAULT_ENTITY_FEATURE_ZOOM = 7;
const MIN_ENTITY_FEATURE_ZOOM = 5;
const MAX_ENTITY_FEATURE_ZOOM = 10;
const MAPLIBRE_TILE_SIZE = 512;
const WEB_MERCATOR_MAX_LATITUDE = 85.05112878;
const DEFAULT_ENTITY_FEATURE_VIEWPORT_WIDTH = 768;
const DEFAULT_ENTITY_FEATURE_VIEWPORT_HEIGHT = 420;
const DEFAULT_ENTITY_FEATURE_VIEWPORT_PADDING = 72;
const BUCHAREST_MUNICIPALITY_CUI = '4267117';

function isCountyLevelEntity(entity: EntityDetailsData): boolean {
    return entity.entity_type === 'admin_county_council' || entity.cui === BUCHAREST_MUNICIPALITY_CUI;
}

function isBucharestMunicipality(entity: EntityDetailsData): boolean {
    return entity.cui === BUCHAREST_MUNICIPALITY_CUI;
}

function isBucharestSectorFeature(feature: Feature): boolean {
    const properties = feature.properties;
    if (!properties) {
        return false;
    }

    const countyMnemonic = normalizeCountyCode(String(properties.countyMn ?? ''));
    const name = String(properties.name ?? '').toLocaleLowerCase('ro-RO');
    const levelName = String(properties.natLevName ?? '').toLocaleLowerCase('ro-RO');

    return countyMnemonic === 'B' && (name.includes('sectorul') || levelName.includes('sectoarele'));
}

function getBucharestSectorFeatureCollection(
    featureCollection: FeatureCollection,
): FeatureCollection<Geometry> | null {
    const features = featureCollection.features.filter(isBucharestSectorFeature) as Feature<Geometry>[];

    return features.length > 0
        ? {
            type: 'FeatureCollection',
            features,
        }
        : null;
}

function normalizeCountyCode(countyCode: string | null | undefined): string {
    return countyCode?.trim().toUpperCase() ?? '';
}

function normalizeSirutaCode(sirutaCode: string | number | null | undefined): string {
    return sirutaCode == null ? '' : String(sirutaCode).trim();
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function longitudeToMercatorX(longitude: number): number {
    return (longitude + 180) / 360;
}

function latitudeToMercatorY(latitude: number): number {
    const clampedLatitude = clamp(
        latitude,
        -WEB_MERCATOR_MAX_LATITUDE,
        WEB_MERCATOR_MAX_LATITUDE,
    );
    const latitudeRadians = clampedLatitude * Math.PI / 180;

    return (
        1 -
        Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)) / Math.PI
    ) / 2;
}

function calculateEntityFeatureZoom(featureBbox: readonly number[]): number {
    const [minLon, minLat, maxLon, maxLat] = featureBbox;
    if (
        !Number.isFinite(minLon) ||
        !Number.isFinite(minLat) ||
        !Number.isFinite(maxLon) ||
        !Number.isFinite(maxLat)
    ) {
        return DEFAULT_ENTITY_FEATURE_ZOOM;
    }

    const availableWidth = Math.max(
        1,
        DEFAULT_ENTITY_FEATURE_VIEWPORT_WIDTH - DEFAULT_ENTITY_FEATURE_VIEWPORT_PADDING * 2,
    );
    const availableHeight = Math.max(
        1,
        DEFAULT_ENTITY_FEATURE_VIEWPORT_HEIGHT - DEFAULT_ENTITY_FEATURE_VIEWPORT_PADDING * 2,
    );
    const xDiff = Math.max(
        Math.abs(longitudeToMercatorX(maxLon) - longitudeToMercatorX(minLon)),
        MIN_FEATURE_BBOX_DELTA,
    );
    const yDiff = Math.max(
        Math.abs(latitudeToMercatorY(maxLat) - latitudeToMercatorY(minLat)),
        MIN_FEATURE_BBOX_DELTA,
    );
    const zoomLon = Math.log2(availableWidth / (MAPLIBRE_TILE_SIZE * xDiff));
    const zoomLat = Math.log2(availableHeight / (MAPLIBRE_TILE_SIZE * yDiff));
    const zoom = Math.min(zoomLat, zoomLon);

    return Number.isFinite(zoom)
        ? clamp(zoom, MIN_ENTITY_FEATURE_ZOOM, MAX_ENTITY_FEATURE_ZOOM)
        : DEFAULT_ENTITY_FEATURE_ZOOM;
}

export const getEntityFeatureInfo = (entity: EntityDetailsData, geoJsonData: GeoJsonObject): FeatureInfo | null => {
    if (geoJsonData.type !== 'FeatureCollection') {
        return null;
    }

    const featureCollection = geoJsonData as FeatureCollection;

    let feature: Feature | FeatureCollection<Geometry> | undefined;
    let featureId: string | number | undefined;

    const bucharestSectorFeatureCollection = isBucharestMunicipality(entity)
        ? getBucharestSectorFeatureCollection(featureCollection)
        : null;

    if (bucharestSectorFeatureCollection) {
        feature = bucharestSectorFeatureCollection;
        featureId = entity.cui;
    } else if (isCountyLevelEntity(entity)) {
        const countyCode = normalizeCountyCode(entity.uat?.county_code);
        feature = featureCollection.features.find(
            (geoJsonFeature) =>
                normalizeCountyCode(String(geoJsonFeature.properties?.mnemonic ?? '')) === countyCode
        );
        featureId = feature?.properties?.mnemonic;
    } else {
        const sirutaCode = normalizeSirutaCode(entity.uat?.siruta_code);
        feature = featureCollection.features.find(
            (geoJsonFeature) => normalizeSirutaCode(geoJsonFeature.properties?.natcode) === sirutaCode
        );
        featureId = feature?.properties?.natcode;
    }

    if (!feature) {
        return null;
    }

    const featureBbox = bbox(feature);
    const featureCenter = center(feature);

    const zoom = calculateEntityFeatureZoom(featureBbox);
    const [centerLongitude, centerLatitude] = featureCenter.geometry.coordinates;


    return {
        center: [centerLatitude, centerLongitude] as LatLngExpression,
        zoom,
        featureId: featureId || entity.cui,
    };
};


export function getYearLabel(year: number, month?: TMonth, quarter?: TQuarter) {
    if (month) return `${year}-${month}`;
    if (quarter) return `${year}-${quarter}`;
    return `${year}`;
}
