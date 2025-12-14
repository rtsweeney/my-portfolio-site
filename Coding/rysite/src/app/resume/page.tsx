import { client } from "@/sanity/lib/client";
import { PortableText } from "next-sanity";
import Link from "next/link";
import Image from "next/image";

// GROQ Query
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

export const revalidate = 60;

export default async function ResumePage() {
    const resume = await client.fetch(RESUME_QUERY);

    return (
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid var(--border)'
            }}>
                <Link href="/" style={{ color: 'var(--foreground)', textDecoration: 'none', fontSize: '0.95rem' }}>← Back to Home</Link>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <a href="https://www.linkedin.com/in/rtsweeney01/" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.8 }}>
                        <Image src="/linkedin.png" alt="LinkedIn" width={24} height={24} />
                    </a>
                    <a href="https://github.com/rtsweeney" target="_blank" rel="noopener noreferrer" style={{ opacity: 0.8 }}>
                        <Image src="/github.png" alt="GitHub" width={24} height={24} />
                    </a>
                </div>
            </header>

            <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem', width: '100%' }}>
                {/* Resume Header */}
                <div style={{ marginBottom: '4rem', textAlign: 'center' }}>
                    <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 900, marginBottom: '0.5rem' }}>
                        <span className="gradient-text">Ryan Sweeney</span>
                    </h1>
                    <p style={{ color: '#a1a1aa', fontSize: '1.1rem' }}>Professional Experience</p>
                </div>

                {/* Experience Section */}
                <section>
                    {resume.length === 0 ? (
                        <div className="glass" style={{ padding: '3rem', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <p style={{ color: '#a1a1aa', marginBottom: '1rem' }}>No resume items found.</p>
                            <p>Visit <a href="/studio" style={{ color: 'var(--primary)' }}>/studio</a> to add your experience.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                            {resume.map((job: any) => (
                                <article key={job._id} className="glass" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>{job.title}</h2>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '1rem' }}>
                                            <p style={{ fontSize: '1.1rem', color: '#e5e5e5' }}>
                                                {job.company} {job.location && <span style={{ color: '#737373' }}>• {job.location}</span>}
                                            </p>
                                            <span style={{ color: 'var(--primary)', fontWeight: 500 }}>
                                                {job.startDate} — {job.isCurrent ? 'Present' : job.endDate}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ color: '#a1a1aa', lineHeight: 1.7, fontSize: '1rem' }}>
                                        {job.description && <PortableText value={job.description} />}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}
