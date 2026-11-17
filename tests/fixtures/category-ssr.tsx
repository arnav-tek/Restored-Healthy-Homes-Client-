import { renderToString } from "react-dom/server";
import { ConnectedCategories } from "../../src/features/admin/connected-categories";
import { MembershipTableView } from "../../src/features/member/membership-table-view";
import type { AdminCategories } from "../../src/domain/admin-categories";
export const renderEditor = (initial: AdminCategories) =>
  renderToString(<ConnectedCategories initial={initial} />);
export const renderPrices = (initial: AdminCategories) =>
  renderToString(<MembershipTableView categories={initial.items} />);
