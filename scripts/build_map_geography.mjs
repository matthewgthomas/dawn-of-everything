import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(root, 'data/derived/map_geography.json')
const sourceDirIndex = process.argv.indexOf('--source-dir')
const sourceDir = sourceDirIndex >= 0 ? resolve(process.argv[sourceDirIndex + 1]) : null

const sources = {
  lakes110: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson',
  lakes50: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_lakes.geojson',
  rivers50: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_rivers_lake_centerlines.geojson',
  regions110: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_polys.geojson',
  elevation110: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geography_regions_elevation_points.geojson',
}

const localFiles = {
  lakes110: 'ne_lakes.geojson',
  lakes50: 'ne_50m_lakes.geojson',
  rivers50: 'ne_50m_rivers.geojson',
  regions110: 'ne_regions.geojson',
  elevation110: 'ne_elevation.geojson',
}

const extraLakeNames = new Set([
  'Chad', 'Dead Sea', 'Issyk-Kul', 'North Aral Sea', 'Qinghai',
  'South Aral Sea', 'Tonlé Sap', 'Turkana', 'Urmia', 'Van',
])
const extraRiverNames = new Set(['Colorado', 'Murray', 'Rio Grande', 'Tigris'])
const regionClasses = new Set(['Range/mtn', 'Desert', 'Plateau', 'Basin', 'Plain', 'Tundra'])
const displayNames = new Map([
  ['Al Furat', 'Euphrates'],
  ['Amazonas', 'Amazon'],
  ['Firat', 'Euphrates'],
  ['Huang', 'Yellow'],
  ['Nyanza', 'Victoria'],
])

async function loadSource(key) {
  if (sourceDir) return JSON.parse(await readFile(resolve(sourceDir, localFiles[key]), 'utf8'))
  const response = await fetch(sources[key])
  if (!response.ok) throw new Error(`Could not download ${sources[key]} (${response.status})`)
  return response.json()
}

function roundCoordinates(value) {
  if (Array.isArray(value)) return value.map(roundCoordinates)
  return typeof value === 'number' ? Number(value.toFixed(4)) : value
}

function feature(source, properties) {
  return {
    type: 'Feature',
    properties,
    geometry: {
      type: source.geometry.type,
      coordinates: roundCoordinates(source.geometry.coordinates),
    },
  }
}

function englishName(properties) {
  const name = properties.name_en || properties.NAME_EN || properties.name || properties.NAME
  return displayNames.get(name) || name
}

const [lakes110, lakes50, rivers50, regions110, elevation110] = await Promise.all([
  loadSource('lakes110'),
  loadSource('lakes50'),
  loadSource('rivers50'),
  loadSource('regions110'),
  loadSource('elevation110'),
])

const baseLakeNames = new Set(lakes110.features.map((entry) => englishName(entry.properties)))
const lakeFeatures = [
  ...lakes110.features,
  ...lakes50.features.filter((entry) => {
    const name = englishName(entry.properties)
    return extraLakeNames.has(name) && !baseLakeNames.has(name)
  }),
].map((entry) => feature(entry, {
  name: englishName(entry.properties),
  scalerank: entry.properties.scalerank ?? 0,
  minZoom: entry.properties.min_zoom ?? 1,
}))

const riverFeatures = rivers50.features
  .filter((entry) => (entry.properties.scalerank ?? 99) <= 3 || extraRiverNames.has(englishName(entry.properties)))
  .map((entry) => feature(entry, {
    name: englishName(entry.properties),
    scalerank: entry.properties.scalerank,
    minZoom: entry.properties.min_zoom,
  }))

const regionFeatures = regions110.features
  .filter((entry) => regionClasses.has(entry.properties.FEATURECLA))
  .map((entry) => feature(entry, {
    name: englishName(entry.properties),
    featureClass: entry.properties.FEATURECLA,
    scalerank: entry.properties.SCALERANK,
    minZoom: entry.properties.MIN_LABEL,
    maxZoom: entry.properties.MAX_LABEL,
  }))

const elevationFeatures = elevation110.features
  .filter((entry) => englishName(entry.properties))
  .map((entry) => feature(entry, {
    name: englishName(entry.properties),
    featureClass: entry.properties.featurecla,
    elevation: entry.properties.elevation,
    scalerank: entry.properties.scalerank,
    minZoom: entry.properties.min_zoom,
  }))

const output = {
  attribution: 'Natural Earth',
  source: 'https://www.naturalearthdata.com/',
  lakes: { type: 'FeatureCollection', features: lakeFeatures },
  rivers: { type: 'FeatureCollection', features: riverFeatures },
  regions: { type: 'FeatureCollection', features: regionFeatures },
  elevationPoints: { type: 'FeatureCollection', features: elevationFeatures },
}

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(output)}\n`)
console.log(`Wrote ${outputPath}`)
console.log(`${lakeFeatures.length} lakes, ${riverFeatures.length} river segments, ${regionFeatures.length} landforms, ${elevationFeatures.length} elevation features`)
