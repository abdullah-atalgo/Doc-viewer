import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

function Editor({ value, onChange, isEditing, toolbarElement }) {
  const formats = [
    "header", "font", "size", "bold", "italic", "underline", "list", "bullet", "align",
  ];

  if (!toolbarElement) return null;

  return (
    <div className="editor-shell mx-auto min-h-full w-full max-w-4xl [&_.ql-container.ql-snow]:!flex [&_.ql-container.ql-snow]:!min-h-full [&_.ql-container.ql-snow]:!w-full [&_.ql-container.ql-snow]:!flex-col [&_.ql-container.ql-snow]:!border-0 [&_.ql-container.ql-snow]:!bg-opsSurfaceLowest [&_.ql-container.ql-snow]:!shadow-panel [&_.ql-editor]:!h-auto [&_.ql-editor]:!min-h-full [&_.ql-editor]:!overflow-y-visible [&_.ql-editor]:!px-5 [&_.ql-editor]:!py-8 sm:[&_.ql-editor]:!px-12 sm:[&_.ql-editor]:!py-14">
      <ReactQuill
        theme="snow"
        value={value}
        formats={formats}
        onChange={onChange}
        readOnly={!isEditing}
        modules={{
          toolbar: {
            container: toolbarElement,
          },
        }}
      />
    </div>
  );
}

export default Editor;
