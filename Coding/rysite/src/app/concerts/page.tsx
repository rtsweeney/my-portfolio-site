import { safeFetch } from '@/sanity/lib/client';
import Link from 'next/link';
import Footer from '@/components/Footer';
import ConcertFeed from '@/components/ConcertFeed';

export const revalidate = 60;

export interface ConcertPhoto {
  asset: { _ref: string };
  alt?: string;
}

export interface Concert {
  _id: string;
  title: string;
  date: string;
  venue: string;
  rating: number;
  caption?: string;
  photos?: ConcertPhoto[];
}

const CONCERTS_QUERY = `*[_type == "concert"] | order(date desc) {
  _id,
  title,
  date,
  venue,
  rating,
  caption,
  photos[] {
    asset,
    alt
  }
}`;

export default async function ConcertsPage() {
  const concerts = await safeFetch<Concert[]>(CONCERTS_QUERY, []);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Concerts</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Shows Ryan has attended, rated and reviewed
          </p>
        </div>

        {concerts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#127928;</div>
            <h3 className="empty-state-title">No concerts yet</h3>
            <p className="empty-state-text">
              Visit <Link href="/studio">/studio</Link> to add your first concert.
            </p>
          </div>
        ) : (
          <ConcertFeed concerts={concerts} />
        )}
      </div>

      <Footer />
    </main>
  );
}
