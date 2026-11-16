import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDF_OPTIONS = {
  rangeChunkSize: 65536,
  disableStream: true,
  disableAutoFetch: true,
};

class LocalRangeTransport extends pdfjs.PDFDataRangeTransport {
  constructor(source, onError) {
    super(source instanceof Blob ? source.size : source.byteLength, null, false);
    this.source = source;
    this.onError = onError;
    this.aborted = false;
    this.transportReady();
  }

  requestDataRange(begin, end) {
    const source = this.source;
    const read = source instanceof Blob
      ? source.slice(begin, end).arrayBuffer()
      : Promise.resolve(source instanceof ArrayBuffer
        ? new Uint8Array(source).slice(begin, end)
        : new Uint8Array(source.buffer, source.byteOffset, source.byteLength).slice(begin, end));
    read.then((chunk) => {
      if (!this.aborted) this.onDataRange(begin, new Uint8Array(chunk));
    }).catch((error) => {
      if (!this.aborted) {
        this.onError(error);
        this.onDataRange(begin, null);
      }
    });
  }

  abort() {
    this.aborted = true;
  }
}

class HttpRangeTransport extends pdfjs.PDFDataRangeTransport {
  constructor(source, onError) {
    super(source.length, source.initialData, false);
    this.source = source;
    this.onError = onError;
    this.controller = new AbortController();
    this.transportReady();
  }

  requestDataRange(begin, end) {
    this.source.requestRange(begin, end, this.controller.signal)
      .then((chunk) => {
        if (!this.controller.signal.aborted) this.onDataRange(begin, chunk);
      })
      .catch((error) => {
        if (!this.controller.signal.aborted) {
          this.onError(error);
          this.onDataRange(begin, null);
        }
      });
  }

  abort() {
    this.controller.abort();
  }
}

function createPdfFile(source, onError) {
  if (source?.kind === "http-range") return new HttpRangeTransport(source, onError);
  if (source instanceof Blob || source instanceof ArrayBuffer || ArrayBuffer.isView(source)) {
    return new LocalRangeTransport(source, onError);
  }
  if (typeof source === "string") {
    if (source.startsWith("data:application/pdf;base64,")) {
      const encoded = source.split(",")[1];
      const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
      return new LocalRangeTransport(bytes, onError);
    }
    return { url: source, withCredentials: true };
  }
  if (source && typeof source.url === "string") {
    return {
      url: source.url,
      httpHeaders: source.httpHeaders,
      withCredentials: source.withCredentials ?? true,
    };
  }
  throw new Error("This PDF source is not supported.");
}

export default function PdfRenderer({ source, onControlsChange, onError }) {
  const scrollRef = useRef(null);
  const pageRefs = useRef(new Map());
  const activePageRef = useRef(1);
  const [file, setFile] = useState(null);
  const [pageCount, setPageCount] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pageWidth, setPageWidth] = useState(800);
  const [pageDimensions, setPageDimensions] = useState({});
  const [renderedPages, setRenderedPages] = useState(new Set([1]));
  const [progress, setProgress] = useState(null);
  const [loadKey, setLoadKey] = useState(0);

  useEffect(() => {
    let nextFile;
    try {
      nextFile = createPdfFile(source, onError);
      setFile(nextFile);
      setPageCount(null);
      setProgress(null);
      setCurrentPage(1);
      activePageRef.current = 1;
      setRenderedPages(new Set([1]));
    } catch (error) {
      onError(error);
    }
    return () => nextFile?.abort?.();
  }, [source, loadKey, onError]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setPageWidth(Math.max(1, Math.min(entry.contentRect.width - 48, 900)));
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!file || pageCount) return undefined;
    const timeout = window.setTimeout(() => {
      onError(new Error("PDF loading timed out. Check your connection and retry."));
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [file, pageCount, loadKey, onError]);

  const scrollToPage = useCallback((page) => {
    if (!pageCount || page < 1 || page > pageCount) return;
    activePageRef.current = page;
    setRenderedPages((current) => new Set([...current, page, page - 1, page + 1].filter((value) => value > 0 && value <= pageCount)));
    setCurrentPage(page);
    requestAnimationFrame(() => {
      const root = scrollRef.current;
      const element = pageRefs.current.get(page);
      if (!root || !element) return;
      const rootBounds = root.getBoundingClientRect();
      const pageBounds = element.getBoundingClientRect();
      root.scrollTo({ top: root.scrollTop + pageBounds.top - rootBounds.top, behavior: "auto" });
    });
  }, [pageCount]);

  const updateVisiblePages = useCallback(() => {
    const root = scrollRef.current;
    if (!root || !pageCount) return;
    const rootCenter = root.getBoundingClientRect().top + root.clientHeight / 2;
    let nearestPage = 1;
    let nearestDistance = Infinity;
    pageRefs.current.forEach((element, page) => {
      const bounds = element.getBoundingClientRect();
      const distance = Math.abs(bounds.top + bounds.height / 2 - rootCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPage = page;
      }
    });
    activePageRef.current = nearestPage;
    setCurrentPage((previous) => previous === nearestPage ? previous : nearestPage);
    const first = Math.max(1, nearestPage - 2);
    const last = Math.min(pageCount, nearestPage + 2);
    setRenderedPages((previous) => {
      if (previous.size === last - first + 1 && [...previous].every((page) => page >= first && page <= last)) return previous;
      return new Set(Array.from({ length: last - first + 1 }, (_, index) => first + index));
    });
  }, [pageCount]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return undefined;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateVisiblePages);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll);
    };
  }, [updateVisiblePages]);

  useEffect(() => {
    if (!pageCount) return;
    const frame = requestAnimationFrame(() => scrollToPage(activePageRef.current));
    return () => cancelAnimationFrame(frame);
  }, [scale, rotation, pageCount, scrollToPage]);

  useEffect(() => {
    onControlsChange?.({
      currentPage,
      totalPages: pageCount,
      setPage: scrollToPage,
      onZoomIn: () => setScale((value) => Math.min(value + 0.1, 2)),
      onZoomOut: () => setScale((value) => Math.max(value - 0.1, 0.5)),
      onRotate: () => setRotation((value) => (value + 90) % 360),
    });
  }, [currentPage, pageCount, scrollToPage, onControlsChange]);

  const handleDocumentError = (error) => {
    onError(error);
  };

  return (
    <div ref={scrollRef} className="h-full min-h-0 w-full overflow-auto bg-opsSurfaceLow p-3 sm:p-6">
      {file ? (
        <Document
          key={loadKey}
          file={file}
          options={PDF_OPTIONS}
          onLoadSuccess={({ numPages }) => {
            setPageCount(numPages);
            setRenderedPages(new Set(Array.from({ length: Math.min(numPages, 5) }, (_, index) => index + 1)));
          }}
          onLoadProgress={({ loaded, total }) => total && setProgress(Math.round((loaded / total) * 100))}
          onLoadError={handleDocumentError}
          onSourceError={handleDocumentError}
          loading={<p className="py-10 text-center text-sm text-opsMuted" role="status">Loading PDF{progress !== null ? `... ${progress}%` : "..."}</p>}
          error={<button type="button" className="mx-auto block rounded-sm bg-opsSecondary px-3 py-2 text-sm text-white" onClick={() => setLoadKey((key) => key + 1)}>Retry PDF</button>}
        >
          {pageCount && (
            <div className="flex min-h-full min-w-full flex-col items-center gap-5">
              {Array.from({ length: pageCount }, (_, index) => {
                const pageNumber = index + 1;
                const dimensions = pageDimensions[pageNumber];
                const ratio = dimensions ? dimensions.width / dimensions.height : 0.77;
                const rotated = rotation % 180 !== 0;
                const displayRatio = rotated ? 1 / ratio : ratio;
                const width = pageWidth * scale * (rotated ? displayRatio : 1);
                const height = width / displayRatio;
                return (
                  <div
                    key={pageNumber}
                    ref={(element) => element ? pageRefs.current.set(pageNumber, element) : pageRefs.current.delete(pageNumber)}
                    className="flex shrink-0 justify-center bg-opsSurfaceLowest shadow-modal"
                    data-pagenumber={pageNumber}
                    style={{ width, height }}
                  >
                    {renderedPages.has(pageNumber) ? (
                      <Page
                        pageNumber={pageNumber}
                        width={pageWidth * scale}
                        rotate={rotation}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        onLoadSuccess={(page) => setPageDimensions((current) => ({ ...current, [pageNumber]: { width: page.width, height: page.height } }))}
                        onRenderError={handleDocumentError}
                      />
                    ) : <div className="h-full w-full" aria-hidden="true" />}
                  </div>
                );
              })}
            </div>
          )}
        </Document>
      ) : <p className="py-10 text-center text-sm text-opsMuted" role="status">Preparing PDF...</p>}
    </div>
  );
}
