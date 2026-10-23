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
    "Try simulated billing",
    "After approval, sign in as Your submitted application and open Membership. Choose one example category, review checkout and simulate success. Try a failed renewal, recovery and cancellation. No card details or charges; multi-category billing remains undecided. Admin membership scenario controls remain available separately.",
    "/demo/member?section=membership",
  ],
  [
    "Update homepage featured examples",
    "As Administrator, open Featured, select the submitted business and enable its entitlement with a note and confirmation. View homepage featured examples in this tab. Only approved, active, unsuspended records with public profile links appear. Fern & Field, Cedar Path and Hearthside are also linked examples. Final paid ranking is pending.",
    "/demo/admin?section=featured",
  ],
  [
    "Find the submitted business",
    "Use the public directory filters to find the approved, active application, then open View profile. Its services, practices, public contacts and credential review states appear on a full profile. Refresh/reset clears session listings; private application contacts stay excluded.",
    "/directory",
  ],
  [
    "Create a category",
    "In Categories, add a name, description and explicit preview price. Rename it to confirm existing associations and prices stay intact. Added categories become available to profile, question and consultation forms in this tab.",
    "/demo/admin?section=categories",
  ],
  [
    "Edit a certification pathway",
    "Select a category in Certifications, edit its external program reference, requirements, steps, timeline and costs, then save a draft. Publish to see the pathway on Certifications in this tab. This does not verify any member credentials.",
    "/demo/admin?section=certifications",
  ],
  [
    "Choose a public identity",
    "In the member Profile, choose an optional public professional/owner name and public email. Private application contacts are never used as defaults. The local public profile preview shows the result; linked examples such as Fern & Field also show this identity on their public profile.",
    "/demo/member?section=profile",
  ],
  [
    "Explore owner tools",
    "Analytics shows member/category counts and applications by month. Content lets you draft, review and publish a resource, then browse it on Resources in this tab. Refresh clears these changes; the server directory and approved pricing catalog keep their original fixtures.",
    "/demo/admin?section=content",
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
