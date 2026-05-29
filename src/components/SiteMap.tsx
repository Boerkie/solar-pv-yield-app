import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { LatLngPoint, PVStringConfig, Site } from '../types';
import { calculateBearingDegrees } from '../utils/geo';

type SiteMapProps = {
  site: Site;
  strings: PVStringConfig[];
  activeDrawStringId?: string;
  mapScrollLocked: boolean;
  onSiteChange: (site: Site) => void;
  onStringChange: (pvString: PVStringConfig) => void;
};

const siteIcon = L.divIcon({
  className: 'site-marker',
  html: '<div></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6]
});

export function SiteMap({ site, strings, activeDrawStringId, mapScrollLocked, onSiteChange, onStringChange }: SiteMapProps) {
  const activeString = strings.find((pvString) => pvString.id === activeDrawStringId);
  const sitePoint = useMemo(() => ({ lat: site.latitude, lng: site.longitude }), [site.latitude, site.longitude]);

  function handleMapClick(point: LatLngPoint) {
    if (!activeString) {
      onSiteChange({
        ...site,
        latitude: Number(point.lat.toFixed(6)),
        longitude: Number(point.lng.toFixed(6)),
        label: `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`
      });
      return;
    }

    const azimuthDegrees = calculateBearingDegrees(sitePoint, point);
    onStringChange({
      ...activeString,
      azimuthDegrees,
      arrow: {
        start: sitePoint,
        end: point
      }
    });
  }

  return (
    <div className="map-card">
      <div className="map-toolbar">
        <div>
          <strong>Location and panel orientation</strong>
          <span>
            {activeString
              ? `Drawing ${activeString.name}: click the direction the panels face. The site dot is used as the arrow start.`
              : 'Click the map to set the site. Use Draw map arrow on an array to set panel direction.'}
          </span>
          <span className="map-lock-state">
            {mapScrollLocked
              ? 'Map scrolling is locked. Use the + and - controls for zoom, or unlock it if you need to pan.'
              : 'Map scrolling is unlocked. Mouse wheel, dragging and touch panning are enabled.'}
          </span>
        </div>
        <div className="coord-chip">Lat {site.latitude.toFixed(6)} · Lon {site.longitude.toFixed(6)}</div>
      </div>

      <MapContainer center={[site.latitude, site.longitude]} zoom={20} maxZoom={23} className="site-map">
        <ChangeView site={site} />
        <MapInteractionSettings locked={mapScrollLocked} />
        <TileLayer
          attribution="Tiles &copy; Esri, Maxar, Earthstar Geographics, and the GIS User Community"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxNativeZoom={19}
          maxZoom={23}
        />
        <MapClickHandler onMapClick={handleMapClick} />
        <Marker position={[site.latitude, site.longitude]} icon={siteIcon} />
        {strings.map((pvString) => <StringArrow key={pvString.id} pvString={pvString} />)}
      </MapContainer>
    </div>
  );
}

function StringArrow({ pvString }: { pvString: PVStringConfig }) {
  const arrowIcon = useMemo(() => L.divIcon({
    className: 'arrow-marker',
    html: `<div class="arrow-head" style="transform: rotate(${pvString.azimuthDegrees}deg)"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }), [pvString.azimuthDegrees]);

  if (!pvString.arrow) {
    return null;
  }

  const start: [number, number] = [pvString.arrow.start.lat, pvString.arrow.start.lng];
  const end: [number, number] = [pvString.arrow.end.lat, pvString.arrow.end.lng];

  return (
    <>
      <Polyline positions={[start, end]} pathOptions={{ weight: 5 }} />
      <Marker position={end} icon={arrowIcon} />
    </>
  );
}

function MapClickHandler({ onMapClick }: { onMapClick: (point: LatLngPoint) => void }) {
  useMapEvents({
    click(event) {
      onMapClick({
        lat: event.latlng.lat,
        lng: event.latlng.lng
      });
    }
  });

  return null;
}

function MapInteractionSettings({ locked }: { locked: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (locked) {
      map.scrollWheelZoom.disable();
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.boxZoom.disable();
      return;
    }

    map.scrollWheelZoom.enable();
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
  }, [locked, map]);

  return null;
}

function ChangeView({ site }: { site: Site }) {
  const map = useMap();
  map.setView([site.latitude, site.longitude], map.getZoom());
  return null;
}
