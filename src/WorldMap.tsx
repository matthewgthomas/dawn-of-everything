import { useEffect, useMemo, useRef, useState } from 'react'
import { geoEqualEarth, geoPath, select, zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3'
import { Layers3, LocateFixed, Minus, Plus } from 'lucide-react'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import type { Feature, Geometry } from 'geojson'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { NormalizedSettlement } from './data'
import { clusterMapPoints, MAX_MAP_ZOOM, MIN_MAP_ZOOM } from './mapClustering'
import {
  isFeatureVisible,
  loadMapGeography,
  MAP_GEOGRAPHY_SOURCE,
  overviewLakeNames,
  overviewRiverNames,
  prominentRiverNames,
  regionClassName,
  type RegionProperties,
  type WaterProperties,
  type MapGeography,
} from './mapGeography'
import { fitMapPoints, type MapViewportPadding, type MapViewportSize } from './mapViewport'

interface WorldMapProps {
  settlements: NormalizedSettlement[]
  labelledSettlementIds: string[]
  selectedId: string | null
  pinnedIds: string[]
  onSelect: (id: string) => void
}

interface ProjectedPoint {
  id: string
  settlement: NormalizedSettlement
  x: number
  y: number
}

interface MapLayerState {
  water: boolean
  landforms: boolean
  labels: boolean
}

interface ProjectedLabel {
  key: string
  name: string
  x: number
  y: number
  kind: string
  detail?: string
}

const initialViewport: MapViewportSize = { width: 960, height: 470 }
const projectionPadding = 18
const mapLabelSizes = { landform: 10, mountains: 10, water: 10, elevation: 10 }
export const SETTLEMENT_LABEL_COUNT_LIMIT = 4
export const SETTLEMENT_LABEL_MIN_ZOOM = 7
export const SETTLEMENT_LABEL_FONT_SIZE = 11
const settlementLabelOffset = 5
const settlementLabelMinimumWidth = 72
const settlementLabelMaximumWidth = 240
const settlementLabelCharacterWidth = 7
const motionDuration = (duration: number) => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration

export const shouldShowSettlementLabels = (visibleLabelCount: number, committedZoom: number) =>
  visibleLabelCount > 0
  && (visibleLabelCount <= SETTLEMENT_LABEL_COUNT_LIMIT || committedZoom >= SETTLEMENT_LABEL_MIN_ZOOM)

export const settlementLabelPlacement = (
  projectedX: number,
  transform: ZoomTransform,
  viewportWidth: number,
  markerRadius: number,
  label: string,
) => {
  const estimatedWidth = Math.min(
    settlementLabelMaximumWidth,
    Math.max(settlementLabelMinimumWidth, label.length * settlementLabelCharacterWidth),
  )
  const placeOnLeft = transform.applyX(projectedX) > viewportWidth - estimatedWidth - settlementLabelOffset
  const offset = (markerRadius + settlementLabelOffset) / transform.k
  return {
    x: placeOnLeft ? -offset : offset,
    textAnchor: placeOnLeft ? 'end' as const : 'start' as const,
  }
}

export default function WorldMap({ settlements, labelledSettlementIds, selectedId, pinnedIds, onSelect }: WorldMapProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const lastFitRef = useRef<{ width: number; height: number } | null>(null)
  const [viewport, setViewport] = useState<MapViewportSize>(initialViewport)
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const [clusterScale, setClusterScale] = useState(MIN_MAP_ZOOM)
  const [layerMenuOpen, setLayerMenuOpen] = useState(false)
  const [layers, setLayers] = useState<MapLayerState>({ water: true, landforms: true, labels: true })
  const [geography, setGeography] = useState<MapGeography | null>(null)
  const { width, height } = viewport
  const projection = useMemo(() => geoEqualEarth().fitExtent([
    [projectionPadding, projectionPadding],
    [Math.max(projectionPadding + 1, width - projectionPadding), Math.max(projectionPadding + 1, height - projectionPadding)],
  ], { type: 'Sphere' }), [height, width])
  const path = useMemo(() => geoPath(projection), [projection])
  const countries = useMemo(
    () => feature(world as unknown as Topology, (world as unknown as Topology).objects.countries as GeometryCollection),
    [],
  )

  const points = useMemo(() => settlements.flatMap((settlement): ProjectedPoint[] => {
    if (settlement.longitudeNumber === null || settlement.latitudeNumber === null) return []
    const point = projection([settlement.longitudeNumber, settlement.latitudeNumber])
    return point ? [{ id: settlement.settlement_id, settlement, x: point[0], y: point[1] }] : []
  }), [projection, settlements])

  const labelledIdSet = useMemo(() => new Set(labelledSettlementIds), [labelledSettlementIds])
  const visibleLabelCount = useMemo(
    () => points.filter(({ id }) => labelledIdSet.has(id)).length,
    [labelledIdSet, points],
  )
  const settlementLabelsVisible = shouldShowSettlementLabels(visibleLabelCount, clusterScale)

  const clusters = useMemo(() => clusterMapPoints(points, clusterScale), [clusterScale, points])
  const visibleRivers = useMemo(() => (geography?.rivers.features ?? []).filter(
    (entry) => isFeatureVisible(entry.properties.minZoom, clusterScale),
  ), [clusterScale, geography])
  const landformLabels = useMemo(() => {
    if (!layers.labels || !layers.landforms) return []
    const labels = new Map<string, { feature: Feature<Geometry, RegionProperties>; area: number }>()
    geography?.regions.features.forEach((entry) => {
      if (!isFeatureVisible(entry.properties.minZoom, clusterScale)) return
      const area = path.area(entry)
      const previous = labels.get(entry.properties.name)
      if (!previous || previous.area < area) labels.set(entry.properties.name, { feature: entry, area })
    })
    return [...labels.values()].flatMap(({ feature: entry }): ProjectedLabel[] => {
      const [x, y] = path.centroid(entry)
      return Number.isFinite(x) && Number.isFinite(y) ? [{
        key: `region:${entry.properties.name}`,
        name: entry.properties.name,
        x,
        y,
        kind: regionClassName(entry),
      }] : []
    })
  }, [clusterScale, geography, layers.labels, layers.landforms, path])
  const waterLabels = useMemo(() => {
    if (!layers.labels || !layers.water || clusterScale < 1.2) return []
    const labels: ProjectedLabel[] = []
    const addLongestFeatures = (entries: Feature<Geometry, WaterProperties>[], kind: 'river' | 'lake') => {
      const longest = new Map<string, { feature: Feature<Geometry, WaterProperties>; length: number }>()
      entries.forEach((entry) => {
        const name = entry.properties.name
        const allowed = kind === 'river'
          ? prominentRiverNames.has(name) && (clusterScale >= 2 || overviewRiverNames.has(name))
          : clusterScale >= 2 || overviewLakeNames.has(name)
        if (!allowed) return
        const length = path.measure(entry)
        const previous = longest.get(name)
        if (!previous || previous.length < length) longest.set(name, { feature: entry, length })
      })
      longest.forEach(({ feature: entry }, name) => {
        const [x, y] = path.centroid(entry)
        if (Number.isFinite(x) && Number.isFinite(y)) labels.push({ key: `${kind}:${name}`, name, x, y, kind })
      })
    }
    addLongestFeatures(visibleRivers, 'river')
    addLongestFeatures(geography?.lakes.features ?? [], 'lake')
    return labels
  }, [clusterScale, geography, layers.labels, layers.water, path, visibleRivers])
  const elevationLabels = useMemo(() => {
    if (!layers.labels || !layers.landforms) return []
    return (geography?.elevationPoints.features ?? []).flatMap((entry): ProjectedLabel[] => {
      if (!isFeatureVisible(entry.properties.minZoom, clusterScale)) return []
      const [longitude, latitude] = entry.geometry.coordinates
      const point = projection([longitude, latitude])
      if (!point) return []
      return [{
        key: `elevation:${entry.properties.name}`,
        name: entry.properties.name,
        x: point[0],
        y: point[1],
        kind: entry.properties.featureClass,
        detail: entry.properties.elevation ? `${entry.properties.elevation.toLocaleString()} m` : undefined,
      }]
    })
  }, [clusterScale, geography, layers.labels, layers.landforms, projection])
  const pointKey = useMemo(() => points.map(({ id }) => id).sort().join('|'), [points])
  const fitPadding = useMemo<MapViewportPadding>(() => compact ? {
    top: 68,
    right: 20,
    bottom: Math.min(170, Math.max(104, height * 0.32)),
    left: 20,
  } : {
    top: 28,
    right: 72,
    bottom: 36,
    left: 28,
  }, [compact, height])
  const fitTransform = useMemo(() => fitMapPoints(points, viewport, fitPadding), [fitPadding, points, viewport])

  useEffect(() => {
    let active = true
    void loadMapGeography().then((data) => { if (active) setGeography(data) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const handleChange = () => setCompact(media.matches)
    handleChange()
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (!shellRef.current) return
    const updateSize = (nextWidth: number, nextHeight: number) => {
      if (nextWidth <= 0 || nextHeight <= 0) return
      const next = { width: Math.round(nextWidth), height: Math.round(nextHeight) }
      setViewport((current) => current.width === next.width && current.height === next.height ? current : next)
    }
    const measure = () => {
      if (!shellRef.current) return
      const bounds = shellRef.current.getBoundingClientRect()
      updateSize(bounds.width, bounds.height)
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(([entry]) => updateSize(entry.contentRect.width, entry.contentRect.height))
    observer.observe(shellRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([MIN_MAP_ZOOM, MAX_MAP_ZOOM])
      .extent([[0, 0], [width, height]])
      .translateExtent([[-width * 0.55, -height * 0.55], [width * 1.55, height * 1.55]])
      .on('zoom', (event) => setTransform(event.transform))
      .on('end', (event) => setClusterScale(event.transform.k))
    zoomRef.current = behavior
    const selection = select(svgRef.current)
    selection.call(behavior).on('dblclick.zoom', null)
    return () => { selection.on('.zoom', null) }
  }, [height, width])

  useEffect(() => {
    if (!svgRef.current || !zoomRef.current) return
    const previous = lastFitRef.current
    const resized = Boolean(previous && (previous.width !== width || previous.height !== height))
    const firstFit = previous === null
    lastFitRef.current = { width, height }
    const selection = select(svgRef.current)
    selection.interrupt()
    const duration = firstFit || resized ? 0 : motionDuration(320)
    if (duration === 0) selection.call(zoomRef.current.transform, fitTransform)
    else selection.transition().duration(duration).call(zoomRef.current.transform, fitTransform)
  }, [fitTransform, height, pointKey, width])

  useEffect(() => {
    if (!selectedId || !svgRef.current || !zoomRef.current) return
    const point = points.find((entry) => entry.settlement.settlement_id === selectedId)
    if (!point) return
    const scale = Math.max(transform.k, 3)
    const target = zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-point.x, -point.y)
    select(svgRef.current).transition().duration(motionDuration(420)).call(zoomRef.current.transform, target)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scaleBy = (factor: number, center: [number, number] = [width / 2, height / 2]) => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(motionDuration(260)).call(zoomRef.current.scaleBy, factor, center)
  }

  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).interrupt().transition().duration(motionDuration(320)).call(zoomRef.current.transform, fitTransform)
  }

  const toggleLayer = (layer: keyof MapLayerState) => {
    setLayers((current) => ({ ...current, [layer]: !current[layer] }))
  }

  return (
    <div ref={shellRef} className="map-shell" aria-label="Interactive world map of settlements">
      <div className="map-controls" aria-label="Map controls">
        <button className="icon-button" onClick={() => scaleBy(1.7)} aria-label="Zoom map in"><Plus /></button>
        <button className="icon-button" onClick={() => scaleBy(0.59)} aria-label="Zoom map out"><Minus /></button>
        <button className="icon-button" onClick={reset} aria-label="Fit visible settlements"><LocateFixed /></button>
        <button
          className={`icon-button${layerMenuOpen ? ' is-active' : ''}`}
          onClick={() => setLayerMenuOpen((open) => !open)}
          aria-label="Map layers"
          aria-expanded={layerMenuOpen}
          aria-controls="map-layer-menu"
        ><Layers3 /></button>
      </div>
      {layerMenuOpen && (
        <div className="map-layer-menu" id="map-layer-menu">
          <div className="map-layer-heading"><strong>Physical map</strong><span>Detail increases as you zoom</span></div>
          <label>
            <input type="checkbox" checked={layers.water} onChange={() => toggleLayer('water')} />
            <span><i className="map-layer-swatch water" /><strong>Water</strong><small>Rivers and lakes</small></span>
          </label>
          <label>
            <input type="checkbox" checked={layers.landforms} onChange={() => toggleLayer('landforms')} />
            <span><i className="map-layer-swatch terrain" /><strong>Landforms</strong><small>Ranges, deserts, plains and peaks</small></span>
          </label>
          <label>
            <input type="checkbox" checked={layers.labels} onChange={() => toggleLayer('labels')} />
            <span><i className="map-layer-swatch labels" /><strong>Names</strong><small>Geographic labels</small></span>
          </label>
        </div>
      )}
      <svg
        ref={svgRef}
        className="world-map"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="map-title map-desc"
      >
        <title id="map-title">Settlements in The Dawn of Everything</title>
        <desc id="map-desc">Pan and zoom a physical map with rivers, lakes and landforms. Select a marker or numbered cluster to inspect settlements. Named-filter settlements are labelled when space permits.</desc>
        <defs>
          <clipPath id="world-map-clip"><rect width={width} height={height} /></clipPath>
          <pattern id="map-mountain-pattern" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
            <path className="map-mountain-hatch" d="M 0 1 L 7 1" />
          </pattern>
          <pattern id="map-desert-pattern" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle className="map-desert-dot" cx="2" cy="2" r="0.8" />
            <circle className="map-desert-dot" cx="7" cy="6" r="0.65" />
          </pattern>
        </defs>
        <g clipPath="url(#world-map-clip)">
          <g transform={transform.toString()}>
            <path className="map-sphere" d={path({ type: 'Sphere' }) ?? ''} />
            <path className="map-land" d={path(countries) ?? ''} />
            {layers.landforms && (
              <g className="map-landforms" aria-hidden="true">
                {(geography?.regions.features ?? []).map((entry, index) => (
                  <path
                    className={`map-region map-region--${regionClassName(entry)}`}
                    d={path(entry) ?? ''}
                    key={`${entry.properties.name}:${index}`}
                  />
                ))}
              </g>
            )}
            {layers.water && (
              <g className="map-water" aria-hidden="true">
                {visibleRivers.map((entry, index) => (
                  <path className="map-river" d={path(entry) ?? ''} key={`${entry.properties.name}:${index}`} />
                ))}
                {(geography?.lakes.features ?? []).map((entry, index) => (
                  <path className="map-lake" d={path(entry) ?? ''} key={`${entry.properties.name}:${index}`} />
                ))}
              </g>
            )}
            <path className="map-country-borders" d={path(countries) ?? ''} aria-hidden="true" />
            {layers.labels && (
              <g className="map-geography-labels" aria-hidden="true">
                {landformLabels.map((label) => (
                  <text
                    className={`map-geography-label map-geography-label--${label.kind}`}
                    fontSize={(label.kind === 'mountains' ? mapLabelSizes.mountains : mapLabelSizes.landform) / transform.k}
                    key={label.key}
                    transform={`translate(${label.x} ${label.y})`}
                    vectorEffect="non-scaling-stroke"
                  >{label.name}</text>
                ))}
                {waterLabels.map((label) => (
                  <text
                    className={`map-geography-label map-geography-label--${label.kind}`}
                    fontSize={mapLabelSizes.water / transform.k}
                    key={label.key}
                    transform={`translate(${label.x} ${label.y})`}
                    vectorEffect="non-scaling-stroke"
                  >{label.name}</text>
                ))}
                {elevationLabels.map((label) => (
                  <g className={`map-elevation map-elevation--${label.kind}`} key={label.key} transform={`translate(${label.x} ${label.y})`}>
                    <path d={`M 0 ${-4.5 / transform.k} L ${4 / transform.k} ${3 / transform.k} L ${-4 / transform.k} ${3 / transform.k} Z`} />
                    <text x={6 / transform.k} y={2.5 / transform.k} fontSize={mapLabelSizes.elevation / transform.k} vectorEffect="non-scaling-stroke">
                      {label.name}{label.detail ? ` · ${label.detail}` : ''}
                    </text>
                  </g>
                ))}
              </g>
            )}
            {clusters.map((cluster) => {
              if (cluster.points.length > 1) {
                const names = cluster.points.slice(0, 4).map((entry) => entry.settlement.canonical_name).join(', ')
                const radius = 15 / transform.k
                return (
                  <g className="map-cluster" key={cluster.key} transform={`translate(${cluster.x} ${cluster.y})`}>
                    <circle
                      r={radius}
                      tabIndex={0}
                      role="button"
                      aria-label={`${cluster.points.length} settlements near this area: ${names}`}
                      onClick={() => scaleBy(1.9, transform.apply([cluster.x, cluster.y]) as [number, number])}
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') scaleBy(1.9, transform.apply([cluster.x, cluster.y]) as [number, number]) }}
                    />
                    <text fontSize={10 / transform.k} dy={3.5 / transform.k}>{cluster.points.length}</text>
                  </g>
                )
              }
              const { settlement, x, y } = cluster.points[0]
              const selected = settlement.settlement_id === selectedId
              const pinIndex = pinnedIds.indexOf(settlement.settlement_id)
              const markerRadius = selected ? 8 : 5
              const showLabel = settlementLabelsVisible && labelledIdSet.has(settlement.settlement_id)
              const labelPlacement = showLabel
                ? settlementLabelPlacement(x, transform, width, markerRadius, settlement.canonical_name)
                : null
              return (
                <g className={`map-marker${selected ? ' is-selected' : ''}${pinIndex >= 0 ? ` is-pinned pin-${pinIndex}` : ''}`} key={settlement.settlement_id} transform={`translate(${x} ${y})`}>
                  <circle
                    r={markerRadius / transform.k}
                    tabIndex={0}
                    role="button"
                    aria-label={`${settlement.canonical_name}, ${settlement.occupation_interval_display}`}
                    onClick={() => onSelect(settlement.settlement_id)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(settlement.settlement_id) }}
                  />
                  {pinIndex >= 0 && <text fontSize={8 / transform.k} dy={2.7 / transform.k}>{String.fromCharCode(65 + pinIndex)}</text>}
                  {labelPlacement && (
                    <text
                      className="map-settlement-label"
                      x={labelPlacement.x}
                      dy={3.5 / transform.k}
                      fontSize={SETTLEMENT_LABEL_FONT_SIZE / transform.k}
                      style={{ textAnchor: labelPlacement.textAnchor }}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                      aria-hidden="true"
                    >{settlement.canonical_name}</text>
                  )}
                  <title>{settlement.canonical_name}</title>
                </g>
              )
            })}
          </g>
        </g>
      </svg>
      <span className="map-caption">{points.length} mapped · {settlements.length - points.length} unresolved</span>
      <a className="map-credit" href={MAP_GEOGRAPHY_SOURCE} target="_blank" rel="noreferrer">Natural Earth · representative points</a>
    </div>
  )
}
