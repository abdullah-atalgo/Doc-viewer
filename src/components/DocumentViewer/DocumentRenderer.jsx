import PdfRenderer from "./PdfRenderer";
import DocxRenderer from "./DocxRenderer";
import ImageRenderer from "./ImageRenderer";
import ExcelRenderer from "./ExcelRenderer";

export default function DocumentRenderer({ document, isEditing, onChange, onPdfControls, onError, onExport, toolbarElement }) {
  if (document.format === "pdf") {
    return <PdfRenderer source={document.source} onControlsChange={onPdfControls} onError={onError} />;
  }
  if (document.format === "docx") {
    return (
      <DocxRenderer
        source={document.source}
        content={document.content}
        isEditing={isEditing}
        onChange={onChange}
        toolbarElement={toolbarElement}
      />
    );
  }
  if (document.format === "image") {
    return <ImageRenderer source={document.source} filename={document.filename} />;
  }
  if (document.format === "xlsx") {
    return <ExcelRenderer source={document.source} filename={document.filename} format={document.extension} onDownloadOriginal={() => onExport?.(document)} />;
  }
  return (
    <p className="mx-auto max-w-xl p-8 text-center text-sm text-opsMuted" role="status">
      This document format is not supported.
    </p>
  );
}
