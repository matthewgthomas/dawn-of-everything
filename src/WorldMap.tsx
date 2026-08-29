import { useEffect, useMemo, useRef, useState } from 'react'
import { geoEqualEarth, geoPath, select, zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { NormalizedSettlement } from './data'
import { clusterMapPoints, MAX_MAP_ZOOM, MIN_MAP_ZOOM } from './mapClustering'
import { fitMapPoints, type MapViewportPadding, type MapViewportSize } from './mapViewport'

interface WorldMapProps {
  settlements: NormalizedSettlement[]
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

const initialViewport: MapViewportSize = { width: 960, height: 470 }
const projectionPadding = 18
const motionDuration = (duration: number) => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration

export default function WorldMap({ settlements, selectedId, pinnedIds, onSelect }: WorldMapProps) {
  const shellRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const lastFitRef = useRef<{ width: number; height: number } | null>(null)
  const [viewport, setViewport] = useState<MapViewportSize>(initialViewport)
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const [clusterScale, setClusterScale] = useState(MIN_MAP_ZOOM)
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

  const clusters = useMemo(() => clusterMapPoints(points, clusterScale), [clusterScale, points])
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

  return (
    <div ref={shellRef} className="map-shell" aria-label="Interactive world map of settlements">
      <div className="map-controls" aria-label="Map controls">
        <button className="icon-button" onClick={() => scaleBy(1.7)} aria-label="Zoom map in"><Plus /></button>
        <button className="icon-button" onClick={() => scaleBy(0.59)} aria-label="Zoom map out"><Minus /></button>
        <button className="icon-button" onClick={reset} aria-label="Fit visible settlements"><LocateFixed /></button>
      </div>
      <svg
        ref={svgRef}
        className="world-map"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby="map-title map-desc"
      >
        <title id="map-title">Settlements in The Dawn of Everything</title>
        <desc id="map-desc">Pan and zoom the map. Select a marker or numbered cluster to inspect settlements.</desc>
        <defs><clipPath id="world-map-clip"><rect width={width} height={height} /></clipPath></defs>
        <g clipPath="url(#world-map-clip)">
          <g transform={transform.toString()}>
            <path className="map-sphere" d={path({ type: 'Sphere' }) ?? ''} />
            <path className="map-land" d={path(countries) ?? ''} />
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
              return (
                <g className={`map-marker${selected ? ' is-selected' : ''}${pinIndex >= 0 ? ` is-pinned pin-${pinIndex}` : ''}`} key={settlement.settlement_id} transform={`translate(${x} ${y})`}>
                  <circle
                    r={(selected ? 8 : 5) / transform.k}
                    tabIndex={0}
                    role="button"
                    aria-label={`${settlement.canonical_name}, ${settlement.occupation_interval_display}`}
                    onClick={() => onSelect(settlement.settlement_id)}
                    onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(settlement.settlement_id) }}
                  />
                  {pinIndex >= 0 && <text fontSize={8 / transform.k} dy={2.7 / transform.k}>{String.fromCharCode(65 + pinIndex)}</text>}
                  <title>{settlement.canonical_name}</title>
                </g>
              )
            })}
          </g>
        </g>
      </svg>
      <span className="map-caption">{points.length} mapped · {settlements.length - points.length} unresolved</span>
      <span className="map-credit">Natural Earth · representative points</span>
    </div>
  )
}
