import { useEffect, useState } from "react";

export default function ImageRenderer({ source, filename }) {
  const [src, setSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof source === "string") {
      setSrc(source);
      setError("");
      return undefined;
    }

    if (!(source instanceof Blob) && !(source instanceof ArrayBuffer) && !ArrayBuffer.isView(source)) {
      setError("This image source is not supported.");
      return undefined;
    }

    const blob = source instanceof Blob
      ? source
      : new Blob([source], { type: "application/octet-stream" });
    const objectUrl = URL.createObjectURL(blob);
    setSrc(objectUrl);
    setError("");
    return () => URL.revokeObjectURL(objectUrl);
  }, [source]);

  if (error) return <p className="p-8 text-center text-sm text-opsError" role="alert">{error}</p>;

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <img
        className="max-h-full max-w-full object-contain shadow-modal"
        src={src}
        alt={filename || "Document image"}
        onError={() => setError("This image could not be displayed.")}
      />
    </div>
  );
}
