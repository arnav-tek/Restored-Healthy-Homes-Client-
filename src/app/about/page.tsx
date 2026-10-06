import type { Metadata } from "next";
import { Film } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { aboutContent as content } from "@/data/content/about";

export const metadata: Metadata = {
  title: "About Us | Demo preview",
  description:
    "Explore the purpose of Restored Healthy Homes and preview the space for the client’s company story and video.",
};
export default function AboutPage() {
  return (
    <div className="container about-page">
      <header className="about-introduction">
        <p className="section-label">Restored Healthy Homes</p>
        <h1>About Us</h1>
        <p>{content.introduction}</p>
        <p className="field-help">
          Demo page. The layout is ready for review; final company story, copy
          and video are still to come.
        </p>
      </header>
      <div className="about-story-grid">
        {[content.story, content.purpose].map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            <p className="content-placeholder-label">{section.label}</p>
            <p>{section.body}</p>
          </section>
        ))}
      </div>
      <section
        className="about-video-section"
        aria-labelledby="about-video-heading"
      >
        <div>
          <h2 id="about-video-heading">{content.video.heading}</h2>
          <p>
            A dedicated space for the client’s video, with captions and a
            transcript when supplied.
          </p>
        </div>
        <div>
          {content.video.src ? (
            <video
              controls
              preload="none"
              poster={content.video.poster ?? undefined}
              aria-label="The Restored Healthy Homes story"
              className="about-video"
            >
              <source src={content.video.src} />
              {content.video.captions && (
                <track
                  kind="captions"
                  src={content.video.captions.src}
                  srcLang={content.video.captions.language}
                  label={content.video.captions.label}
                  default
                />
              )}
            </video>
          ) : (
            <div
              className="about-video-placeholder"
              data-testid="about-video-placeholder"
            >
              <Film size={32} aria-hidden="true" />
              <h3>Company video to come</h3>
              <p>{content.video.placeholder}</p>
            </div>
          )}
          {content.video.transcript ? (
            <a className="text-link" href={content.video.transcript.href}>
              {content.video.transcript.label}
            </a>
          ) : (
            <p className="field-help about-video-note">
              Captions and transcript awaiting client assets.
            </p>
          )}
        </div>
      </section>
      <section
        className="about-closing"
        aria-labelledby="about-closing-heading"
      >
        <h2 id="about-closing-heading">Find your starting point.</h2>
        <p>
          Explore a specialty for your home, or see how your business could be
          listed.
        </p>
        <div className="public-page-actions">
          <ButtonLink href="/directory">Browse professionals</ButtonLink>
          <ButtonLink className="button-secondary" href="/list-your-business">
            List Your Business
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
