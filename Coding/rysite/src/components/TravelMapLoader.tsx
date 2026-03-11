'use client';

import dynamic from 'next/dynamic';

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

const TravelMap = dynamic(() => import('@/components/TravelMap'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map…</div>,
});

export default function TravelMapLoader({ entries }: { entries: TravelEntry[] }) {
  return <TravelMap entries={entries} />;
}
