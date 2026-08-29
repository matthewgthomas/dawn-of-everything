import type { Feature, FeatureCollection, Geometry, Point } from 'geojson'

export interface WaterProperties {
  name: string
  scalerank: number
  minZoom: number
}

export interface RegionProperties extends WaterProperties {
  featureClass: 'Range/mtn' | 'Desert' | 'Plateau' | 'Basin' | 'Plain' | 'Tundra'
  maxZoom: number
}

export interface ElevationProperties extends WaterProperties {
  featureClass: 'mountain' | 'depression' | 'pass'
  elevation: number
}

export interface MapGeography {
  attribution: string
  source: string
  lakes: FeatureCollection<Geometry, WaterProperties>
  rivers: FeatureCollection<Geometry, WaterProperties>
  regions: FeatureCollection<Geometry, RegionProperties>
  elevationPoints: FeatureCollection<Point, ElevationProperties>
}

export const MAP_GEOGRAPHY_SOURCE = 'https://www.naturalearthdata.com/'

export async function loadMapGeography() {
  const module = await import('../data/derived/map_geography.json')
  return module.default as unknown as MapGeography
}

export const prominentRiverNames = new Set([
  'Amazon', 'Brahmaputra', 'Colorado', 'Congo', 'Danube', 'Euphrates',
  'Ganges', 'Indus', 'Lena', 'Mekong', 'Mississippi', 'Murray', 'Niger',
  'Nile', 'Ob', 'Orinoco', 'Paraná', 'Rio Grande', 'St. Lawrence',
  'Tigris', 'Volga', 'Yangtze', 'Yellow', 'Zambezi',
])

export const overviewRiverNames = new Set([
  'Amazon', 'Congo', 'Danube', 'Mekong', 'Mississippi', 'Nile', 'Yangtze',
])

export const overviewLakeNames = new Set([
  'Baikal', 'Great Bear', 'Nyanza', 'Superior', 'Tanganyika',
])

export function sourceZoomForScale(scale: number) {
  return scale + 1
}

export function isFeatureVisible(minZoom: number, scale: number) {
  return minZoom <= sourceZoomForScale(scale)
}

export function regionClassName(feature: Feature<Geometry, RegionProperties>) {
  const names: Record<RegionProperties['featureClass'], string> = {
    'Range/mtn': 'mountains',
    Desert: 'desert',
    Plateau: 'plateau',
    Basin: 'basin',
    Plain: 'plain',
    Tundra: 'tundra',
  }
  return names[feature.properties.featureClass]
}
