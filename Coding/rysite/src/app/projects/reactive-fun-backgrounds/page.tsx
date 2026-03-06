'use client';

import Link from 'next/link';
import Footer from '@/components/Footer';

export default function ReactiveFunBackgroundsPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div style={{ marginBottom: '1.5rem' }}>
          <Link href="/projects" style={{ textDecoration: 'none', color: 'var(--accent-color)' }}>
            &larr; Back to Projects
          </Link>
        </div>

        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Reactive Fun Backgrounds</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Pick a visual. Go fullscreen. Vibe.</p>
        </div>

        <div style={{ marginBottom: '2rem', padding: '1rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            A browser-based collection of reactive party visuals and animated screensavers. Select a visual from the gallery below, go fullscreen, and enjoy the show. Enable your microphone to sync animations to music and ambient sound.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-color)' }}>Canvas API</span>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-color)' }}>Web Audio API</span>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-color)' }}>Fullscreen API</span>
            <span style={{ padding: '0.3rem 0.7rem', background: 'rgba(120, 115, 245, 0.1)', border: '1px solid var(--accent-color)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--accent-color)' }}>Beat Detection</span>
          </div>
        </div>

        <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', marginBottom: '2rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          <iframe
            src="/visuals/reactive-fun-backgrounds/index.html"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 'none',
            }}
            title="Reactive Fun Backgrounds"
            allow="microphone; fullscreen"
          />
        </div>

        <div style={{ padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Features</h3>
          <ul style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginLeft: '1.5rem' }}>
            <li><strong>Multiple Visuals</strong> — Pixelated jellyfish aquarium and more coming soon</li>
            <li><strong>Fullscreen Mode</strong> — Dedicated immersive viewing</li>
            <li><strong>Microphone Reactive</strong> — Animations respond to sound, music, and ambient noise</li>
            <li><strong>Beat Detection</strong> — Real-time bass frequency analysis for kick detection</li>
            <li><strong>Responsive</strong> — Scales to any screen size, keyboard shortcuts (F, M, Esc)</li>
          </ul>
        </div>
      </div>

      <Footer />
    </main>
  );
}
