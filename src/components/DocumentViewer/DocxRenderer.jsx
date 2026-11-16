import { useEffect, useState } from "react";
import mammoth from "mammoth";
import DocxViewer from "../DocxViewer";
import Editor from "../Editor/Editor";

export default function DocxRenderer({ source, content, isEditing, onChange, toolbarElement }) {
  const [html, setHtml] = useState(content || "");
  const [loading, setLoading] = useState(!content && source instanceof Blob);
  const [error, setError] = useState("");

  useEffect(() => {
    if (content) {
      setHtml(content);
      setLoading(false);
      setError("");
      return undefined;
    }
    if (!(source instanceof Blob)) {
      setHtml("");
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    source.arrayBuffer()
      .then((arrayBuffer) => mammoth.convertToHtml({ arrayBuffer }))
      .then((result) => {
        if (!cancelled) setHtml(result.value);
      })
      .catch(() => {
        if (!cancelled) setError("This Word document could not be converted.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [source, content]);

  if (loading) return <p className="p-8 text-center text-sm text-opsMuted" role="status">Converting Word document...</p>;
  if (error) return <p className="p-8 text-center text-sm text-opsError" role="alert">{error}</p>;

  return isEditing
    ? <Editor value={html} onChange={(value) => { setHtml(value); onChange?.(value); }} isEditing={isEditing} toolbarElement={toolbarElement} />
    : <DocxViewer content={html} />;
}
