
import { useMemo } from "react";
import { ReactPptxViewer } from "@extend-ai/react-pptx";
import "@extend-ai/react-pptx/styles.css";

import {
  Download,
  FileWarning,
  Presentation,
} from "lucide-react";

export default function PptxRenderer({
  source,
  filename,
  onDownloadOriginal,
}) {
  const fileData = useMemo(() => {
    if (!source) return null;

    // Blob and File
    if (source instanceof Blob) {
      return source.size > 0 ? source : null;
    }

    // ArrayBuffer
    if (source instanceof ArrayBuffer) {
      return source.byteLength > 0 ? source : null;
    }

    // TypedArray / DataView
    if (ArrayBuffer.isView(source)) {
      if (source.byteLength === 0) return null;

      return new Uint8Array(
        source.buffer,
        source.byteOffset,
        source.byteLength
      );
    }

    // URL or remote file URL
    if (typeof source === "string" && source.trim()) {
      return source;
    }

    return null;
  }, [source]);

  const handleWarning = (warning) => {
    console.warn(
      "[PptxRenderer]",
      warning.code,
      warning.message,
      warning.slideIndex
    );
  };

  if (!fileData) {
    return (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-opsSurfaceLow p-6">
        <div className="flex max-w-md flex-col items-center gap-3 text-center">
          <FileWarning className="h-10 w-10 text-opsMuted" />

          <h3 className="text-base font-semibold text-opsText">
            Unable to open presentation
          </h3>

          <p className="text-sm text-opsMuted">
            No valid PowerPoint file data was provided.
          </p>

          {onDownloadOriginal && (
            <button
              type="button"
              onClick={onDownloadOriginal}
              className="mt-2 inline-flex items-center gap-2 rounded-lg border border-opsOutlineVariant px-4 py-2 text-sm text-opsText hover:bg-opsSurfaceContainer"
            >
              <Download size={16} />
              Download Original
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[500px] flex-col bg-opsSurfaceLow">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-opsOutlineVariant bg-opsSurfaceContainer px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Presentation className="h-5 w-5 shrink-0 text-opsSecondary" />

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-opsText">
              {filename || "Presentation"}
            </p>

            <p className="text-xs text-opsMuted">
              PowerPoint Presentation
            </p>
          </div>
        </div>

        {onDownloadOriginal && (
          <button
            type="button"
            onClick={onDownloadOriginal}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-opsOutlineVariant px-3 py-2 text-xs font-medium text-opsText hover:bg-opsSurfaceLow"
          >
            <Download size={15} />
            Download
          </button>
        )}
      </div>

      {/* Presentation Viewer */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ReactPptxViewer
          source={fileData}
          mode="slide"
          defaultZoom="fit-width"
          showThumbnails
          showToolbar
          showDiagnostics
          onWarning={handleWarning}
        />
      </div>
    </div>
  );
}
