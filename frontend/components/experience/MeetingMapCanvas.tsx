"use client";

import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export const NAIROBI_CENTER = { lat: -1.286389, lng: 36.817223 };
export const DEFAULT_ZOOM = 12;

function MapClickHandler({ onPin }: { onPin: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      onPin({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  return null;
}

export function MeetingMapCanvas({
  lat,
  lng,
  onPin,
}: {
  lat: number | null;
  lng: number | null;
  onPin: (coords: { lat: number; lng: number }) => void;
}) {
  const centerLat = lat ?? NAIROBI_CENTER.lat;
  const centerLng = lng ?? NAIROBI_CENTER.lng;
  const hasPin = lat !== null && lng !== null;

  return (
    <MapContainer
      center={[centerLat, centerLng]}
      zoom={DEFAULT_ZOOM}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onPin={onPin} />
      {hasPin && (
        <>
          <Recenter lat={lat} lng={lng} />
          <Marker
            position={[lat, lng]}
            draggable
            eventHandlers={{
              dragend(e) {
                const pos = e.target.getLatLng();
                onPin({ lat: pos.lat, lng: pos.lng });
              },
            }}
          />
        </>
      )}
    </MapContainer>
  );
}
