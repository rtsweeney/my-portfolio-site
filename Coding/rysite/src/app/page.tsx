import Link from 'next/link';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main>
      <div className="page-bg" />

      {/* Hero */}
      <section className="hero">
        <p className="hero-tagline animate-in animate-delay-1">Welcome to</p>
        <h1 className="hero-title animate-in animate-delay-2">
          <span className="gradient-text">sweeney.town</span>
        </h1>
        <p className="hero-subtitle animate-in animate-delay-3">
          Concerts I&apos;ve been to. Places I&apos;ve traveled. Projects I&apos;ve built.
          My resume, too &mdash; but honestly the other stuff is more fun.
        </p>
        <div className="hero-cta-group animate-in animate-delay-4">
          <Link href="/projects" className="btn btn-primary">See My Projects</Link>
          <Link href="/resume" className="btn btn-secondary">View Resume</Link>
        </div>
      </section>

      {/* Section Cards */}
      <section className="container" style={{ paddingBottom: '4rem' }}>
        <h2 className="section-title" style={{ textAlign: 'center' }}>What&apos;s Here</h2>
        <p className="section-subtitle" style={{ textAlign: 'center' }}>
          Everything I&apos;m working on, thinking about, or building.
        </p>

        <div className="home-grid">
          <Link href="/projects" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-purple">
              <div className="home-card-icon">&#128736;</div>
              <h3 className="home-card-title">Projects</h3>
              <p className="home-card-desc">
                Personal and professional projects I&apos;ve built or am working on. Code, design, and everything in between.
              </p>
            </div>
          </Link>

          <Link href="/resume" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-teal">
              <div className="home-card-icon">&#128196;</div>
              <h3 className="home-card-title">Resume</h3>
              <p className="home-card-desc">
                My professional experience, skills, and career journey laid out in a clean digital format.
              </p>
            </div>
          </Link>

          <Link href="/concerts" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-pink">
              <div className="home-card-icon">&#127925;</div>
              <h3 className="home-card-title">Concerts</h3>
              <p className="home-card-desc">
                Shows I&apos;ve attended, rated and reviewed. From dive bars to arenas.
              </p>
            </div>
          </Link>

          <Link href="/travel" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-orange">
              <div className="home-card-icon">&#127758;</div>
              <h3 className="home-card-title">Travel</h3>
              <p className="home-card-desc">
                Cities and countries I&apos;ve visited, mapped out with photos and notes.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
