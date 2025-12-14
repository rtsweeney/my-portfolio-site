import { client } from "@/sanity/lib/client";
import { PortableText } from "next-sanity";
import Image from "next/image";
import { urlFor } from "@/sanity/lib/image";

// GROQ Queries
const RESUME_QUERY = `*[_type == "resume"] | order(startDate desc) {
  _id,
  title,
  company,
  startDate,
  endDate,
  isCurrent,
  description,
  location
}`;

const PHOTOS_QUERY = `*[_type == "photo"] | order(dateTaken desc) {
  _id,
  title,
  image
}`;

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const resume = await client.fetch(RESUME_QUERY);
  const photos = await client.fetch(PHOTOS_QUERY);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed Header */}
      <header style={{
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <h1 className="gradient-text" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Sweeney.town</h1>
        <nav style={{ display: 'flex', gap: '2rem', fontSize: '0.95rem' }}>
          <a href="#resume" style={{ color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>Resume</a>
          <a href="#photos" style={{ color: 'var(--foreground)', textDecoration: 'none', transition: 'color 0.2s' }}>Photos</a>
          <a href="/studio" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>Admin</a>
        </nav>
      </header>

      {/* Hero Section - Takes up ~2/3 of viewport */}
      <section style={{
        minHeight: '66vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem'
      }}>
        <p style={{
          color: '#a1a1aa',
          fontSize: '1rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '1rem',
          fontWeight: 300
        }}>
          This page is for
        </p>
        <h2 style={{
          fontSize: 'clamp(4rem, 10vw, 8rem)',
          fontWeight: 900,
          lineHeight: 1,
          margin: 0
        }}>
          <span className="gradient-text">Ryan Sweeney</span>
        </h2>
      </section>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', width: '100%' }}>

        {/* Resume Section */}
        <section id="resume" style={{ marginBottom: '8rem' }}>
          <h3 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Experience</h3>

          {resume.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ color: '#a1a1aa' }}>No resume items found.</p>
              <p>Go to <a href="/studio" style={{ color: 'var(--primary)' }}>/studio</a> to add your experience.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
              {resume.map((job: any) => (
                <article key={job._id} className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h4 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{job.title}</h4>
                    <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                      {job.startDate} — {job.isCurrent ? 'Present' : job.endDate}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.1rem', color: '#e5e5e5', marginBottom: '1rem' }}>
                    {job.company} {job.location && <span style={{ color: '#737373' }}>• {job.location}</span>}
                  </div>
                  <div style={{ color: '#a1a1aa', lineHeight: 1.6 }}>
                    {job.description && <PortableText value={job.description} />}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Photos Section */}
        <section id="photos" style={{ marginBottom: '4rem' }}>
          <h3 style={{ fontSize: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Gallery</h3>

          {photos.length === 0 ? (
            <div className="glass" style={{ padding: '2rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <p style={{ color: '#a1a1aa' }}>No photos uploaded yet.</p>
              <p>Visit <a href="/studio" style={{ color: 'var(--primary)' }}>/studio</a> to upload some shots.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem' }}>
              {photos.map((photo: any) => (
                <div key={photo._id} className="glass" style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  {photo.image && (
                    <div style={{ position: 'relative', height: '300px', width: '100%' }}>
                      <Image
                        src={urlFor(photo.image).width(800).url()}
                        alt={photo.title || 'Gallery Image'}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                  {photo.title && (
                    <div style={{ padding: '1rem' }}>
                      <p style={{ fontWeight: 500 }}>{photo.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
