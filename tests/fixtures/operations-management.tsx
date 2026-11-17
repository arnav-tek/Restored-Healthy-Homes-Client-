import {hydrateRoot} from "react-dom/client";
import {ConnectedFeatured} from "../../src/features/admin/connected-featured";
import type {FeaturedWorkspace} from "../../src/domain/admin-operations";
const state=JSON.parse(document.getElementById("fixture-data")!.textContent!) as FeaturedWorkspace;
hydrateRoot(document.getElementById("root")!,<ConnectedFeatured initial={state}/>);
