import { useEffect, useMemo, useRef, useState } from 'react'
import { geoEqualEarth, geoPath, select, zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3'
import { LocateFixed, Minus, Plus } from 'lucide-react'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { NormalizedSettlement } from './data'

interface WorldMapProps {
  settlements: NormalizedSettlement[]
  selectedId: string | null
  pinnedIds: string[]
  onSelect: (id: string) => void
}

interface ProjectedPoint {
  settlement: NormalizedSettlement
  x: number
  y: number
}

interface Cluster {
  key: string
  x: number
  y: number
  points: ProjectedPoint[]
}

const width = 960
const height = 470

export default function WorldMap({ settlements, selectedId, pinnedIds, onSelect }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [transform, setTransform] = useState<ZoomTransform>(zoomIdentity)
  const projection = useMemo(() => geoEqualEarth().fitExtent([[18, 18], [width - 18, height - 18]], { type: 'Sphere' }), [])
  const path = useMemo(() => geoPath(projection), [projection])
  const countries = useMemo(
    () => feature(world as unknown as Topology, (world as unknown as Topology).objects.countries as GeometryCollection),
    [],
  )

  const points = useMemo(() => settlements.flatMap((settlement): ProjectedPoint[] => {
    if (settlement.longitudeNumber === null || settlement.latitudeNumber === null) return []
    const point = projection([settlement.longitudeNumber, settlement.latitudeNumber])
    return point ? [{ settlement, x: point[0], y: point[1] }] : []
  }), [projection, settlements])

  const clusters = useMemo(() => {
    const cells = new Map<string, ProjectedPoint[]>()
    const cellSize = transform.k > 6 ? 20 : 42
    points.forEach((point) => {
      const screenX = transform.applyX(point.x)
      const screenY = transform.applyY(point.y)
      const key = `${Math.floor(screenX / cellSize)}:${Math.floor(screenY / cellSize)}`
      const entries = cells.get(key) ?? []
      entries.push(point)
      cells.set(key, entries)
    })
    return [...cells.entries()].map(([key, entries]): Cluster => ({
      key,
      x: entries.reduce((sum, entry) => sum + entry.x, 0) / entries.length,
      y: entries.reduce((sum, entry) => sum + entry.y, 0) / entries.length,
      points: entries,
    }))
  }, [points, transform])

  useEffect(() => {
    if (!svgRef.current) return
    const behavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 14])
      .translateExtent([[-width * 0.55, -height * 0.55], [width * 1.55, height * 1.55]])
      .on('zoom', (event) => setTransform(event.transform))
    zoomRef.current = behavior
    const selection = select(svgRef.current)
    selection.call(behavior).on('dblclick.zoom', null)
    return () => { selection.on('.zoom', null) }
  }, [])

  useEffect(() => {
    if (!selectedId || !svgRef.current || !zoomRef.current) return
    const point = points.find((entry) => entry.settlement.settlement_id === selectedId)
    if (!point) return
    const scale = Math.max(transform.k, 3)
    const target = zoomIdentity.translate(width / 2, height / 2).scale(scale).translate(-point.x, -point.y)
    select(svgRef.current).transition().duration(420).call(zoomRef.current.transform, target)
  }, [selectedId]) // eslint-disable-line react-hooks/exhaustive-deps

  const scaleBy = (factor: number, center: [number, number] = [width / 2, height / 2]) => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(260).call(zoomRef.current.scaleBy, factor, center)
  }

  const reset = () => {
    if (!svgRef.current || !zoomRef.current) return
    select(svgRef.current).transition().duration(320).call(zoomRef.current.transform, zoomIdentity)
  }

  return (
    <div className="map-shell" aria-label="Interactive world map of settlements">
      <div className="map-controls" aria-label="Map controls">
        <button className="icon-button" onClick={() => scaleBy(1.7)} aria-label="Zoom map in"><Plus /></button>
        <button className="icon-button" onClick={() => scaleBy(0.59)} aria-label="Zoom map out"><Minus /></button>
        <button className="icon-button" onClick={reset} aria-label="Reset world map"><LocateFixed /></button>
      </div>
      <svg ref={svgRef} className="world-map" viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby="map-title map-desc">
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
