import {
  Search,
  Home,
  Hammer,
  Wrench,
  PenLine,
  Stethoscope,
  PawPrint,
  HelpCircle,
} from "lucide-react";

export function HouseBuildIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9" />
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M18 4.5V8" />
      <rect x="9" y="10" width="6" height="6" rx="1" />
      <line x1="12" y1="10" x2="12" y2="16" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  );
}

export function CategoryIcon({
  id,
  size = 20,
}: {
  id?: string;
  size?: number;
}) {
  switch (id) {
    case "mold-inspection":
      return <Search size={size} />;
    case "mold-remediation":
      return <Home size={size} />;
    case "healthy-renovations":
      return <Hammer size={size} />;
    case "healthy-builders":
      return <HouseBuildIcon size={size} />;
    case "healthy-trades":
      return <Wrench size={size} />;
    case "healthy-designers":
      return <PenLine size={size} />;
    case "health-practitioners":
      return <Stethoscope size={size} />;
    case "mold-detection-dogs":
      return <PawPrint size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
}
