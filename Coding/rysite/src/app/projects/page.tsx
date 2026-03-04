import { safeFetch } from '@/sanity/lib/client';
import { PortableText } from 'next-sanity';
import type { PortableTextBlock } from 'next-sanity';
import Link from 'next/link';
import Footer from '@/components/Footer';

const PROJECTS_QUERY = `*[_type == "project"] | order(date desc) {
  _id,
  title,
  description,
  techStack,
  liveUrl,
  repoUrl,
  date
}`;

export const revalidate = 60;

interface Project {
  _id: string;
  title: string;
  description: PortableTextBlock[];
  techStack: string[];
  liveUrl: string;
  repoUrl: string;
  date: string;
}

export default async function ProjectsPage() {
  const projects = await safeFetch<Project[]>(PROJECTS_QUERY, []);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Projects</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Things I&apos;ve built, am building, or am tinkering with</p>
        </div>

        <div className="projects-grid">
          {/* Machine Vision Pleat Counting — built-in project */}
          <Link href="/projects/pleat-counter" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-teal" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#128247;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Machine Vision Pleat Counting
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>Photograph a pleated filter panel and let the browser do the rest — auto-detects the panel boundary, counts pleats via edge-frequency analysis, and calculates useable media area and pleats per inch. No server, no ML model, pure canvas.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Computer Vision</span>
                <span className="project-tech-tag">Canvas API</span>
                <span className="project-tech-tag">Next.js</span>
                <span className="project-tech-tag">Mobile Camera</span>
              </div>
              <div className="project-links">
                <span className="project-link">Open &rarr;</span>
              </div>
            </div>
          </Link>

          {/* Planetarium — built-in interactive project */}
          <Link href="/planetarium" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card card-accent-purple" style={{ height: '100%', cursor: 'pointer' }}>
              <div className="project-card-header">
                <div className="project-card-icon">&#127776;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Planetarium
              </h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                <p>An interactive star map dashboard. See what&apos;s in the sky tonight based on your location, pick a constellation, and find out exactly where to look.</p>
              </div>
              <div className="project-tech-tags">
                <span className="project-tech-tag">Astronomy</span>
                <span className="project-tech-tag">Canvas</span>
                <span className="project-tech-tag">Geolocation</span>
                <span className="project-tech-tag">Next.js</span>
              </div>
              <div className="project-links">
                <span className="project-link">
                  Open &rarr;
                </span>
              </div>
            </div>
          </Link>

          {/* Sanity-managed projects */}
          {projects.map((project) => (
            <div key={project._id} className="card">
              <div className="project-card-header">
                <div className="project-card-icon">&#128187;</div>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {project.title}
              </h3>
              {project.description && (
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.7 }}>
                  <PortableText value={project.description} />
                </div>
              )}
              {project.techStack && project.techStack.length > 0 && (
                <div className="project-tech-tags">
                  {project.techStack.map((tech: string) => (
                    <span key={tech} className="project-tech-tag">{tech}</span>
                  ))}
                </div>
              )}
              {(project.liveUrl || project.repoUrl) && (
                <div className="project-links">
                  {project.liveUrl && (
                    <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                      Live &rarr;
                    </a>
                  )}
                  {project.repoUrl && (
                    <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="project-link">
                      Source &rarr;
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
