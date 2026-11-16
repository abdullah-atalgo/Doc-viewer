import { useCallback, useEffect, useState } from "react";
import DocumentViewerContent from "./DocumentViewerContent";
import { downloadDocumentFile, fetchDocumentFile } from "../../services/documentApi";

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DocumentViewer({ documentId, isOpen, onClose }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [requestNumber, setRequestNumber] = useState(0);

  useEffect(() => {
    if (!isOpen || !documentId) {
      setDocument(null);
      setError("");
      return undefined;
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30000);
    setLoading(true);
    setError("");
    setDocument(null);
    fetchDocumentFile(documentId, controller.signal)
      .then(({ document: loadedDocument }) => setDocument(loadedDocument))
      .catch((failure) => {
        if (!controller.signal.aborted || timedOut) {
          setError(timedOut
            ? "The document request timed out. Check your connection and retry."
            : failure.message || "The document could not be loaded.");
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted) setLoading(false);
        if (timedOut) setLoading(false);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [documentId, isOpen, requestNumber]);

  const handleExport = useCallback(async (loadedDocument) => {
    if (loadedDocument.source instanceof Blob) {
      triggerDownload(loadedDocument.source, loadedDocument.filename || `document-${documentId}`);
      return;
    }
    const controller = new AbortController();
    try {
      const { blob, filename } = await downloadDocumentFile(documentId, controller.signal);
      triggerDownload(blob, filename);
    } catch (failure) {
      throw new Error(failure.message || "The document could not be downloaded.");
    }
  }, [documentId]);

  return (
    <DocumentViewerContent
      document={document}
      isOpen={isOpen}
      onClose={onClose}
      isLoading={loading}
      error={error}
      onRetry={() => setRequestNumber((number) => number + 1)}
      onExport={handleExport}
    />
  );
}
