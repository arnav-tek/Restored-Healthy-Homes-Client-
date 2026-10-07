import Link from "next/link";
import { Brand } from "./brand";
import { FooterNewsletter } from "./footer-newsletter";

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
          <Link href="/directory">Find professionals</Link>
          <Link href="/questions">Ask a Specialist</Link>
          <Link href="/consultations">Consultations</Link>
          <Link href="/education">Education</Link>
          <Link href="/about">About Us</Link>
        </div>

        <div className="footer-links-col">
          <h2>For professionals</h2>
          <Link href="/pricing">Membership pricing</Link>
          <Link href="/list-your-business">List Your Business</Link>
          <Link href="/login">Sign in</Link>
          <Link href="/demo/member">Member area</Link>
          <Link href="/demo/admin">Admin area</Link>
        </div>

        <div className="footer-connect-col">
          <h2>Stay connected</h2>
          <p className="footer-connect-copy">
            Receive guidance and directory updates for healthier homes.
          </p>
          <FooterNewsletter />
          <div className="footer-social-links" aria-label="Social media links">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Restored Healthy Homes on Instagram"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
              </svg>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Restored Healthy Homes on LinkedIn"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                <rect width="4" height="12" x="2" y="9" />
                <circle cx="4" cy="4" r="2" />
              </svg>
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-social-link"
              aria-label="Restored Healthy Homes on Facebook"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
              </svg>
            </a>
          </div>
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
    </footer>
  );
}
