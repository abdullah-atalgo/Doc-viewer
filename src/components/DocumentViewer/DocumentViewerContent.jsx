
import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
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

const MIN_WIDTH = 320;
const MIN_HEIGHT = 360;
const VIEWPORT_PADDING = 16;

const resizeHandles = [
  {
    direction: "top",
    className: "top-0 left-5 right-5 h-2 cursor-ns-resize",
  },
  {
    direction: "bottom",
    className: "bottom-0 left-5 right-5 h-2 cursor-ns-resize",
  },
  {
    direction: "left",
    className: "left-0 top-5 bottom-5 w-2 cursor-ew-resize",
  },
  {
    direction: "right",
    className: "right-0 top-5 bottom-5 w-2 cursor-ew-resize",
  },
  {
    direction: "top-left",
    className: "top-0 left-0 h-5 w-5 cursor-nwse-resize",
  },
  {
    direction: "top-right",
    className: "top-0 right-0 h-5 w-5 cursor-nesw-resize",
  },
  {
    direction: "bottom-left",
    className: "bottom-0 left-0 h-5 w-5 cursor-nesw-resize",
  },
  {
    direction: "bottom-right",
    className: "bottom-0 right-0 h-5 w-5 cursor-nwse-resize",
  },
];

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

  const [modalSize, setModalSize] = useState(() => ({
    width:
      typeof window !== "undefined"
        ? Math.min(1200, window.innerWidth - 32)
        : 1200,
    height:
      typeof window !== "undefined"
        ? Math.min(850, window.innerHeight - 32)
        : 850,
  }));

  const resizeStartRef = useRef(null);

  const extension = document?.format || "unknown";
  const isPowerPoint = extension === "pptx" || extension === "ppt";
  const canEdit = document?.editable !== false;
  const effectiveIsEditing = extension === "docx" && canEdit && isEditing;

  const handlePdfControls = useCallback(
    (controls) => setPdfControls(controls),
    []
  );

  const handleToolbarRef = useCallback(
    (element) => setToolbarElement(element),
    []
  );

  const handleRenderError = useCallback((failure) => {
    setRenderError(
      failure?.message || "The document could not be rendered."
    );
  }, []);

  const handleExport = useCallback(() => {
    setDownloadError("");

    try {
      if (onExport) {
        return Promise.resolve(onExport(document)).catch((failure) => {
          setDownloadError(
            failure.message || "The document could not be downloaded."
          );
        });
      }

      if (document?.source instanceof Blob) {
        downloadBlob(document.source, document.filename);
      }
    } catch (failure) {
      setDownloadError(
        failure.message || "The document could not be downloaded."
      );
    }
  }, [document, onExport]);

  const handleToggleEdit = useCallback(() => {
    if (canEdit) onToggleEdit?.();
  }, [canEdit, onToggleEdit]);

  // Capture the initial modal dimensions and pointer position.
  const handleResizeStart = useCallback((event, direction) => {
    event.preventDefault();
    event.stopPropagation();

    const section = event.currentTarget.closest("section");
    if (!section) return;

    const rect = section.getBoundingClientRect();

    resizeStartRef.current = {
      direction,
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: rect.width,
      height: rect.height,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  // Corner: change width + height.
  // Middle edge: change only the corresponding dimension.
  const handleResize = useCallback((event) => {
    const start = resizeStartRef.current;
    if (!start) return;

    const deltaX = event.clientX - start.pointerX;
    const deltaY = event.clientY - start.pointerY;

    const maxWidth = window.innerWidth - VIEWPORT_PADDING * 2;
    const maxHeight = window.innerHeight - VIEWPORT_PADDING * 2;

    const isCorner =
      start.direction.includes("top") ||
      start.direction.includes("bottom")
        ? start.direction.includes("left") ||
          start.direction.includes("right")
        : false;

    const horizontalResize =
      start.direction.includes("left") ||
      start.direction.includes("right");

    const verticalResize =
      start.direction.includes("top") ||
      start.direction.includes("bottom");

    let width = start.width;
    let height = start.height;

    if (horizontalResize) {
      const horizontalDelta = start.direction.includes("left")
        ? -deltaX
        : deltaX;

      width = Math.min(
        maxWidth,
        Math.max(MIN_WIDTH, start.width + horizontalDelta)
      );
    }

    if (verticalResize) {
      const verticalDelta = start.direction.includes("top")
        ? -deltaY
        : deltaY;

      height = Math.min(
        maxHeight,
        Math.max(MIN_HEIGHT, start.height + verticalDelta)
      );
    }

    // Edge handles affect only their own dimension.
    // Corner handles affect both dimensions.
    if (!isCorner) {
      if (horizontalResize) {
        height = start.height;
      }

      if (verticalResize) {
        width = start.width;
      }
    }

    setModalSize({ width, height });
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizeStartRef.current = null;
  }, []);

  useEffect(() => {
    setRenderError("");
    setDownloadError("");
  }, [document?.id]);

  // Keep the modal within the viewport after browser resizing.
  useEffect(() => {
    const handleViewportResize = () => {
      setModalSize((previous) => ({
        width: Math.max(
          MIN_WIDTH,
          Math.min(
            previous.width,
            window.innerWidth - VIEWPORT_PADDING * 2
          )
        ),
        height: Math.max(
          MIN_HEIGHT,
          Math.min(
            previous.height,
            window.innerHeight - VIEWPORT_PADDING * 2
          )
        ),
      }));
    };

    window.addEventListener("resize", handleViewportResize);

    return () => {
      window.removeEventListener("resize", handleViewportResize);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/70 p-2 backdrop-blur-sm sm:p-4">
      <section
        className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-opsOutlineVariant bg-opsBackground shadow-modal"
        style={{
          width: `${modalSize.width}px`,
          height: `${modalSize.height}px`,
          maxWidth: `calc(100vw - ${VIEWPORT_PADDING * 2}px)`,
          maxHeight: `calc(100dvh - ${VIEWPORT_PADDING * 2}px)`,
        }}
        aria-label="Document viewer"
      >
        {isPowerPoint && (
          <button
            type="button"
            className="absolute right-3 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-md border border-opsOutlineVariant bg-opsSurfaceContainer text-opsText shadow-panel transition-colors hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary"
            aria-label="Close document viewer"
            title="Close document viewer"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}

        {!isPowerPoint && (
          <div className="shrink-0 border-b border-opsOutlineVariant bg-opsSurfaceContainer p-2 sm:p-3">
          {isLoading ? (
            <p
              className="px-2 py-3 text-center text-sm text-opsMuted"
              role="status"
            >
              Loading document...
            </p>
          ) : error ? (
            <div
              className="flex items-center justify-center gap-3 px-2 py-2 text-sm text-opsError"
              role="alert"
            >
              <span>{error}</span>

              {onRetry && (
                <button
                  type="button"
                  className="rounded-sm bg-opsSecondary px-3 py-1.5 text-white"
                  onClick={onRetry}
                >
                  Retry
                </button>
              )}

              <button
                type="button"
                className="ml-auto text-opsText"
                aria-label="Close document viewer"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          ) : document ? (
            <Header
              isEditing={effectiveIsEditing}
              editable={canEdit}
              onClose={onClose}
              wordCount={
                document.content
                  ?.replace(/<[^>]*>/g, " ")
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean).length || 0
              }
              onToggleEdit={handleToggleEdit}
              onExport={handleExport}
              showDownload={extension !== "xlsx"}
              extension={extension}
              {...pdfControls}
              onToolbarElement={handleToolbarRef}
            />
          ) : null}
          </div>
        )}

        {/* Document Body */}
        {isLoading ? (
          <div
            className="min-h-0 flex-1 overflow-auto bg-opsSurfaceLow p-8 text-center text-sm text-opsMuted"
            role="status"
          >
            Loading document...
          </div>
        ) : error ? null : renderError ? (
          <div
            className="m-auto flex max-w-xl flex-col items-center gap-3 p-6 text-center text-sm text-opsError"
            role="alert"
          >
            <p>{renderError}</p>

            <button
              type="button"
              className="rounded-sm bg-opsSecondary px-3 py-1.5 text-white"
              onClick={() => setRenderError("")}
            >
              Retry rendering
            </button>
          </div>
        ) : document ? (
          <>
            {downloadError && (
              <p
                className="absolute bottom-4 right-4 z-20 rounded-sm bg-opsSurfaceLowest px-4 py-2 text-sm text-opsError shadow-panel"
                role="alert"
              >
                {downloadError}
              </p>
            )}

            <div
              className={`min-h-0 flex-1 ${
                extension === "pdf" ? "overflow-hidden" : "overflow-auto"
              }`}
            >
              <DocumentRenderer
                document={document}
                isEditing={effectiveIsEditing}
                onChange={onChange}
                onPdfControls={handlePdfControls}
                onError={handleRenderError}
                onExport={handleExport}
                toolbarElement={toolbarElement}
              />
            </div>
          </>
        ) : null}

        {/* Eight Resize Handles */}
        {resizeHandles.map(({ direction, className }) => (
          <div
            key={direction}
            role="separator"
            aria-label={`Resize from ${direction}`}
            onPointerDown={(event) =>
              handleResizeStart(event, direction)
            }
            onPointerMove={handleResize}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
            onLostPointerCapture={handleResizeEnd}
            className={`absolute z-30 touch-none ${className}`}
          />
        ))}
      </section>
    </div>
  );
}
