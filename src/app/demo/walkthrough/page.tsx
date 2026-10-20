import Link from "next/link";
export const metadata = {
  title: "Client walkthrough",
  robots: { index: false, follow: false },
};
const steps = [
  [
    "Apply as a specialist",
    "Prepare an application using fictional details. It starts pending with inactive membership and unverified credentials.",
    "/list-your-business",
  ],
  [
    "Open the member workspace",
    "Use Your submitted application in Quick access. Edit the profile, preview a sample photo and choose whether to offer free phone consultations.",
    "/login?account=application",
  ],
  [
    "Review as administrator",
    "Use Administrator on the separate admin sign-in page. Approve or reject the application; approval alone does not publish it. Membership and suspension stay separate.",
    "/admin/login",
  ],
  [
    "Try the category question inbox",
    "Submit a question and choose Healthy Home Builders. Publish it as admin, then use Hearthside Building Co. to see the matching question and submit an answer. Admin reviews the first response before it appears publicly.",
    "/questions/ask",
  ],
  [
    "Try a free consultation",
    "Submit a sample request for Healthy Home Builders. Assign Hearthside as admin, then sign in as Hearthside to accept or decline. Opting out removes it from available assignments.",
    "/consultations",
  ],
] as const;
export default function WalkthroughPage() {
  return (
    <div className="container walkthrough-page">
      <header>
        <p className="section-label section-tag">Client walkthrough</p>
        <h1>Explore the complete demo journey.</h1>
        <p>
          Use fictional information. Accounts, applications, questions and
          consultation requests are simulated in this tab. No emails, bookings,
          payments or permanent records are created.
        </p>
      </header>
      <ol className="walkthrough-steps">
        {steps.map(([title, description, href]) => (
          <li key={title}>
            <h2>{title}</h2>
            <p>{description}</p>
            <Link href={href} className="text-link">
              {title} →
            </Link>
          </li>
        ))}
      </ol>
      <p className="panel">
        Use Sign out to switch demo accounts. Submitted workflow records remain
        in this tab; drafts and photo previews clear. Refresh or a confirmed
        global reset clears everything. The demo sign-in passcode is displayed
        on the sign-in page.
      </p>
    </div>
  );
}
