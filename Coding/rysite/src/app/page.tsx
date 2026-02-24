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
          A little corner of the internet for projects, ideas, tools, and life updates.
          Poke around &mdash; there&apos;s always something new.
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

          <Link href="/blog" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-pink">
              <div className="home-card-icon">&#128221;</div>
              <h3 className="home-card-title">Life Updates</h3>
              <p className="home-card-desc">
                A blog-style feed of what&apos;s going on &mdash; milestones, thoughts, and things I want to share.
              </p>
            </div>
          </Link>

          <Link href="/calculators" style={{ textDecoration: 'none' }}>
            <div className="card card-accent-gold">
              <div className="home-card-icon">&#129518;</div>
              <h3 className="home-card-title">Calculators</h3>
              <p className="home-card-desc">
                Handy tools and calculators I&apos;ve made. Unit converters, financial tools, and more to come.
              </p>
            </div>
          </Link>
        </div>
      </section>

      <Footer />
    </main>
  );
}
