import Link from 'next/link';
import Footer from '@/components/Footer';
import { safeFetch } from '@/sanity/lib/client';
import TravelMapLoader from '@/components/TravelMapLoader';

export const revalidate = 60;

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

const TRAVEL_QUERY = `*[_type == "travel"] | order(date desc) {
  _id,
  city,
  country,
  "coordinates": { "lat": coordinates.lat, "lng": coordinates.lng },
  date,
  rating,
  description,
  photos[] { asset, alt }
}`;

export default async function TravelPage() {
  const entries = await safeFetch<TravelEntry[]>(TRAVEL_QUERY, []);

  return (
    <main>
      <div className="page-bg" />
      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Travel</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Cities Ryan has personally visited
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#127758;</div>
            <h3 className="empty-state-title">No travel entries yet</h3>
            <p className="empty-state-text">
              Visit <Link href="/studio">/studio</Link> to add your first city.
            </p>
          </div>
        ) : (
          <TravelMapLoader entries={entries} />
        )}
      </div>
      <Footer />
    </main>
  );
}
