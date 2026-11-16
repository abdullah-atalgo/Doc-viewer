const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function getDocumentUrl(documentId) {
  return `${API_BASE_URL}/api/documents/${encodeURIComponent(documentId)}/file`;
}

function getFilename(response) {
  const disposition = response.headers.get("content-disposition") || "";
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  const filename = encoded || plain || "";

  try {
    return decodeURIComponent(filename);
  } catch {
    return filename;
  }
}

function getFormat(contentType, filename) {
  const mimeType = contentType.split(";")[0].trim().toLowerCase();
  const extension = filename.split(".").pop()?.toLowerCase();
  const byMimeType = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "text/csv": "xlsx",
    "application/csv": "xlsx",
    "image/avif": "image",
    "image/gif": "image",
    "image/jpeg": "image",
    "image/png": "image",
    "image/svg+xml": "image",
    "image/webp": "image",
  };
  const byExtension = {
    pdf: "pdf",
    doc: "docx",
    docx: "docx",
    xls: "xlsx",
    xlsx: "xlsx",
    csv: "xlsx",
    avif: "image",
    gif: "image",
    jpeg: "image",
    jpg: "image",
    png: "image",
    svg: "image",
    webp: "image",
  };

  return { format: byMimeType[mimeType] || byExtension[extension] || "unknown", mimeType };
}

async function readFileResponse(response) {
  if (!response.ok) {
    throw new Error(response.status === 404
      ? "This document could not be found."
      : `Document request failed (${response.status}).`);
  }
  return response.blob();
}

export async function fetchDocumentFile(documentId, signal) {
  const url = getDocumentUrl(documentId);
  const initialResponse = await fetch(url, {
    headers: { Range: "bytes=0-65535" },
    credentials: "include",
    signal,
  });
  const filename = getFilename(initialResponse);
  const contentType = initialResponse.headers.get("content-type") || "application/octet-stream";
  const { format, mimeType } = getFormat(contentType, filename);

  if (initialResponse.status === 206 && format === "pdf") {
    const contentRange = initialResponse.headers.get("content-range") || "";
    const total = Number(contentRange.match(/\/(\d+)$/)?.[1]);
    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("The PDF server returned an invalid Content-Range header.");
    }

    return {
      document: {
        id: documentId,
        filename,
        format,
        mimeType,
        source: {
          kind: "http-range",
          length: total,
          initialData: new Uint8Array(await initialResponse.arrayBuffer()),
          requestRange: async (begin, end, requestSignal) => {
            const response = await fetch(url, {
              headers: { Range: `bytes=${begin}-${end - 1}` },
              credentials: "include",
              signal: requestSignal || signal,
            });
            if (response.status !== 206) {
              throw new Error(`PDF range request failed (${response.status}).`);
            }
            return new Uint8Array(await response.arrayBuffer());
          },
        },
      },
    };
  }

  const fileResponse = initialResponse.status === 206
    ? await fetch(url, { credentials: "include", signal })
    : initialResponse;
  const blob = await readFileResponse(fileResponse);
  const resolved = getFormat(mimeType || blob.type, filename);
  return {
    document: {
      id: documentId,
      filename,
      format: resolved.format,
      extension: filename.split(".").pop()?.toLowerCase() || "",
      mimeType: resolved.mimeType || blob.type,
      source: blob,
    },
  };
}

export async function downloadDocumentFile(documentId, signal) {
  const response = await fetch(getDocumentUrl(documentId), {
    credentials: "include",
    signal,
  });
  const blob = await readFileResponse(response);
  return {
    blob,
    filename: getFilename(response) || `document-${documentId}`,
  };
}
