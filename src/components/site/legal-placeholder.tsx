import Link from "next/link";
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="container public-content-page resources-page">
      <header className="public-page-intro" data-scroll-reveal>
        <div>
          <p className="public-eyebrow section-tag">Awaiting client approval</p>
          <h1>{title}</h1>
        </div>
        <div className="public-intro-copy">
          <p>Client-approved legal wording will appear here before launch.</p>
        </div>
      </header>
      <section className="panel resource-article" data-scroll-reveal>
        <h2>Content pending</h2>
        <p>
          The final text and disclaimer placement are still to be supplied and
          approved. This placeholder is not a published policy.
        </p>
        <p>
          Forms currently offer a local preview. They do not create real
          accounts, payments, email delivery or newsletter subscriptions.
        </p>
        <Link className="text-link" href="/contact">
          Contact information
        </Link>
      </section>
    </div>
  );
}
