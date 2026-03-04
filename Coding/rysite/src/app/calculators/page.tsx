import Link from 'next/link';
import Footer from '@/components/Footer';

const calculators = [
  {
    name: 'Machine-Vision Media Area',
    description: 'Photograph a pleated filter panel — auto-counts pleats and calculates useable media area and pleats per inch.',
    href: '/calculators/filter-pleat-counter',
    icon: '&#128247;',
    accent: 'card-accent-teal',
  },
  {
    name: 'Beers Per Beer',
    description: 'Find out how many standard beers (4.2%, 12 oz) are in any beverage by ABV and volume.',
    href: '/calculators/beers-per-beer',
    icon: '&#127866;',
    accent: 'card-accent-gold',
  },
  {
    name: 'Unit Converter',
    description: 'Convert between common units of length, weight, temperature, and more.',
    href: '/calculators/unit-converter',
    icon: '&#128207;',
    accent: 'card-accent-purple',
  },
  {
    name: 'Air Density',
    description: 'Calculate the density of air from temperature, relative humidity, and altitude using the ISA atmosphere model.',
    href: '/calculators/air-density',
    icon: '&#127756;',
    accent: 'card-accent-pink',
  },
];

export default function CalculatorsPage() {
  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <h1 className="section-title">
            <span className="gradient-text">Calculators</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Handy tools and converters &mdash; more added over time
          </p>
        </div>

        <div className="calculator-list-grid">
          {calculators.map((calc) => (
            <Link key={calc.href} href={calc.href} style={{ textDecoration: 'none' }}>
              <div className={`card ${calc.accent}`}>
                <div
                  className="home-card-icon"
                  dangerouslySetInnerHTML={{ __html: calc.icon }}
                />
                <h3 className="home-card-title">{calc.name}</h3>
                <p className="home-card-desc">{calc.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  );
}
