import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DocumentViewerContent from "../../components/DocumentViewer/DocumentViewerContent";
import { getDocumentById, updateDocument } from "../../utils/storage";
import { getPdfBlob } from "../../utils/pdfStorage";

function getFormat(extension = "") {
  const normalized = extension.toLowerCase();
  if (normalized === "pdf") return "pdf";
  if (["doc", "docx"].includes(normalized)) return "docx";
  if (["png", "jpg", "jpeg", "gif", "webp", "avif", "svg"].includes(normalized)) return "image";
  if (["xls", "xlsx", "csv"].includes(normalized)) return "xlsx";
  return "unknown";
}

function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DemoDocumentViewer({ isOpen, setIsOpen, id }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isEditing = location.pathname.startsWith("/edit") &&
    new URLSearchParams(location.search).get("mode") !== "view";

  useEffect(() => {
    if (!isOpen || !id) {
      setDocument(null);
      setError("");
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    setError("");
    const loadLocalDocument = async () => {
      try {
        const stored = getDocumentById(id);
        if (!stored) throw new Error("This document could not be found.");
        let source = stored.content || "";
        const fileStorageId = stored.fileStorageId || stored.pdfStorageId;
        if (fileStorageId) {
          source = await getPdfBlob(fileStorageId);
          if (!source) throw new Error("The stored PDF file is unavailable.");
        } else if (stored.pdfSource) {
          source = stored.pdfSource;
        }
        if (!cancelled) {
          setDocument({
            id: stored.id,
            filename: stored.filename || `${stored.title}.${stored.extension || ""}`,
            format: getFormat(stored.extension),
            extension: stored.extension,
            mimeType: stored.mimeType || "",
            source,
            content: stored.extension === "docx" ? stored.content || "" : "",
          });
        }
      } catch (failure) {
        if (!cancelled) setError(failure.message || "The local document could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadLocalDocument();
    return () => { cancelled = true; };
  }, [id, isOpen]);

  useEffect(() => {
    if (!isEditing || !isOpen || !document || document.format !== "docx") return undefined;
    const timer = window.setTimeout(() => {
      updateDocument(id, {
        content: document.content,
        updatedAt: new Date().toLocaleString(),
        readOnly: false,
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [document, id, isEditing, isOpen]);

  const handleChange = useCallback((content) => {
    setDocument((current) => current ? { ...current, content } : current);
  }, []);

  const handleToggleEdit = useCallback(() => {
    navigate(`/edit/${id}?mode=${isEditing ? "view" : "edit"}`);
  }, [id, isEditing, navigate]);

  const handleExport = useCallback((loadedDocument) => {
    if (loadedDocument.source instanceof Blob) {
      saveDownload(loadedDocument.source, loadedDocument.filename);
      return;
    }
    if (loadedDocument.format === "pdf" && typeof loadedDocument.source === "string") {
      const anchor = document.createElement("a");
      anchor.href = loadedDocument.source;
      anchor.download = loadedDocument.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    const data = loadedDocument.content || String(loadedDocument.source || "");
    const type = loadedDocument.format === "image" ? loadedDocument.mimeType : "text/html";
    saveDownload(new Blob([data], { type: type || "text/html" }), loadedDocument.filename);
  }, []);

  return (
    <DocumentViewerContent
      document={document}
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      isEditing={isEditing}
      onToggleEdit={handleToggleEdit}
      onChange={handleChange}
      onExport={handleExport}
      isLoading={loading}
      error={error}
    />
  );
}
