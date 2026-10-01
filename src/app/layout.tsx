import type { Metadata } from "next";
import { Brand } from "@/components/site/brand";
import { Navigation } from "@/components/site/navigation";
import { Footer } from "@/components/site/footer";
import { assertDemoConfiguration } from "@/domain/config";
import { DemoSessionProvider } from "@/features/member/demo-session";
import "./globals.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "Restored Healthy Homes | Demo preview",
    template: "%s | Restored Healthy Homes",
  },
  description: "Explore a preview of the healthy-home professional directory.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  assertDemoConfiguration(process.env);
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <div className="container header-inner">
            <Brand />
            <Navigation />
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          <DemoSessionProvider>{children}</DemoSessionProvider>
        </main>
        <Footer />
      </body>
    </html>
  );
}
