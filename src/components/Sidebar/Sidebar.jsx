import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteDocument, getDocuments } from "../../utils/storage";
import { Pencil, Plus, Trash2 } from "lucide-react";

function Sidebar({ setIsOpen }) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    setDocuments(getDocuments());
  }, []);

  const handleDelete = (id) => {
    deleteDocument(id);
    setDocuments(getDocuments());
  };

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className="flex h-dvh w-full max-w-sm shrink-0 flex-col bg-opsPrimaryContainer font-sans text-intelQEBlue md:w-80">
      <div className="flex flex-col gap-3 border-b border-white/15 p-4">
        <button
          type="button"
          className="flex items-center justify-center gap-2 rounded-sm bg-opsSurfaceLowest px-3 py-2 text-sm font-semibold text-opsText transition-colors hover:bg-opsSurfaceLow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-opsSecondary focus-visible:ring-offset-2 focus-visible:ring-offset-opsPrimaryContainer"
          onClick={() => navigate("/upload")}
        >
          <Plus size={20} aria-hidden="true" />
          New Document
        </button>

        <input
          type="search"
          placeholder="Search documents"
          aria-label="Search documents"
          className="w-full rounded-sm border border-white/25 bg-white/10 px-3 py-2 text-sm text-intelQEBlue placeholder:text-white/60 focus:border-intelQELightBlue focus:outline-none focus:ring-2 focus:ring-intelQELightBlue"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredDocs.length === 0 ? (
          <p className="px-4 py-6 text-sm text-white/70">No documents found</p>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex cursor-pointer items-center justify-between gap-3 border-b border-white/10 px-4 py-3 transition-colors hover:bg-white/10 focus-within:bg-white/10"
              onClick={() => {
                navigate(`/edit/${doc.id}?mode=view`);
                setIsOpen(true);
              }}
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intelQELightBlue"
                aria-label={`View ${doc.title}`}
              >
                <span className="w-full truncate text-sm font-medium">{doc.title}</span>
                <span className="text-xs text-white/70">{doc.updatedAt}</span>
              </button>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-sm text-intelQEBlue transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intelQELightBlue"
                  aria-label={`Edit ${doc.title}`}
                  title="Edit document"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(true);
                    navigate(`/edit/${doc.id}?mode=edit`);
                  }}
                >
                  <Pencil size={18} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className="flex size-9 items-center justify-center rounded-sm text-intelQEBlue transition-colors hover:bg-opsError/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-intelQELightBlue"
                  aria-label={`Delete ${doc.title}`}
                  title="Delete document"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(doc.id);
                  }}
                >
                  <Trash2 size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
