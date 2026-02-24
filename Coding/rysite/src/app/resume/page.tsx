import { safeFetch } from '@/sanity/lib/client';
import { PortableText } from 'next-sanity';
import Footer from '@/components/Footer';

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

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default async function ResumePage() {
  const resume = await safeFetch(RESUME_QUERY, []);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Resume</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>Professional experience &amp; career journey</p>
        </div>

        {resume.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128188;</div>
            <h3 className="empty-state-title">No experience added yet</h3>
            <p className="empty-state-text">
              Visit <a href="/studio">/studio</a> to add your resume entries.
            </p>
          </div>
        ) : (
          <div className="resume-timeline" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {resume.map((job: any) => (
              <div
                key={job._id}
                className={`resume-item ${job.isCurrent ? 'resume-item-current' : ''}`}
              >
                <div className="resume-date">
                  {formatDate(job.startDate)} &mdash; {job.isCurrent ? 'Present' : formatDate(job.endDate)}
                </div>
                <h3 className="resume-role">{job.title}</h3>
                <p className="resume-company">
                  {job.company}
                  {job.location && <span style={{ color: 'var(--text-muted)' }}> &bull; {job.location}</span>}
                </p>
                {job.description && (
                  <div className="resume-description">
                    <PortableText value={job.description} />
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
