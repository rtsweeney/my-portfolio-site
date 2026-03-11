'use client';

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import type { LatLngTuple } from 'leaflet';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

interface TravelEntry {
  _id: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
  date: string;
  rating: number;
  description?: string;
  photos?: { asset: { _ref: string }; alt?: string }[];
}

function formatTravelDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="concert-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < rating ? 'var(--accent-gold)' : 'var(--border)' }}>★</span>
      ))}
    </div>
  );
}

// Child of MapContainer: reads selectedCity from props and calls flyTo via useMap()
// MUST be inside <MapContainer> JSX — useMap() requires the MapContainer context
function MapController({ selectedCity }: { selectedCity: TravelEntry | null }) {
  const map = useMap();
  useEffect(() => {
    if (selectedCity) {
      map.flyTo(
        [selectedCity.coordinates.lat, selectedCity.coordinates.lng],
        10,
        { animate: true, duration: 1.2 }
      );
    }
  }, [selectedCity, map]);
  return null;
}

export default function TravelMap({ entries }: { entries: TravelEntry[] }) {
  const [selectedCity, setSelectedCity] = useState<TravelEntry | null>(null);

  const defaultCenter: LatLngTuple = [20, 0];
  const defaultZoom = 2;

  return (
    <div className="travel-map-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ height: '500px', width: '100%' }}
        scrollWheelZoom={false}
        className="travel-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController selectedCity={selectedCity} />
        {entries.map((entry) => (
          <Marker
            key={entry._id}
            position={[entry.coordinates.lat, entry.coordinates.lng]}
            eventHandlers={{ click: () => setSelectedCity(entry) }}
          />
        ))}
      </MapContainer>

      {selectedCity && (
        <div className="travel-detail-card card">
          <button
            className="travel-detail-close"
            onClick={() => setSelectedCity(null)}
            aria-label="Close detail card"
          >
            ×
          </button>
          {selectedCity.photos && selectedCity.photos.length > 0 && (
            <div className="travel-card-photo-wrapper">
              <Image
                src={urlFor(selectedCity.photos[0]).width(700).height(400).fit('crop').url()}
                alt={selectedCity.photos[0].alt ?? selectedCity.city}
                width={700}
                height={400}
                className="travel-card-photo"
              />
            </div>
          )}
          <div className="travel-card-body">
            <div className="travel-card-header">
              <h2 className="travel-card-title">{selectedCity.city}</h2>
              <StarRating rating={selectedCity.rating} />
            </div>
            <p className="travel-card-meta">{selectedCity.country} · {formatTravelDate(selectedCity.date)}</p>
            {selectedCity.description && (
              <p className="travel-card-description">{selectedCity.description}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
