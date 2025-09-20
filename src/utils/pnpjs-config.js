// src/pnpjs-config.ts
import { spfi, SPBrowser } from "@pnp/sp";
import { InjectHeaders } from "@pnp/queryable";
import "@pnp/sp/webs";
import "@pnp/sp/lists";
import "@pnp/sp/items";
import "@pnp/sp/files";
import "@pnp/sp/folders";
import "@pnp/sp/security";
import "@pnp/sp/search";
import "@pnp/graph/users"; // for 'me()'
import "@pnp/graph/photos"; // for 'photo'
import "@pnp/sp/lists/web";
import "@pnp/sp/attachments";
let _sp = null;

export const getSP = (token) => {
  if (!_sp) {
    _sp = spfi().using(
      SPBrowser({ baseUrl: "https://africellcloud.sharepoint.com/sites/KnowledgeBase" }),
      InjectHeaders({
        Authorization: `Bearer ${token}`,
      })
    );
  }
  return _sp;
};
