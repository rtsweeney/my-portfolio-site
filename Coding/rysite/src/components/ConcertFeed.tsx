'use client';

import { useState } from 'react';
import Image from 'next/image';
import { urlFor } from '@/sanity/lib/image';

interface ConcertPhoto {
  asset: { _ref: string };
  alt?: string;
}

interface Concert {
  _id: string;
  title: string;
  date: string;
  venue: string;
  rating: number;
  caption?: string;
  photos?: ConcertPhoto[];
}

type SortKey = 'date' | 'rating';

interface ConcertFeedProps {
  concerts: Concert[];
}

function formatConcertDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

export default function ConcertFeed({ concerts }: ConcertFeedProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');

  const sorted = sortKey === 'rating'
    ? [...concerts].sort((a, b) => b.rating - a.rating)
    : concerts; // 'date' order comes from GROQ — no re-sort needed

  return (
    <>
      <div className="concert-sort-bar">
        <button
          className={`btn btn-secondary${sortKey === 'date' ? ' active' : ''}`}
          onClick={() => setSortKey('date')}
        >
          Chronological
        </button>
        <button
          className={`btn btn-secondary${sortKey === 'rating' ? ' active' : ''}`}
          onClick={() => setSortKey('rating')}
        >
          Top Rated
        </button>
      </div>

      <div className="concert-grid">
        {sorted.map((concert) => (
          <article key={concert._id} className="card concert-card">
            {concert.photos && concert.photos.length > 0 && (
              <div className="concert-photo-wrapper">
                <Image
                  src={urlFor(concert.photos[0]).width(600).height(400).fit('crop').url()}
                  alt={concert.photos[0].alt ?? concert.title}
                  width={600}
                  height={400}
                  className="concert-photo"
                />
              </div>
            )}
            <div className="concert-card-body">
              <div className="concert-card-header">
                <h2 className="concert-title">{concert.title}</h2>
                <StarRating rating={concert.rating} />
              </div>
              <p className="concert-meta">{concert.venue} · {formatConcertDate(concert.date)}</p>
              {concert.caption && <p className="concert-caption">{concert.caption}</p>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
