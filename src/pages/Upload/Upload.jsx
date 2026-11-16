
import mammoth from "mammoth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveDocument } from "../../utils/storage";
import { deletePdfBlob, savePdfBlob } from "../../utils/pdfStorage";

const SUPPORTED_MIME_TYPES = {
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  doc: ["application/msword"],
  pdf: ["application/pdf"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ],
  xls: [
    "application/vnd.ms-excel",
    "application/vnd.ms-excel.sheet.macroenabled.12",
    "application/vnd.msexcel",
  ],
  csv: ["text/csv", "text/plain", "application/csv"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
};

const SUPPORTED_EXTENSIONS = Object.keys(SUPPORTED_MIME_TYPES);

const ACCEPTED_FILES = SUPPORTED_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(",");

function Upload() {
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    const extension = file.name.split(".").pop().toLowerCase();

    // Extension validation
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      setError(
        `Unsupported file format. Supported formats: ${SUPPORTED_EXTENSIONS.map(
          (ext) => `.${ext}`,
        ).join(", ")}`,
      );
      e.target.value = "";
      return;
    }

    // MIME validation
    const allowedMimeTypes = SUPPORTED_MIME_TYPES[extension];

    if (
      file.type &&
      !allowedMimeTypes.includes(file.type) &&
      file.type !== "application/octet-stream"
    ) {
      setError("Invalid file type. Please upload a valid document.");
      e.target.value = "";
      return;
    }

    // Empty file validation
    if (file.size === 0) {
      setError("File is empty.");
      e.target.value = "";
      return;
    }

    let storedFileId;

    try {
      setIsProcessing(true);

      const documentId = crypto.randomUUID();
      let finalContent = "";

      if (extension === "docx") {
        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Normal'] => p:fresh",
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p => p:fresh",
            ],
            includeDefaultStyleMap: true,
            preserveEmptyParagraphs: true,
          },
        );

        finalContent = result.value;
      } else {
        // Store original binary files without conversion
        storedFileId = documentId;
        await savePdfBlob(documentId, file);
      }

      const doc = {
        id: documentId,
        title: file.name.slice(0, -(extension.length + 1)),
        filename: file.name,
        extension,
        mimeType: file.type || allowedMimeTypes[0],
        updatedAt: new Date().toLocaleString(),
        content: finalContent,
        ...(storedFileId ? { fileStorageId: storedFileId } : {}),
        readOnly: true,
      };

      saveDocument(doc, extension);

      navigate(`/edit/${doc.id}`);
    } catch (err) {
      if (storedFileId) {
        await deletePdfBlob(storedFileId).catch(() => {});
      }

      console.error("Upload Error:", err);
      setError(err.message || "File processing failed.");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-opsBackground px-4 py-8 font-sans text-opsText">
      <section className="w-full max-w-lg rounded-md border border-opsOutlineVariant bg-opsSurfaceLowest p-6 text-center shadow-panel sm:p-8">
        <h1 className="mb-2 text-xl font-semibold">
          Upload Document
        </h1>

        <p className="mb-6 text-sm text-opsMuted">
          Upload PDF, Word, Excel, CSV, PowerPoint, or image files.
        </p>

        <label className="group flex cursor-pointer flex-col items-center gap-3 rounded-sm border-2 border-dashed border-opsOutlineVariant bg-opsSurfaceLow p-5 transition-colors hover:border-opsSecondary hover:bg-opsSurfaceContainer focus-within:border-opsSecondary focus-within:ring-2 focus-within:ring-opsSecondary/30 sm:flex-row sm:justify-between">
          <input
            type="file"
            accept={ACCEPTED_FILES}
            onChange={handleFile}
            disabled={isProcessing}
            className="sr-only"
          />

          <span className="rounded-sm bg-opsSecondary px-3 py-2 text-sm font-medium text-white transition-colors group-hover:bg-opsSecondaryContainer group-focus-within:ring-2 group-focus-within:ring-opsSecondary group-focus-within:ring-offset-2">
            {isProcessing ? "Processing..." : "Choose File"}
          </span>

          <span className="max-w-full truncate text-sm text-opsMuted">
            {fileName || "No file chosen"}
          </span>
        </label>

        {isProcessing && (
          <p className="mt-4 text-sm text-opsMuted" role="status">
            Processing document...
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-opsError" role="alert">
            {error}
          </p>
        )}
      </section>
    </main>
  );
}

export default Upload;
