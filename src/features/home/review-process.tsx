import Link from "next/link";
import { ArrowRight, FileText, Shield, Users } from "lucide-react";

export function ReviewProcess() {
  return (
    <section
      className="container review-process-section"
      aria-labelledby="review-process-heading"
    >
      <div className="review-process-card">
        <div className="review-process-left">
          <div className="home-eyebrow">

            <h2 id="review-process-heading" className="eyebrow-text section-tag">
              Our Review Process
            </h2>
          </div>
          <h3 className="review-process-heading">
            A clear path
            <br />
            to a trusted directory.
          </h3>
          <p className="review-process-desc">
            Applications include business details, services, and submitted
            credentials for administrator review.
          </p>
          <Link href="/about" className="review-process-btn">
            Learn more about our process{" "}
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="review-process-right">
          <div className="review-process-item">
            <div className="review-item-icon" aria-hidden="true">
              <FileText size={20} />
            </div>
            <div className="review-item-content">
              <h4 className="review-item-title">Business review</h4>
              <p className="review-item-desc">
                We review business information, services and submitted
                credentials.
              </p>
            </div>
          </div>

          <div className="review-process-item">
            <div className="review-item-icon" aria-hidden="true">
              <Shield size={20} />
            </div>
            <div className="review-item-content">
              <h4 className="review-item-title">Listing approval</h4>
              <p className="review-item-desc">
                Public listings require approval, an active membership.
              </p>
            </div>
          </div>

          <div className="review-process-item">
            <div className="review-item-icon" aria-hidden="true">
              <Users size={20} />
            </div>
            <div className="review-item-content">
              <h4 className="review-item-title">Separate decisions</h4>
              <p className="review-item-desc">
                Listing approval and credential review are separate decisions;
                the platform does not issue certifications.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
