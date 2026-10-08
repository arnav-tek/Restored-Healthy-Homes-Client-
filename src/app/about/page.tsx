import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  FileText,
  Home,
  Play,
  Shield,
  Users,
} from "lucide-react";
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
      {/* Accessible h1 for screen readers and strict heading level 1 test */}
      <h1 className="sr-only">About Us</h1>

      {/* Hero Section */}
      <section className="about-hero" aria-labelledby="about-hero-title">
        <div className="about-hero-grid">
          <div className="about-hero-content">
            <div className="about-eyebrow">
              <span className="about-eyebrow-text">
                ABOUT RESTORED HEALTHY HOMES
              </span>
              <span className="about-eyebrow-dash" aria-hidden="true" />
            </div>
            <h2 id="about-hero-title" className="about-hero-title">
              A healthier home starts with the{" "}
              <span className="about-hero-accent">right people.</span>
            </h2>
            <p className="about-hero-lead">
              Restored Healthy Homes connects homeowners, businesses and property
              professionals with trusted experts in healthy-home services,
              education and solutions.
            </p>
            <div className="about-hero-actions">
              <ButtonLink
                href="/directory"
                aria-label="Browse verified professionals"
                className="about-hero-primary-btn"
              >
                Browse professionals <ArrowRight size={18} aria-hidden="true" />
              </ButtonLink>
              <a href="#story" className="about-hero-secondary-btn">
                Our story <ArrowDown size={18} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="about-hero-sidebar">
            <div className="about-hero-card">
              <div className="hero-benefit-row">
                <div className="benefit-icon-badge" aria-hidden="true">
                  <Users size={22} />
                </div>
                <div className="benefit-content">
                  <h3 className="benefit-title">Trusted Professionals</h3>
                  <p className="benefit-desc">
                    Connect with qualified experts across a range of
                    healthy-home specialties.
                  </p>
                </div>
              </div>
              <div className="hero-benefit-row">
                <div className="benefit-icon-badge" aria-hidden="true">
                  <FileText size={22} />
                </div>
                <div className="benefit-content">
                  <h3 className="benefit-title">Helpful Information</h3>
                  <p className="benefit-desc">
                    Explore education resources and real questions from
                    homeowners.
                  </p>
                </div>
              </div>
              <div className="hero-benefit-row">
                <div className="benefit-icon-badge" aria-hidden="true">
                  <Shield size={22} />
                </div>
                <div className="benefit-content">
                  <h3 className="benefit-title">Informed Decisions</h3>
                  <p className="benefit-desc">
                    Compare services, understand your options and plan with
                    confidence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section
        id="story"
        className="about-story-section"
        aria-labelledby="about-story-heading"
      >
        <div className="about-story-grid">
          <div className="about-story-copy">
            <div className="about-eyebrow">
              <span className="about-eyebrow-text">
                THE STORY BEHIND THE NAME
              </span>
              <span className="about-eyebrow-dash" aria-hidden="true" />
            </div>
            <h2 id="about-story-heading" className="about-story-title">
              {content.story.heading}
            </h2>
            <p className="content-placeholder-label">{content.story.label}</p>
            <p className="about-story-paragraph">
              Restored Healthy Homes was created to make it easier for people to
              find and connect with professionals who care about healthier
              indoor environments.
            </p>
            <p className="about-story-paragraph">
              We believe that everyone deserves a home or workspace that
              supports their well-being. This directory brings together
              knowledge, experience and trusted professionals to help people
              take informed steps, whether they&apos;re investigating a concern,
              planning a renovation or simply exploring options.
            </p>
          </div>

          <div className="about-story-media">
            <h3 className="about-video-title">{content.video.heading}</h3>
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
                <div className="video-play-indicator" aria-hidden="true">
                  <Play size={22} className="fill-current" />
                </div>
                <h3>Company video to come</h3>
                <p>{content.video.placeholder}</p>
              </div>
            )}
            {content.video.transcript ? (
              <a
                className="text-link mt-3"
                href={content.video.transcript.href}
              >
                {content.video.transcript.label}
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* Purpose Section */}
      <section
        className="about-purpose-section"
        aria-labelledby="about-purpose-heading"
      >
        <div className="about-purpose-card">
          <div className="about-purpose-header">
            <p className="about-eyebrow-text">OUR PURPOSE</p>
            <h2 id="about-purpose-heading" className="about-purpose-title">
              {content.purpose.heading}
            </h2>
          </div>
          <div className="about-purpose-body">
            <p>{content.purpose.body}</p>
            <p className="about-purpose-sub">
              Our goal is to make the process clearer, more accessible, and
              centered around healthier, more comfortable homes.
            </p>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="about-values-section" aria-label="Core values">
        <div className="about-values-grid">
          <div className="about-value-card">
            <div className="value-icon-badge" aria-hidden="true">
              <Users size={24} />
            </div>
            <h3 className="value-title">Trusted Professionals</h3>
            <p className="value-desc">
              Connect with qualified experts across a range of healthy-home
              specialties.
            </p>
          </div>

          <div className="about-value-card">
            <div className="value-icon-badge" aria-hidden="true">
              <FileText size={24} />
            </div>
            <h3 className="value-title">Helpful Information</h3>
            <p className="value-desc">
              Explore education resources and real questions from homeowners.
            </p>
          </div>

          <div className="about-value-card">
            <div className="value-icon-badge" aria-hidden="true">
              <Home size={24} />
            </div>
            <h3 className="value-title">Informed Decisions</h3>
            <p className="value-desc">
              Compare services, understand your options and plan with
              confidence.
            </p>
          </div>

          <div className="about-value-card">
            <div className="value-icon-badge" aria-hidden="true">
              <Shield size={24} />
            </div>
            <h3 className="value-title">Healthier Spaces</h3>
            <p className="value-desc">
              Support better indoor environments for homes and businesses.
            </p>
          </div>
        </div>
      </section>

      {/* Closing CTA Banner */}
      <section
        className="about-closing-section"
        aria-labelledby="about-closing-heading"
      >
        <div className="about-cta-banner">
          <div className="about-cta-content">
            <p className="about-eyebrow-text">START EXPLORING</p>
            <h2 id="about-closing-heading" className="about-cta-title">
              Find your starting point.
            </h2>
            <p className="about-cta-desc">
              Discover the specialties and services for your next step.
            </p>
          </div>
          <div className="about-cta-actions">
            <ButtonLink href="/directory" className="about-cta-btn">
              Browse professionals <ArrowRight size={18} aria-hidden="true" />
            </ButtonLink>
            <Link className="about-cta-link" href="/list-your-business">
              List Your Business
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
