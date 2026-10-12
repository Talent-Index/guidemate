"use client";

import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export function ExperienceMeetingMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label?: string | null;
}) {
  const mapsUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="space-y-2">
      <div className="h-56 overflow-hidden rounded-2xl border border-brand-border sm:h-72 md:h-80">
        <MapContainer
          center={[lat, lng]}
          zoom={15}
          className="h-full w-full"
          scrollWheelZoom={false}
          dragging
          touchZoom
          doubleClickZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} />
        </MapContainer>
      </div>
      <p className="text-xs text-brand-muted">
        {label ? `${label} · ` : ""}
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-accent hover:underline">
          Open full map
        </a>
      </p>
    </div>
  );
}
