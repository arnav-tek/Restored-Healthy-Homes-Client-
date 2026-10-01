export interface Category {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly monthlyUsd: number;
  readonly billingKey: string;
}
export const categories: readonly Category[] = [
  {
    id: "mold-inspection",
    name: "Mold Testing / Inspectors",
    description: "Understand mold and moisture concerns.",
    monthlyUsd: 79,
    billingKey: "membership-inspection",
  },
  {
    id: "mold-remediation",
    name: "Mold Remediation",
    description: "Find support for mold removal and recovery.",
    monthlyUsd: 129,
    billingKey: "membership-remediation",
  },
  {
    id: "healthy-renovations",
    name: "Healthy Home Renovations",
    description: "Improve your home with health in mind.",
    monthlyUsd: 129,
    billingKey: "membership-renovations",
  },
  {
    id: "healthy-builders",
    name: "Healthy Home Builders",
    description: "Bring healthy building into a new home.",
    monthlyUsd: 200,
    billingKey: "membership-builders",
  },
  {
    id: "healthy-trades",
    name: "Healthy Home Trades",
    description: "Find specialists for the details that matter.",
    monthlyUsd: 129,
    billingKey: "membership-trades",
  },
  {
    id: "healthy-designers",
    name: "Healthy Home Designers",
    description: "Create spaces with thoughtful material choices.",
    monthlyUsd: 129,
    billingKey: "membership-designers",
  },
  {
    id: "health-practitioners",
    name: "Health Practitioners (Physicians, Nutritionists, Naturopaths)",
    description: "Explore professionals focused on personal health.",
    monthlyUsd: 129,
    billingKey: "membership-practitioners",
  },
  {
    id: "mold-detection-dogs",
    name: "Mold Detection Dogs",
    description: "Explore canine mold detection teams.",
    monthlyUsd: 79,
    billingKey: "membership-detection-dogs",
  },
];
export const formatMonthlyPrice = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
