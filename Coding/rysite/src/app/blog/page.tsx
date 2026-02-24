import { client } from '@/sanity/lib/client';
import { PortableText } from 'next-sanity';
import Footer from '@/components/Footer';

const BLOG_QUERY = `*[_type == "blogPost"] | order(date desc) {
  _id,
  title,
  date,
  tag,
  body
}`;

export const revalidate = 60;

const TAG_CLASS_MAP: Record<string, string> = {
  update: 'blog-tag-update',
  project: 'blog-tag-project',
  personal: 'blog-tag-personal',
  milestone: 'blog-tag-milestone',
};

function formatBlogDate(dateStr: string) {
  if (!dateStr) return { month: '', day: '', year: '' };
  const d = new Date(dateStr + 'T00:00:00');
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: String(d.getDate()),
    year: String(d.getFullYear()),
  };
}

export default async function BlogPage() {
  const posts = await client.fetch(BLOG_QUERY);

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Life Updates</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            What&apos;s going on, what I&apos;m thinking about, and milestones along the way
          </p>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">&#128221;</div>
            <h3 className="empty-state-title">No posts yet</h3>
            <p className="empty-state-text">
              Visit <a href="/studio">/studio</a> to write your first life update.
            </p>
          </div>
        ) : (
          <div className="blog-grid" style={{ maxWidth: '800px', margin: '0 auto' }}>
            {posts.map((post: any) => {
              const { month, day, year } = formatBlogDate(post.date);
              const tagClass = TAG_CLASS_MAP[post.tag] || 'blog-tag-update';

              return (
                <article key={post._id} className="blog-card card" style={{ borderRadius: 'var(--radius-lg)', padding: '1.75rem' }}>
                  <div className="blog-date">
                    <div className="blog-date-month">{month}</div>
                    <div className="blog-date-day">{day}</div>
                    <div className="blog-date-year">{year}</div>
                  </div>
                  <div className="blog-content">
                    {post.tag && (
                      <span className={`blog-tag ${tagClass}`}>{post.tag}</span>
                    )}
                    <h2 className="blog-title">{post.title}</h2>
                    {post.body && (
                      <div className="blog-excerpt">
                        <PortableText value={post.body} />
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
