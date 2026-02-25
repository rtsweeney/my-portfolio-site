import Link from 'next/link';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Resume | Sweeney Town',
};

export default function ResumePage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Resume</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: '1.5rem' }}>
            Professional experience &amp; career journey
          </p>
          <Link
            href="/resume.pdf"
            target="_blank"
            download
            className="btn btn-primary"
            style={{ display: 'inline-block', marginBottom: '1rem' }}
          >
            Download PDF
          </Link>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>

          {/* Contact Header */}
          <div className="resume-contact-header">
            <h2 className="resume-name">Ryan Sweeney</h2>
            <p className="resume-contact-info">
              (201) 701-0637 &bull;{' '}
              <a href="mailto:rtsweeney01@gmail.com">rtsweeney01@gmail.com</a> &bull;{' '}
              <a href="https://www.linkedin.com/in/rtsweeney01" target="_blank" rel="noreferrer">
                linkedin.com/in/rtsweeney01
              </a>
            </p>
            <p className="resume-contact-info">Morristown, NJ 07960</p>
          </div>

          {/* Education */}
          <div className="resume-section">
            <h3 className="resume-section-heading">Education</h3>
            <div className="resume-timeline">
              <div className="resume-item">
                <div className="resume-date">Sep. 2015 &mdash; May 2019</div>
                <h4 className="resume-role">Bachelor of Science in Mechanical Engineering</h4>
                <p className="resume-company">
                  Rowan University &bull; <span style={{ color: 'var(--text-muted)' }}>Glassboro, NJ</span>
                </p>
              </div>
            </div>
          </div>

          {/* Experience */}
          <div className="resume-section">
            <h3 className="resume-section-heading">Experience</h3>
            <div className="resume-timeline">

              <div className="resume-item resume-item-current">
                <div className="resume-date">September 2022 &mdash; Present</div>
                <h4 className="resume-role">Product Development Engineer</h4>
                <p className="resume-company">
                  Camfil USA &bull; <span style={{ color: 'var(--text-muted)' }}>Riverdale, NJ</span>
                </p>
                <ul className="resume-description">
                  <li>Market-Driven Invention: Partner with segment managers on customer site visits to uncover opportunities, directly translating field observations into actionable design requirements for new product development.</li>
                  <li>Advanced Engineering Design: Create complex, production-ready 3D models in SolidWorks and Onshape, applying rigorous Design for Manufacturability (DFM) standards for plastic injection molding and sheet metal fabrication.</li>
                  <li>Infrastructure Development: Established and currently manage a specialized 3D printer farm (Modix Big Meter, SLA, FDM), building a permanent internal capability for large-format and high-fidelity modeling.</li>
                  <li>Rapid Prototyping: Accelerate iteration cycles by personally fabricating functional prototypes using 3D printing and laser-cut plastics, physically validating design concepts prior to tooling investment.</li>
                  <li>Manufacturing Integration: Coordinate directly with plant schedulers to commandeer mainline production equipment for trial runs, ensuring seamless transition from engineering prototype to mass-manufacturable product.</li>
                  <li>Lifecycle Ownership: Operate with high autonomy to drive projects from initial ideation through to commercial launch, independently managing all technical and logistical hurdles to ensure successful product release.</li>
                </ul>
              </div>

              <div className="resume-item">
                <div className="resume-date">June 2021 &mdash; September 2022</div>
                <h4 className="resume-role">Support Engineer</h4>
                <p className="resume-company">
                  OPEX Warehouse Automation &bull; <span style={{ color: 'var(--text-muted)' }}>Moorestown, NJ</span>
                </p>
                <ul className="resume-description">
                  <li>Design for Serviceability: Redesigned warehouse automation hardware with a specific focus on maintenance accessibility and operator ergonomics, incorporating direct feedback from field technicians to reduce service complexity.</li>
                  <li>On-Site Integration: Traveled to customer facilities to oversee critical system installations, serving as the technical bridge between design engineering and field service teams to resolve real-time implementation challenges.</li>
                  <li>System Reliability: Developed robust preventative maintenance schedules and optimized spare parts lists, ensuring consistent uptime for high-throughput warehouse automation systems.</li>
                  <li>Knowledge Management: Established and maintained a comprehensive wiki in Confluence while working with the technical writing team to refine manuals and installation guides.</li>
                </ul>
              </div>

              <div className="resume-item">
                <div className="resume-date">January 2020 &mdash; June 2021</div>
                <h4 className="resume-role">Process Engineer</h4>
                <p className="resume-company">
                  Phoenix Glass LLC &bull; <span style={{ color: 'var(--text-muted)' }}>Pittsgrove Township, NJ</span>
                </p>
                <ul className="resume-description">
                  <li>Sole Technical Lead: Served as the facility&apos;s only engineer for a 50-person team, holding responsibility for manufacturing process health, continuous improvement initiatives, and ISO 9001:2015 compliance.</li>
                  <li>Automation &amp; Vision: Doubled manufacturing throughput for COVID-19 test vials by designing, programming, and integrating a Cognex InSight machine vision system to automate critical tolerance inspections.</li>
                  <li>Equipment Modernization: Revitalized legacy equipment by creating digital twin CAD assemblies to reverse-engineer components, designing precision upgrades that digitized analog machine functions without extended downtime.</li>
                </ul>
              </div>

            </div>
          </div>

          {/* Interests & Proficiencies */}
          <div className="resume-section">
            <h3 className="resume-section-heading">Interests &amp; Proficiencies</h3>
            <div className="resume-interests">
              <p><strong>What I Enjoy:</strong> Hiking, camping, bouldering, skiing, painting, woodworking, chess, website development</p>
              <p><strong>Current Life Goals:</strong> Adopt a dog, finish a half-marathon under 2 hours, finish my website &ldquo;sweeney.town&rdquo;</p>
              <p><strong>Software:</strong> Solidworks (CSWP), Solidworks Flow Simulation, Onshape, SolidEdge, Excel, Cognex InSight, 3D Printing Slicers, Lightburn, EtherCAT, Photoshop, Antigravity, Confluence, Jira, LaTeX</p>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </main>
  );
}
