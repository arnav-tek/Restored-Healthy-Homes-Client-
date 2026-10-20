import Link from "next/link";
import { Brand } from "./brand";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand-col">
          <Brand />
          <p className="footer-tagline">
            Thoughtful connections.
            <br />
            Healthier places to call home.
          </p>
        </div>

        <div className="footer-links-col">
          <h2>Explore</h2>
          <Link href="/directory">Find Specialists</Link>
          <Link href="/questions">Ask a Specialist</Link>
          <Link href="/consultations">Consultations</Link>
          <Link href="/education">Certifications</Link>
          <Link href="/resources">Resources</Link>
          <Link href="/about">About Us</Link>
        </div>

        <div className="footer-links-col">
          <h2>For Specialists</h2>
          <Link href="/pricing">Membership pricing</Link>
          <Link href="/list-your-business">List Your Business</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/demo/member">Member area</Link>
        </div>

        <div className="footer-connect-col">
          <h2>Your next step</h2>
          <p className="footer-connect-copy">
            Explore specialties, compare profiles and prepare your questions.
          </p>
          <Link className="text-link" href="/directory">
            Explore the directory <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Restored Healthy Homes</span>
        <div className="footer-legal-links">
          <Link href="/terms">Terms</Link>
          <span className="footer-legal-sep" aria-hidden="true">
            ·
          </span>
          <Link href="/privacy">Privacy</Link>
          <span className="footer-legal-sep" aria-hidden="true">
            ·
          </span>
          <Link href="/contact">Contact</Link>
        </div>
      </div>
      <p className="container preview-notice">
        Client preview · fictional listings and local demo workflows. Changes
        clear when this tab is reloaded.
      </p>
    </footer>
  );
}
