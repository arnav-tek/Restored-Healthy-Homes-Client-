import Link from "next/link";
import type { PublishedContent } from "@/domain/site-content";
export function PlainContent({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .filter(Boolean)
        .map((part, i) =>
          part.startsWith("## ") ? (
            <h2 key={i}>{part.slice(3)}</h2>
          ) : (
            <p className="session-resource-paragraph" key={i}>
              {part}
            </p>
          ),
        )}
    </>
  );
}
// The same escaped text renderer is used by public content and authenticated previews.
export function ContentPreview({ content }: { content: PublishedContent }) {
  const f = content.fields;
  if (content.kind === "contact")
    return (
      <>
        <header className="public-page-intro">
          <div>
            <p className="public-eyebrow section-tag">Get in touch</p>
            <h1>{f.title}</h1>
          </div>
          <div className="public-intro-copy">
            <p>{f.summary}</p>
          </div>
        </header>
        <section className="contact-content">
          <div>
            <h2>General inquiries</h2>
            <PlainContent text={f.body} />
            <address>
              {f.email && (
                <p>
                  <a href={`mailto:${f.email}`}>{f.email}</a>
                </p>
              )}
              {f.phone && (
                <p>
                  <a href={`tel:${f.phone.replace(/[^+0-9]/g, "")}`}>
                    {f.phone}
                  </a>
                </p>
              )}
            </address>
          </div>
          <div>
            <h2>For Specialists</h2>
            <p>
              Explore membership pricing or submit an application to list your
              business.
            </p>
          </div>
        </section>
      </>
    );
  if (content.kind === "pathway")
    return (
      <article className="resource-article">
        <h2>{f.providerName}</h2>
        <p>{f.introduction}</p>
        <p>{f.kind}</p>
        <a href={f.providerUrl} target="_blank" rel="noopener noreferrer">
          External provider reference
        </a>
        <PlainContent text={f.description} />
        <h3>Entry requirements</h3>
        <PlainContent text={f.requirements} />
        <ol>
          {f.steps
            .split(/\r?\n/)
            .filter(Boolean)
            .map((s, i) => (
              <li key={i}>{s}</li>
            ))}
        </ol>
        <h3>Typical timeline</h3>
        <p>{f.timeline}</p>
        <h3>External program costs</h3>
        <p>{f.costs}</p>
        <p>
          Restored Healthy Homes does not issue certifications. Educational
          references do not verify listing credentials.
        </p>
      </article>
    );
  return (
    <article className="resource-article">
      <header>
        <h1>{f.title}</h1>
        <p className="resource-lead">{f.summary}</p>
      </header>
      {content.kind === "about" ? (
        <>
          <h2>Our company story</h2>
          <PlainContent text={f.story} />
          <h2>Our why</h2>
          <PlainContent text={f.why} />
          {f.videoSrc ? (
            <>
              <video
                controls
                preload="none"
                poster={f.posterSrc || undefined}
                className="about-video"
                aria-label="The Restored Healthy Homes story"
              >
                <source src={f.videoSrc} />
                <track
                  kind="captions"
                  src={f.captionsSrc}
                  srcLang="en"
                  label="English"
                  default
                />
              </video>
              <details>
                <summary>Video transcript</summary>
                <PlainContent text={f.transcript} />
              </details>
            </>
          ) : (
            <p>Company video is awaiting approved assets.</p>
          )}
        </>
      ) : (
        <PlainContent text={f.body} />
      )}{" "}
      {content.kind === "resource" && (
        <aside className="panel">
          <h2>Explore further</h2>
          <Link
            className="text-link"
            href={f.category === "professionals" ? "/education" : "/directory"}
          >
            {f.category === "professionals"
              ? "Explore education pathways"
              : "Find professionals"}
          </Link>
        </aside>
      )}
    </article>
  );
}
