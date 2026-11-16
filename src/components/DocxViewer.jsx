import { useMemo } from "react";

const allowedTags = new Set([
  "A", "B", "BLOCKQUOTE", "BR", "CODE", "DEL", "EM", "H1", "H2", "H3",
  "H4", "H5", "H6", "HR", "I", "IMG", "LI", "OL", "P", "PRE", "S",
  "STRONG", "SUB", "SUP", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD",
  "TR", "U", "UL",
]);

const blockedTags = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "SVG", "MATH"]);
const allowedAttributes = new Set(["alt", "colspan", "href", "rowspan", "src", "title"]);

function isSafeLink(value) {
  const href = value.trim();
  return /^(https?:\/\/|mailto:|\/(?!\/)|#|\.\.?\/)/i.test(href) || !/^[a-z][a-z\d+.-]*:/i.test(href);
}

function sanitizeHtml(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");

  function sanitizeNode(node) {
    if (node.nodeType !== 1) return;

    if (blockedTags.has(node.tagName)) {
      node.remove();
      return;
    }

    if (!allowedTags.has(node.tagName)) {
      const children = [...node.childNodes];
      node.replaceWith(...children);
      children.forEach(sanitizeNode);
      return;
    }

    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const safeImage = node.tagName === "IMG" && name === "src" &&
        /^data:image\/(?:png|jpe?g|gif|webp);base64,/i.test(value);
      const safeLink = node.tagName === "A" && name === "href" && isSafeLink(value);
      const safeTableSpan = ["colspan", "rowspan"].includes(name) && /^\d{1,3}$/.test(value);

      if (!allowedAttributes.has(name) || !(safeImage || safeLink || safeTableSpan || ["alt", "title"].includes(name))) {
        node.removeAttribute(attribute.name);
      }
    });

    [...node.childNodes].forEach(sanitizeNode);
  }

  [...parsed.body.childNodes].forEach(sanitizeNode);
  return parsed.body.innerHTML;
}

function DocxViewer({ content }) {
  const result = useMemo(() => {
    try {
      return { html: sanitizeHtml(content || ""), error: "" };
    } catch {
      return { html: "", error: "This Word document preview could not be displayed." };
    }
  }, [content]);

  if (result.error) {
    return <p className="mx-auto max-w-3xl text-sm text-opsError" role="alert">{result.error}</p>;
  }

  if (!result.html.trim()) {
    return <p className="mx-auto max-w-3xl text-sm text-opsMuted" role="status">No document content is available to preview.</p>;
  }

  return (
    <article
      className="mx-auto min-h-full w-full max-w-4xl bg-opsSurfaceLowest px-6 py-8 text-opsText shadow-panel sm:px-12 sm:py-12 [&_a]:text-opsSecondary [&_a]:underline [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-opsOutlineVariant [&_blockquote]:pl-4 [&_h1]:mb-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold [&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_li]:my-1 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:leading-7 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:bg-opsSurfaceLow [&_pre]:p-3 [&_table]:my-6 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-opsOutlineVariant [&_td]:p-2 [&_th]:border [&_th]:border-opsOutlineVariant [&_th]:bg-opsSurfaceLow [&_th]:p-2 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: result.html }}
    />
  );
}

export default DocxViewer;
