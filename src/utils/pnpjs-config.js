// src/pnpjs-config.ts
import { spfi, SPBrowser } from "@pnp/sp";
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
// Live access token. The PnP client is created ONCE, but every request reads the
// CURRENT token from here via the on.pre observer below. This is critical: SharePoint
// tokens expire (~60 min) and a baked-in token would make every later request 401,
// silently stopping all sync for a surveyor who keeps the app open.
let _currentToken = null;

/** Update the token used for all subsequent SharePoint requests. */
export const setSPToken = (token) => {
  if (token) _currentToken = token;
};

export const getSP = (token) => {
  if (token) _currentToken = token;
  if (!_sp) {
    _sp = spfi().using(
      SPBrowser({ baseUrl: "https://africellcloud.sharepoint.com/sites/KnowledgeBase" })
    );
    // Inject the live token on EVERY request (not a static header baked in at creation).
    _sp.on.pre(async (url, init, result) => {
      init.headers = { ...init.headers, Authorization: `Bearer ${_currentToken}` };
      return [url, init, result];
    });
  }
  return _sp;
};
