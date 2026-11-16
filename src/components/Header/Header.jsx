import {
  Download,
  FilePenLine,
  EyeIcon,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

function Header({
  isEditing,
  onClose,
  onToolbarElement,
  showDownload = true,
  wordCount,
  onToggleEdit,
  onExport,
  extension,
  onZoomIn,
  onZoomOut,
  onRotate,
  currentPage,
  totalPages,
  setPage,
}) {
  const isPdf = extension === "pdf";
  const actionButtonClass = `flex items-center rounded-md bg-transparent px-2.5 py-1.5 text-sm font-medium transition-colors hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary ${isPdf ? "text-intelQEBlue hover:bg-white/10 focus-visible:ring-offset-opsPrimaryContainer" : "text-opsText focus-visible:ring-offset-opsSurfaceContainer"}`;
  const pdfButtonClass = "flex items-center justify-center rounded-md bg-transparent p-1.5 text-intelQEBlue transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary focus-visible:ring-offset-2 focus-visible:ring-offset-opsPrimaryContainer disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <header
      className={`relative flex min-h-13 flex-wrap items-center justify-between gap-2 rounded-sm border-b border-opsSurfaceHigh px-3.5 py-1.5 font-sans ${isPdf ? "bg-opsPrimaryContainer text-intelQEBlue" : "bg-opsSurfaceContainer text-opsText"}`}
    >
      {!isPdf && (
        <div
          ref={onToolbarElement}
          aria-label="Text formatting"
          className={`ql-toolbar ql-snow flex flex-wrap items-center gap-1 !border-0 !bg-transparent !p-0 ${!isEditing ? "opacity-50" : ""}`}
        >
          <select
            className="ql-header cursor-pointer rounded-sm border border-opsOutlineVariant bg-opsSurfaceLowest px-1.5 py-1 text-xs text-opsText focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary disabled:cursor-not-allowed"
            aria-label="Text style"
            disabled={!isEditing}
          >
            <option value="1">H1</option>
            <option value="2">H2</option>
            <option value="">Normal</option>
          </select>
          <span className="ql-formats">
            <select className="ql-font" aria-label="Font family" disabled={!isEditing}>
              <option value="" />
              <option value="serif" />
              <option value="monospace" />
            </select>
            <select className="ql-size" aria-label="Font size" disabled={!isEditing}>
              <option value="small" />
              <option value="" />
              <option value="large" />
              <option value="huge" />
            </select>
          </span>
          <span className="ql-formats">
            <select className="ql-align" aria-label="Text alignment" disabled={!isEditing}>
              <option value="" />
              <option value="center" />
              <option value="right" />
              <option value="justify" />
            </select>
          </span>
          <button className="ql-bold rounded-sm hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary disabled:cursor-not-allowed" aria-label="Bold" title="Bold" disabled={!isEditing} />
          <button className="ql-italic rounded-sm hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary disabled:cursor-not-allowed" aria-label="Italic" title="Italic" disabled={!isEditing} />
          <button className="ql-underline rounded-sm hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary disabled:cursor-not-allowed" aria-label="Underline" title="Underline" disabled={!isEditing} />
          <button className="ql-list rounded-sm hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary disabled:cursor-not-allowed" aria-label="Ordered list" title="Ordered list" value="ordered" disabled={!isEditing} />
          <button className="ql-list rounded-sm hover:bg-opsSurfaceHigh focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary disabled:cursor-not-allowed" aria-label="Bullet list" title="Bullet list" value="bullet" disabled={!isEditing} />
        </div>
      )}

      {isPdf && (
        <div className="relative z-10 mx-auto flex items-center gap-2 sm:absolute sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={pdfButtonClass}
              aria-label="Previous page"
              title="Previous page"
              onClick={() => setPage(currentPage - 1)}
              disabled={!totalPages || currentPage <= 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-12 text-center text-sm tabular-nums">
              {currentPage} / {totalPages ?? "…"}
            </span>
            <button
              type="button"
              className={pdfButtonClass}
              aria-label="Next page"
              title="Next page"
              onClick={() => setPage(currentPage + 1)}
              disabled={!totalPages || currentPage >= totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="h-6 w-px bg-opsOutline/50" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <button type="button" className={pdfButtonClass} onClick={onZoomOut} aria-label="Zoom out" title="Zoom out">
              <ZoomOut size={18} />
            </button>
            <button type="button" className={pdfButtonClass} onClick={onZoomIn} aria-label="Zoom in" title="Zoom in">
              <ZoomIn size={18} />
            </button>
            <button type="button" className={pdfButtonClass} onClick={onRotate} aria-label="Rotate page" title="Rotate page">
              <RotateCw size={18} />
            </button>
          </div>
        </div>
      )}

      <div className="ml-auto flex items-center">
        {!isPdf && onToggleEdit && (
          <>
            <span className="mx-1.5 text-xs text-opsMuted">{wordCount} words</span>
            <button
              type="button"
              className={actionButtonClass}
              onClick={onToggleEdit}
              aria-label={isEditing ? "Preview document" : "Edit document"}
              title={isEditing ? "Preview document" : "Edit document"}
            >
              {isEditing ? <EyeIcon size={18} /> : <FilePenLine size={18} />}
            </button>
          </>
        )}

        {showDownload && (
          <button type="button" className={actionButtonClass} onClick={onExport} aria-label="Download document" title="Download document">
            <Download size={18} />
          </button>
        )}
        <button type="button" className={actionButtonClass} onClick={onClose} aria-label="Close editor" title="Close editor">
          <X size={18} />
        </button>
      </div>
    </header>
  );
}
export default Header;
