'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

const calculators = [
  { name: 'Beers Per Beer', href: '/calculators/beers-per-beer', subtitle: 'Standard beers in any drink' },
  { name: 'Unit Converter', href: '/calculators/unit-converter', subtitle: 'Length, weight, temp & more' },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="nav-brand">
          <span className="gradient-text">sweeney.town</span>
        </Link>

        <button
          className="nav-mobile-toggle"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className={`nav-links ${mobileOpen ? 'open' : ''}`}>
          <Link href="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            Home
          </Link>
          <Link href="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`}>
            Projects
          </Link>
          <Link href="/resume" className={`nav-link ${isActive('/resume') ? 'active' : ''}`}>
            Resume
          </Link>
          <Link href="/blog" className={`nav-link ${isActive('/blog') ? 'active' : ''}`}>
            Life Updates
          </Link>

          <div className="nav-dropdown">
            <span className={`nav-link nav-dropdown-trigger ${pathname.startsWith('/calculators') ? 'active' : ''}`}>
              Calculators <ChevronDown size={14} />
            </span>
            <div className="nav-dropdown-menu">
              <Link href="/calculators" className="nav-dropdown-item">
                <div>All Calculators</div>
                <div className="item-subtitle">Browse the collection</div>
              </Link>
              {calculators.map((calc) => (
                <Link key={calc.href} href={calc.href} className="nav-dropdown-item">
                  <div>{calc.name}</div>
                  <div className="item-subtitle">{calc.subtitle}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="nav-socials">
            <a href="https://www.linkedin.com/in/rtsweeney01/" target="_blank" rel="noopener noreferrer" className="nav-social-link">
              <Image src="/linkedin.png" alt="LinkedIn" width={20} height={20} />
            </a>
            <a href="https://github.com/rtsweeney" target="_blank" rel="noopener noreferrer" className="nav-social-link">
              <Image src="/GitHub.png" alt="GitHub" width={20} height={20} />
            </a>
            <a href="https://letterboxd.com/Sweeneyr3/" target="_blank" rel="noopener noreferrer" className="nav-social-link">
              <Image src="/Letterboxd.png" alt="Letterboxd" width={20} height={20} />
            </a>
            <a href="https://www.chess.com/member/sweenayy" target="_blank" rel="noopener noreferrer" className="nav-social-link">
              <Image src="/chess.png" alt="Chess.com" width={20} height={20} />
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
