import { useCallback, useEffect, useState } from "react";
import Header from "../Header/Header";
import DocumentRenderer from "./DocumentRenderer";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename || "document";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function DocumentViewerContent({
  document,
  isOpen,
  onClose,
  isEditing = false,
  onToggleEdit,
  onChange,
  onExport,
  isLoading = false,
  error = "",
  onRetry,
}) {
  const [pdfControls, setPdfControls] = useState({});
  const [toolbarElement, setToolbarElement] = useState(null);
  const [renderError, setRenderError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const extension = document?.format || "unknown";
  const handlePdfControls = useCallback((controls) => setPdfControls(controls), []);
  const handleToolbarRef = useCallback((element) => setToolbarElement(element), []);
  const handleRenderError = useCallback((failure) => {
    setRenderError(failure?.message || "The document could not be rendered.");
  }, []);
  const handleExport = useCallback(() => {
    setDownloadError("");
    try {
      if (onExport) return Promise.resolve(onExport(document)).catch((failure) => {
        setDownloadError(failure.message || "The document could not be downloaded.");
      });
      if (document?.source instanceof Blob) downloadBlob(document.source, document.filename);
    } catch (failure) {
      setDownloadError(failure.message || "The document could not be downloaded.");
    }
  }, [document, onExport]);

  useEffect(() => {
    setRenderError("");
    setDownloadError("");
  }, [document?.id]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4">
      <section className="flex h-[95dvh] min-h-0 w-full max-w-7xl flex-col overflow-hidden rounded-lg border border-opsOutlineVariant bg-opsBackground shadow-modal sm:h-[92vh]" aria-label="Document viewer">
        <div className="shrink-0 border-b border-opsOutlineVariant bg-opsSurfaceContainer p-2 sm:p-3">
          {isLoading ? (
            <p className="px-2 py-3 text-center text-sm text-opsMuted" role="status">Loading document...</p>
          ) : error ? (
            <div className="flex items-center justify-center gap-3 px-2 py-2 text-sm text-opsError" role="alert">
              <span>{error}</span>
              {onRetry && <button type="button" className="rounded-sm bg-opsSecondary px-3 py-1.5 text-white" onClick={onRetry}>Retry</button>}
              <button type="button" className="ml-auto text-opsText" aria-label="Close document viewer" onClick={onClose}>Close</button>
            </div>
          ) : document ? (
            <Header
              isEditing={isEditing}
              onClose={onClose}
              wordCount={document.content?.replace(/<[^>]*>/g, " ").trim().split(/\s+/).filter(Boolean).length || 0}
              onToggleEdit={onToggleEdit}
              onExport={handleExport}
              showDownload={extension !== "xlsx"}
              extension={extension}
              {...pdfControls}
              onToolbarElement={handleToolbarRef}
            />
          ) : null}
        </div>

        {isLoading ? (
          <div className="min-h-0 flex-1 overflow-auto bg-opsSurfaceLow p-8 text-center text-sm text-opsMuted" role="status">Loading document...</div>
        ) : error ? null : renderError ? (
          <div className="m-auto flex max-w-xl flex-col items-center gap-3 p-6 text-center text-sm text-opsError" role="alert">
            <p>{renderError}</p>
            <button type="button" className="rounded-sm bg-opsSecondary px-3 py-1.5 text-white" onClick={() => setRenderError("")}>Retry rendering</button>
          </div>
        ) : document ? (
          <>
            {downloadError && (
              <p className="absolute bottom-4 right-4 z-20 rounded-sm bg-opsSurfaceLowest px-4 py-2 text-sm text-opsError shadow-panel" role="alert">
                {downloadError}
              </p>
            )}
            <div className={`min-h-0 flex-1 ${extension === "pdf" ? "overflow-hidden" : "overflow-auto"}`}>
              <DocumentRenderer
                document={document}
                isEditing={isEditing}
                onChange={onChange}
                onPdfControls={handlePdfControls}
                onError={handleRenderError}
                onExport={handleExport}
                toolbarElement={toolbarElement}
              />
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
