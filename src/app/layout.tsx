import type { Metadata } from "next";
import { Brand } from "@/components/site/brand";
import { Navigation } from "@/components/site/navigation";
import { Footer } from "@/components/site/footer";
import { ScrollEffects } from "@/components/ui/scroll-effects";
import { applicationMode } from "@/domain/config";
import { ConnectedNavigation } from "@/features/auth/connected-navigation";
import { DemoSessionProvider } from "@/features/member/demo-session";
import { directoryRepository, qaRepository, reviewRepository } from "@/data";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "Restored Healthy Homes",
    template: "%s | Restored Healthy Homes",
  },
  description: "Explore the healthy-home professional directory.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (applicationMode(process.env) === "staging")
    return (
      <html lang="en">
        <body>
          <a className="skip-link" href="#main">
            Skip to content
          </a>
          <header className="site-header">
            <div className="container header-inner account-header">
              <Brand />
              <ConnectedNavigation />
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <footer className="site-footer">
            <div className="container">
              <p>Restored Healthy Homes · Staging account access</p>
              <p>
                Applications, profiles and review decisions save to staging.
                Payments and other workflows are not connected yet.
              </p>
            </div>
          </footer>
        </body>
      </html>
    );
  const [publicQaSeed, publicReviewSeed, publicProfiles] = await Promise.all([
    qaRepository.listPublic().catch(() => []),
    reviewRepository
      .publicSnapshot()
      .catch(() => ({ professionals: [], reviews: [] })),
    directoryRepository.listPublicProfiles().catch(() => []),
  ]);
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main" tabIndex={0}>
          Skip to content
        </a>
        <DemoSessionProvider
          publicProfiles={publicProfiles}
          publicQaSeed={publicQaSeed}
          publicProfessionalIds={publicReviewSeed.professionals.map(
            (profile) => profile.id,
          )}
          publicReviewSeed={publicReviewSeed}
        >
          <header className="site-header">
            <div className="container header-inner">
              <Brand />
              <Navigation />
            </div>
          </header>
          <main id="main" tabIndex={-1}>
            <ScrollEffects />
            {children}
          </main>
          <Footer />
        </DemoSessionProvider>
      </body>
    </html>
  );
}
