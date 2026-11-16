import mammoth from "mammoth";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveDocument } from "../../utils/storage";
import { deletePdfBlob, savePdfBlob } from "../../utils/pdfStorage";

function Upload() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // reset state
    setError("");
    setFileName(file.name);

    // Extension validation
    const extension = file.name.split(".").pop().toLowerCase();
    const supportedExtensions = ["docx", "pdf", "xlsx", "xls", "csv"];
    if (!supportedExtensions.includes(extension)) {
      setError("Please upload .docx, .pdf, .xlsx, .xls, or .csv files only");
      return;
    }

    // MIME type validation (extra safety)
    const validMime = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.ms-excel.sheet.macroenabled.12",
      "text/csv",
      "text/plain",
      "application/csv",
      "application/vnd.msexcel",
      "application/octet-stream",
    ];

    if (file.type && !validMime.includes(file.type)) {
      setError("Invalid file type");
      return;
    }

    // Empty file validation
    if (file.size === 0) {
      setError("File is empty");
      return;
    }

    let storedFileId;
    try {
      setIsProcessing(true);
      const extension = file.name.split(".").pop().toLowerCase();
      const documentId = crypto.randomUUID();
      let finalContent = "";

      if (extension === "docx") {
        // Process DOCX to HTML for Quill Editor
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
      } else if (["pdf", "xlsx", "xls", "csv"].includes(extension)) {
        storedFileId = documentId;
        await savePdfBlob(documentId, file);
      }

      const doc = {
        id: documentId,
        title: file.name.replace(`.${extension}`, ""),
        updatedAt: new Date().toLocaleString(),
        content: finalContent,
        ...(storedFileId ? { fileStorageId: storedFileId } : {}),
        readOnly: true,
      };

      // Persist document with extension type
      saveDocument(doc, extension);
      navigate(`/edit/${doc.id}`);
    } catch (err) {
      if (storedFileId) await deletePdfBlob(storedFileId).catch(() => {});
      console.error("Upload Error:", err);
      setError(err.message || "File processing failed");
    } finally {
      setIsProcessing(false);
      e.target.value = "";
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center bg-opsBackground px-4 py-8 font-sans text-opsText">
      <section className="w-full max-w-lg rounded-md border border-opsOutlineVariant bg-opsSurfaceLowest p-6 text-center shadow-panel sm:p-8">
        <h1 className="mb-2 text-xl font-semibold">Upload Document</h1>
        <p className="mb-6 text-sm text-opsMuted">
          Upload a DOCX, PDF, Excel, or CSV file to view
        </p>

        <label className="group flex cursor-pointer flex-col items-center gap-3 rounded-sm border-2 border-dashed border-opsOutlineVariant bg-opsSurfaceLow p-5 transition-colors hover:border-opsSecondary hover:bg-opsSurfaceContainer focus-within:border-opsSecondary focus-within:ring-2 focus-within:ring-opsSecondary/30 sm:flex-row sm:justify-between">
          <input
            type="file"
            accept=".docx,.pdf,.xlsx,.xls,.csv"
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
            Converting document...
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
