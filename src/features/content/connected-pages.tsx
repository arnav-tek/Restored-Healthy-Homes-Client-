import Link from "next/link";
import { notFound } from "next/navigation";
import { publicContent } from "@/data/supabase/site-content";
import { loadPublicCategoryCatalog } from "@/data/supabase/public-directory";
import { aboutAssetsAvailable } from "@/data/supabase/content-assets";
import type { ContentKind, PublishedContent } from "@/domain/site-content";
import { contentLabels } from "@/domain/site-content";
import { resourceCategories } from "@/domain/resource";
import { certificationKinds } from "@/domain/editorial";
import { contentKey } from "@/validation/site-content";
import { ContentPreview } from "./content-preview";
import { AboutView } from "./about-view";
import { EducationPathwaysView } from "@/features/education/education-pathways-view";
export { siteMetadata } from "./metadata";
function PendingContent({
  title,
  error = false,
}: {
  title: string;
  error?: boolean;
}) {
  return (
    <section className="panel resource-article">
      <h2>
        {error
          ? "Content temporarily unavailable"
          : "Approved content is coming soon"}
      </h2>
      <p role={error ? "alert" : undefined}>
        {error
          ? "Please try again later."
          : `${title} content is awaiting client copy and approval. No unpublished draft is shown here.`}
      </p>
      <Link className="text-link" href="/directory">
        Find professionals
      </Link>
    </section>
  );
}
export async function ConnectedSitePage({
  kind,
}: {
  kind: Exclude<ContentKind, "resource" | "pathway">;
}) {
  let item: PublishedContent | undefined,
    error = false;
  try {
    item = (await publicContent(kind, kind)).items[0];
  } catch {
    error = true;
  }
  if (kind === "about") {
    const f = item?.fields,
      videoAvailable = !!f && (await aboutAssetsAvailable(f));
    return (
      <AboutView
        connected
        published={!!item}
        content={{
          heroTitle: f?.title ?? "About Restored Healthy Homes",
          introduction:
            f?.summary ??
            "Our company story and purpose will be shared here after client approval.",
          story: {
            heading: "Our company story",
            label: item ? "" : "Awaiting approved copy",
            body:
              f?.story ??
              (error
                ? "The story is temporarily unavailable. Please try again later."
                : "Client-approved company story is coming soon."),
          },
          purpose: {
            heading: "Our why",
            label: "",
            body:
              f?.why ??
              "The client’s purpose and supporting story are awaiting approval.",
          },
          video: {
            heading: "The story, in their own words.",
            placeholder:
              "Our professional company film is awaiting approved assets.",
            src:
              f?.videoSrc && videoAvailable
                ? (f.videoSrc as `/media/${string}`)
                : null,
            poster:
              f?.posterSrc && videoAvailable
                ? (f.posterSrc as `/media/${string}`)
                : null,
            captions:
              f?.captionsSrc && videoAvailable
                ? {
                    src: f.captionsSrc as `/media/${string}`,
                    language: "en",
                    label: "English",
                  }
                : null,
            transcript: f?.transcript
              ? {
                  href: "#video-transcript",
                  label: "Video transcript",
                  text: f.transcript,
                }
              : null,
          },
        }}
      />
    );
  }
  return (
    <div className="container public-content-page resources-page">
      {item ? (
        <>
          <ContentPreview content={item} />
          {kind === "contact" && (
            <div className="public-page-actions">
              <Link className="button" href="/list-your-business">
                List Your Business
              </Link>
              <Link className="text-link" href="/pricing">
                Membership pricing
              </Link>
            </div>
          )}
        </>
      ) : (
        <>
          <header className="public-page-intro">
            <div>
              <p className="section-tag">
                {error ? "Please try again later" : "Awaiting client approval"}
              </p>
              <h1>{contentLabels[kind]}</h1>
            </div>
          </header>
          <PendingContent title={contentLabels[kind]} error={error} />
        </>
      )}
    </div>
  );
}
export async function ConnectedResources({
  query,
}: {
  query: Record<string, string | string[] | undefined>;
}) {
  const category = typeof query.category === "string" ? query.category : "",
    page =
      typeof query.page === "string" && /^[1-9][0-9]{0,5}$/.test(query.page)
        ? Number(query.page)
        : 1;
  const valid =
    Object.keys(query).every(
      (k) => ["category", "page"].includes(k) && typeof query[k] === "string",
    ) &&
    (!category || resourceCategories.some((c) => c.id === category)) &&
    (!query.page ||
      (typeof query.page === "string" && /^[1-9][0-9]{0,5}$/.test(query.page)));
  let items: PublishedContent[] = [],
    total = 0,
    error = false;
  if (valid)
    try {
      const data = await publicContent(
        "resource",
        undefined,
        page,
        category || undefined,
      );
      items = data.items;
      total = data.total;
    } catch {
      error = true;
    }
  const href = (p: number) =>
    `/resources?${new URLSearchParams({ ...(category ? { category } : {}), page: String(p) })}`;
  return (
    <div className="container public-content-page resources-page">
      <header className="public-page-intro">
        <div>
          <p className="public-eyebrow section-tag">Ideas for your next step</p>
          <h1>Resources</h1>
        </div>
        <div className="public-intro-copy">
          <p>Explore project planning and professional education.</p>
        </div>
      </header>
      <nav className="resource-filters" aria-label="Resource categories">
        <Link href="/resources" aria-current={!category ? "page" : undefined}>
          All resources
        </Link>
        {resourceCategories.map((c) => (
          <Link
            key={c.id}
            href={`/resources?category=${c.id}`}
            aria-current={c.id === category ? "page" : undefined}
          >
            {c.label}
          </Link>
        ))}
      </nav>
      {items.length ? (
        <>
          <p role="status">
            {total} published {total === 1 ? "article" : "articles"}
          </p>
          <div className="resource-grid">
            {items.map((item) => (
              <article key={item.key} className="resource-card">
                <p className="section-tag">
                  {
                    resourceCategories.find(
                      (c) => c.id === item.fields.category,
                    )?.label
                  }
                </p>
                <h2>
                  <Link href={`/resources/${item.key}`}>
                    {item.fields.title}
                  </Link>
                </h2>
                <p>{item.fields.summary}</p>
                <Link className="text-link" href={`/resources/${item.key}`}>
                  Read article
                  <span className="sr-only">: {item.fields.title}</span>
                </Link>
              </article>
            ))}
          </div>
        </>
      ) : !valid ? (
        <section className="panel">
          <h2>Category or page unavailable</h2>
          <p>Choose a category above or return to all resources.</p>
          <Link href="/resources">View all resources</Link>
        </section>
      ) : (
        <PendingContent title="Resources" error={error} />
      )}
      <nav className="public-page-actions" aria-label="Resource pages">
        {page > 1 && <Link href={href(page - 1)}>Previous page</Link>}
        {page * 12 < total && <Link href={href(page + 1)}>Next page</Link>}
      </nav>
    </div>
  );
}
export async function ConnectedArticle({ slug }: { slug: string }) {
  if (!contentKey(slug)) notFound();
  let item: PublishedContent | undefined;
  try {
    item = (await publicContent("resource", slug)).items[0];
  } catch {
    return (
      <div className="container public-content-page">
        <h1>Resource unavailable</h1>
        <PendingContent title="Resources" error />
      </div>
    );
  }
  if (!item) notFound();
  return (
    <div className="container public-content-page resource-article">
      <Link
        className="text-link"
        href={`/resources?category=${item.fields.category}`}
      >
        Back to resources
      </Link>
      <ContentPreview content={item} />
    </div>
  );
}
export async function ConnectedEducation() {
  const [catalogResult, contentResult] = await Promise.allSettled([
    loadPublicCategoryCatalog(),
    publicContent("pathway"),
  ]);
  const catalog =
      catalogResult.status === "fulfilled"
        ? catalogResult.value.filter((c) => c.active)
        : [],
    items =
      contentResult.status === "fulfilled" ? contentResult.value.items : [];
  return (
    <div className="learning-page container">
      <header className="public-page-intro education-hero">
        <div className="education-hero-left">
          <p className="public-eyebrow section-tag">FOR SPECIALISTS</p>
          <h1>
            Grow your professional knowledge.
            <br />
            Choose your path.
          </h1>
          <div className="public-intro-copy education-intro-below">
            <p>
              Explore education and certification options for your specialty.
              Restored Healthy Homes connects professionals to external
              providers; we do not train or certify professionals.
            </p>
            <p>
              Educational pathways do not verify a listing’s credentials or
              grant profile badges. Confirm requirements directly with the
              provider.
            </p>
          </div>
        </div>
      </header>
      {catalogResult.status === "rejected" ||
      contentResult.status === "rejected" ? (
        <PendingContent title="Education" error />
      ) : null}
      <EducationPathwaysView
        connected
        pathways={catalog.map((category) => {
          const f = items.find((i) => i.key === category.id)?.fields;
          return {
            category: { id: category.id, name: category.name },
            pathway: f
              ? {
                  introduction: f.introduction,
                  options: [
                    {
                      name: f.providerName,
                      kind: certificationKinds.find((k) => k === f.kind)!,
                      description: f.description,
                      href: f.providerUrl as `https://${string}`,
                    },
                  ],
                  requirements: f.requirements,
                  steps: f.steps.split(/\r?\n/).filter(Boolean),
                  timeline: f.timeline,
                  costs: f.costs,
                }
              : undefined,
          };
        })}
      />
      <aside className="public-closing-band education-closing-cta">
        <div className="closing-cta-content">
          <p className="section-tag">JOIN OUR DIRECTORY</p>
          <h2>Bring your experience to the directory.</h2>
          <p>
            Describe your services and actual qualifications when you apply.
            Education fees are separate from directory membership.
          </p>
        </div>
        <Link className="button" href="/pricing">
          Explore membership pricing
        </Link>
      </aside>
    </div>
  );
}
