import Link from 'next/link';
import Footer from '@/components/Footer';

const calculators = [
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
  {
    name: 'Pleated Filter',
    description: 'Predict pressure drop, optimal pleat count, and fractional efficiency for a pleated air filter (Sothen & Tatarchuk 2009).',
    href: '/calculators/pleated-filter-calculator',
    icon: '&#128168;',
    accent: 'card-accent-purple',
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
