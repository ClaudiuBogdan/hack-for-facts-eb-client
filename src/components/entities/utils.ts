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
const MAX_ENTITY_FEATURE_ZOOM = 15;
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

    const [minLon, minLat, maxLon, maxLat] = featureBbox;

    const lonDiff = Math.max(maxLon - minLon, MIN_FEATURE_BBOX_DELTA);
    const latDiff = Math.max(maxLat - minLat, MIN_FEATURE_BBOX_DELTA);

    const zoomLat = Math.log(360 / latDiff) / Math.LN2;
    const zoomLon = Math.log(360 / lonDiff) / Math.LN2;
    const zoom = Math.min(zoomLat, zoomLon, MAX_ENTITY_FEATURE_ZOOM);
    const [centerLongitude, centerLatitude] = featureCenter.geometry.coordinates;


    return {
        center: [centerLatitude, centerLongitude] as LatLngExpression,
        zoom: Number.isFinite(zoom) ? zoom : DEFAULT_ENTITY_FEATURE_ZOOM,
        featureId: featureId || entity.cui,
    };
};


export function getYearLabel(year: number, month?: TMonth, quarter?: TQuarter) {
    if (month) return `${year}-${month}`;
    if (quarter) return `${year}-${quarter}`;
    return `${year}`;
}
