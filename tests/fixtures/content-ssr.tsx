import {renderToString} from "react-dom/server";
import {ConnectedContent} from "../../src/features/admin/connected-content";
import {ContentPreview} from "../../src/features/content/content-preview";
import {parseContentMutation} from "../../src/validation/site-content";
import type {ContentWorkspace,PublishedContent} from "../../src/domain/site-content";
export const parse=parseContentMutation;
export const editor=(initial:ContentWorkspace)=>renderToString(<ConnectedContent initial={initial} categories={[{id:"mold-inspection",name:"Synthetic category"}]}/>);
export const preview=(content:PublishedContent)=>renderToString(<ContentPreview content={content}/>);
