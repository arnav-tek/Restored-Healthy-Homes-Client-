import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="Restored Healthy Homes — home">
      <span className="brand-mark" aria-hidden="true">
        RHH
      </span>
      <span>
        Restored<span className="brand-second">Healthy Homes</span>
      </span>
    </Link>
  );
}
