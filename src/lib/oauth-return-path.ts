export function oauthReturnPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(value)) return "/";
  const origin = "https://app.invalid";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.pathname.startsWith("//")) return "/";
    return target.pathname + target.search + target.hash;
  } catch {
    return "/";
  }
}

const returnKey = "squished.auth.next";
export function storeAuthReturn(path: string) {
  sessionStorage.setItem(returnKey, oauthReturnPath(path));
}
export function consumeAuthReturn() {
  const value = sessionStorage.getItem(returnKey);
  sessionStorage.removeItem(returnKey);
  return oauthReturnPath(value);
}