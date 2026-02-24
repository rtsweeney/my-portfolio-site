import { safeFetch } from '@/sanity/lib/client';
import { PortableText } from 'next-sanity';
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

export default async function ProjectsPage() {
  const projects = await safeFetch(PROJECTS_QUERY, []);

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

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128736;</div>
            <h3 className="empty-state-title">No projects yet</h3>
            <p className="empty-state-text">
              Visit <a href="/studio">/studio</a> to add your first project.
            </p>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project: any) => (
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
        )}
      </div>

      <Footer />
    </main>
  );
}
