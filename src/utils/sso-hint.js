const SSO_HINT_COOKIE = "africell_sso_login_hint";
const SSO_HINT_MAX_AGE = 60 * 60 * 24 * 30;

function getCookieDomain() {
  if (typeof window === "undefined") return "";
  const { hostname } = window.location;
  if (hostname === "myafricell.com" || hostname.endsWith(".myafricell.com")) {
    return "Domain=.myafricell.com";
  }
  return "";
}

function getSecureAttribute() {
  if (typeof window === "undefined") return "";
  return window.location.protocol === "https:" ? "Secure" : "";
}

function getAccountLoginHint(account) {
  return (
    account?.username ||
    account?.idTokenClaims?.preferred_username ||
    account?.idTokenClaims?.login_hint ||
    ""
  );
}

export function getSsoLoginHint() {
  if (typeof document === "undefined") return "";
  const row = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${SSO_HINT_COOKIE}=`));
  if (!row) return "";

  try {
    return decodeURIComponent(row.split("=").slice(1).join("="));
  } catch {
    return "";
  }
}

export function setSsoLoginHint(account) {
  if (typeof document === "undefined") return;
  const loginHint = getAccountLoginHint(account);
  if (!loginHint) return;

  document.cookie = [
    `${SSO_HINT_COOKIE}=${encodeURIComponent(loginHint)}`,
    `Max-Age=${SSO_HINT_MAX_AGE}`,
    "Path=/",
    "SameSite=Lax",
    getCookieDomain(),
    getSecureAttribute(),
  ].filter(Boolean).join("; ");
}

export function clearSsoLoginHint() {
  if (typeof document === "undefined") return;
  const baseCookie = [
    `${SSO_HINT_COOKIE}=`,
    "Max-Age=0",
    "Path=/",
    "SameSite=Lax",
    getSecureAttribute(),
  ].filter(Boolean).join("; ");
  document.cookie = baseCookie;

  const domain = getCookieDomain();
  if (domain) {
    document.cookie = [
      `${SSO_HINT_COOKIE}=`,
      "Max-Age=0",
      "Path=/",
      "SameSite=Lax",
      domain,
      getSecureAttribute(),
    ].filter(Boolean).join("; ");
  }
}
