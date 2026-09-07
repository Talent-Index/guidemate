"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const MeetingMapCanvas = dynamic(
  () => import("./MeetingMapCanvas").then((mod) => mod.MeetingMapCanvas),
  { ssr: false }
);

type GeocodeResult = { lat: number; lng: number; label: string };

export function MeetingMapPicker({
  lat,
  lng,
  label,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  label: string | null;
  onChange: (next: { lat: number; lng: number; label: string | null }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reverseFailed, setReverseFailed] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) {
          setResults([]);
          return;
        }
        const data = (await res.json()) as { results: GeocodeResult[] };
        setResults(data.results);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  function selectResult(result: GeocodeResult) {
    setReverseFailed(false);
    setQuery(result.label);
    setResults([]);
    onChange({ lat: result.lat, lng: result.lng, label: result.label });
  }

  async function handlePin(coords: { lat: number; lng: number }) {
    setReverseFailed(false);
    onChange({ lat: coords.lat, lng: coords.lng, label: null });

    try {
      const res = await fetch(
        `/api/geocode/reverse?lat=${coords.lat}&lng=${coords.lng}`
      );
      if (!res.ok) {
        setReverseFailed(true);
        return;
      }
      const data = (await res.json()) as { label: string | null };
      if (!data.label) {
        setReverseFailed(true);
        return;
      }
      onChange({ lat: coords.lat, lng: coords.lng, label: data.label });
    } catch {
      setReverseFailed(true);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-brand-blueDark" htmlFor="meeting-search">
          Meeting point
        </label>
        <p className="text-xs text-brand-muted">
          Search for a place or drop a pin on the map.
        </p>
        <input
          id="meeting-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a location..."
          className="mt-2 w-full rounded-lg border border-brand-border bg-white px-3 py-2 text-sm text-brand-blueDark placeholder:text-brand-muted focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent"
        />
        {searching && <p className="mt-1 text-xs text-brand-muted">Searching...</p>}
        {results.length > 0 && (
          <ul className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-brand-border bg-white shadow-sm">
            {results.map((result) => (
              <li key={`${result.lat}-${result.lng}-${result.label}`}>
                <button
                  type="button"
                  onClick={() => selectResult(result)}
                  className="w-full px-3 py-2 text-left text-sm text-brand-blueDark hover:bg-brand-surface"
                >
                  {result.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {label && (
        <p className="text-sm text-brand-blueDark">
          <span className="font-medium">Selected:</span> {label}
        </p>
      )}
      {reverseFailed && !label && (
        <p className="text-sm text-brand-muted">Drop the pin on the map instead.</p>
      )}

      <div className="h-80 overflow-hidden rounded-xl border border-brand-border">
        <MeetingMapCanvas lat={lat} lng={lng} onPin={handlePin} />
      </div>
    </div>
  );
}
