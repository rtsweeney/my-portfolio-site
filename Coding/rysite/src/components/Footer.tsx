import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-socials">
        <a href="https://www.linkedin.com/in/rtsweeney01/" target="_blank" rel="noopener noreferrer" className="footer-social-link">
          <Image src="/linkedin.png" alt="LinkedIn" width={20} height={20} />
        </a>
        <a href="https://github.com/rtsweeney" target="_blank" rel="noopener noreferrer" className="footer-social-link">
          <Image src="/github.png" alt="GitHub" width={20} height={20} />
        </a>
      </div>
      <p className="footer-text">
        Built by <a href="https://github.com/rtsweeney">Ryan Sweeney</a> &mdash; sweeney.town
      </p>
    </footer>
  );
}
