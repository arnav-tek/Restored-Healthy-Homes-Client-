import type { Metadata } from "next";
import { Brand } from "@/components/site/brand";
import { Navigation } from "@/components/site/navigation";
import { Footer } from "@/components/site/footer";
import { ScrollEffects } from "@/components/ui/scroll-effects";
import { assertDemoConfiguration } from "@/domain/config";
import { DemoSessionProvider } from "@/features/member/demo-session";
import { qaRepository, reviewRepository } from "@/data";
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
  assertDemoConfiguration(process.env);
  const [publicQaSeed, publicReviewSeed] = await Promise.all([
    qaRepository.listPublic().catch(() => []),
    reviewRepository
      .publicSnapshot()
      .catch(() => ({ professionals: [], reviews: [] })),
  ]);
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main" tabIndex={0}>
          Skip to content
        </a>
        <DemoSessionProvider
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
