import { useId } from 'react'
import { geoEqualEarth, geoPath } from 'd3'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'
import type { GeometryCollection, Topology } from 'topojson-specification'
import type { NormalizedSettlement } from './data'

interface SettlementLocationMapProps {
  settlement: NormalizedSettlement
}

const width = 560
const height = 220
const projection = geoEqualEarth().fitExtent([[18, 18], [width - 18, height - 18]], { type: 'Sphere' })
const path = geoPath(projection)
const countries = feature(
  world as unknown as Topology,
  (world as unknown as Topology).objects.countries as GeometryCollection,
)

export default function SettlementLocationMap({ settlement }: SettlementLocationMapProps) {
  const titleId = useId()
  const descriptionId = useId()
  const latitude = settlement.latitudeNumber
  const longitude = settlement.longitudeNumber

  if (latitude === null || longitude === null) return null

  const point = projection([longitude, latitude])
  if (!point) return null

  return (
    <figure className="detail-location-map">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <title id={titleId}>Location of {settlement.canonical_name} on the world map</title>
        <desc id={descriptionId}>Representative point at {latitude.toFixed(3)} latitude and {longitude.toFixed(3)} longitude.</desc>
        <path className="map-sphere" d={path({ type: 'Sphere' }) ?? ''} />
        <path className="map-land" d={path(countries) ?? ''} />
        <path className="map-country-borders" d={path(countries) ?? ''} aria-hidden="true" />
        <g className="detail-location-marker" transform={`translate(${point[0]} ${point[1]})`} aria-hidden="true">
          <circle className="detail-location-halo" r="14" />
          <circle className="detail-location-dot" r="6" />
        </g>
      </svg>
      <figcaption><strong>{settlement.canonical_name}</strong><span>Representative point</span></figcaption>
    </figure>
  )
}
