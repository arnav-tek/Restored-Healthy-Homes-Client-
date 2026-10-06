import Link from "next/link";
import { Brand } from "./brand";
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Brand />
          <p>
            Thoughtful connections.
            <br />
            Healthier places to call home.
          </p>
        </div>
        <div>
          <h2>Explore</h2>
          <Link href="/directory">Professional directory</Link>
          <Link href="/questions">Ask a Specialist</Link>
          <Link href="/consultations">Consultations</Link>
          <Link href="/about">About Us</Link>
        </div>
        <div>
          <h2>For professionals</h2>
          <Link href="/list-your-business">List Your Business</Link>
          <Link href="/login">Demo sign-in</Link>
          <Link href="/demo/member">Member area</Link>
          <Link href="/demo/admin">Admin area</Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Restored Healthy Homes</span>
        <span>
          Demo preview · Fictional businesses. Forms are not delivered or saved
          permanently.
        </span>
      </div>
    </footer>
  );
}
