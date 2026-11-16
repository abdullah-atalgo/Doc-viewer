
import { useState } from "react";
import { useParams } from "react-router-dom";
import Sidebar from "../../components/Sidebar/Sidebar";
import DemoDocumentViewer from "./DemoDocumentViewer";

function Edit() {
  const { id } = useParams();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-dvh w-full justify-center overflow-hidden bg-opsBackground font-sans">
      <Sidebar setIsOpen={setIsOpen} />

      <DemoDocumentViewer isOpen={isOpen} setIsOpen={setIsOpen} id={id} />
    </div>
  );
}

export default Edit;
