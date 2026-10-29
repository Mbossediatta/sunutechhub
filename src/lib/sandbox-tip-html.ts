const TIP_CONTENT_POLICY =
  "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; media-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'\">";

export function sandboxTipHtml(html: string) {
  if (/<head(?:\s[^>]*)?>/i.test(html)) {
    return html.replace(
      /<head(?:\s[^>]*)?>/i,
      (head) => `${head}${TIP_CONTENT_POLICY}`,
    );
  }
  return `<!doctype html><html><head><meta charset="utf-8">${TIP_CONTENT_POLICY}<meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${html}</body></html>`;
}
