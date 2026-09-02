export function buildShareUrl(
  params: URLSearchParams,
  currentUrl: string,
  configuredSiteUrl?: string,
) {
  const current = new URL(currentUrl);
  let base = current;

  if (configuredSiteUrl?.trim()) {
    try {
      const configured = new URL(configuredSiteUrl);
      if (configured.protocol === "https:" || configured.protocol === "http:") {
        base = configured;
      }
    } catch {
      // Fall back to the page currently being viewed when the setting is invalid.
    }
  }

  base.search = params.toString();
  base.hash = "";
  return base.toString();
}
