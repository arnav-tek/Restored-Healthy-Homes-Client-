import {hydrateRoot} from "react-dom/client";
import {ConnectedContent} from "../../src/features/admin/connected-content";
import type {ContentWorkspace} from "../../src/domain/site-content";
const state=JSON.parse(document.getElementById("fixture-data")!.textContent!) as ContentWorkspace;
hydrateRoot(document.getElementById("root")!,<ConnectedContent initial={state} categories={[{id:"mold-inspection",name:"Synthetic category"}]}/>);
