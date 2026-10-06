import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Film } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { aboutContent as content } from "@/data/content/about";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Explore the purpose of Restored Healthy Homes and the specialties behind healthier homes.",
};
export default function AboutPage() {
  return (
    <div className="container about-page">
      <header className="about-introduction">
        <div>
          <p className="section-label">Restored Healthy Homes</p>
          <h1>About Us</h1>
        </div>
        <p className="about-lead">{content.introduction}</p>
      </header>
      <div className="about-story-media">
        <section className="about-story" aria-labelledby="about-story-heading">
          <p className="section-label">The story behind the name</p>
          <h2 id="about-story-heading">{content.story.heading}</h2>
          <p className="content-placeholder-label">{content.story.label}</p>
          <p>{content.story.body}</p>
        </section>
        <section
          className="about-video-section"
          aria-labelledby="about-video-heading"
        >
          <div>
            <h2 id="about-video-heading">{content.video.heading}</h2>
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
                <Film size={28} aria-hidden="true" />
                <h3>Company video to come</h3>
                <p>{content.video.placeholder}</p>
              </div>
            )}
            {content.video.transcript ? (
              <a className="text-link" href={content.video.transcript.href}>
                {content.video.transcript.label}
              </a>
            ) : null}
          </div>
        </section>
      </div>
      <section
        className="about-purpose"
        aria-labelledby="about-purpose-heading"
      >
        <div>
          <p className="section-label">Our purpose</p>
          <h2 id="about-purpose-heading">{content.purpose.heading}</h2>
        </div>
        <div>
          <p>{content.purpose.body}</p>
        </div>
      </section>
      <section
        className="about-closing"
        aria-labelledby="about-closing-heading"
      >
        <div>
          <p className="section-label">Start exploring</p>
          <h2 id="about-closing-heading">Find your starting point.</h2>
          <p>Discover the specialties and services for your next step.</p>
        </div>
        <div className="public-page-actions">
          <ButtonLink href="/directory">
            Browse professionals <ArrowRight size={18} aria-hidden="true" />
          </ButtonLink>
          <Link className="text-link" href="/list-your-business">
            List Your Business
          </Link>
        </div>
      </section>
    </div>
  );
}
