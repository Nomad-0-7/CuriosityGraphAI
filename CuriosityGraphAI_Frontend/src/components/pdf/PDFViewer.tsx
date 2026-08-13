import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import type { Document as DocType } from "../../types";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Props {
  fileUrl: string | null;
  targetPage: number | null;
  document: DocType | null;
}

export default function PDFViewer({ fileUrl, targetPage, document }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages) {
      setCurrentPage(targetPage);
    }
  }, [targetPage, numPages]);

  useEffect(() => {
    setCurrentPage(1);
    setScale(1.0);
    setNumPages(0);
  }, [fileUrl]);

  if (!fileUrl || !document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg text-text-muted">
        <div className="text-center">
          <Maximize2 size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">
            Select an indexed document to begin
          </p>
          <p className="text-sm mt-2 opacity-60">Your PDF will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-border">
      {/* Context Bar */}
      <div className="h-24 px-6 border-b border-border flex items-center justify-between gap-5 bg-app-bg">
        <div>
          <div className="text-text-muted text-[11px] mb-1">ACTIVE CONTEXT</div>
          <div className="text-[17px] font-semibold text-text-main">
            {document.title}
          </div>
          <div className="text-text-muted text-xs mt-1">PDF Document</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="pr-6 border-r border-border text-right">
            <div className="text-[17px] font-semibold text-text-main">
              {document.total_pages || "—"}
            </div>
            <div className="text-text-muted text-[10px]">Pages</div>
          </div>
          <div className="min-w-[65px]">
            <strong className="text-success text-[13px]">
              ● {document.status}
            </strong>
            <span className="block text-text-muted text-[10px] mt-1">
              Document Status
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-[50px] border-b border-border flex items-center justify-between px-4 bg-panel">
        <div className="flex items-center gap-2">
          <button className="w-[34px] h-[34px] rounded-md text-[#b5bfd0] hover:bg-[#172132] hover:text-white flex items-center justify-center">
            <Maximize2 size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="w-[34px] h-[34px] rounded-md text-[#b5bfd0] hover:bg-[#172132] hover:text-white flex items-center justify-center disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="px-4 text-xs text-[#d8deea]">
            <strong>{currentPage}</strong> / {numPages || "..."}
          </div>
          <button
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            disabled={currentPage >= numPages}
            className="w-[34px] h-[34px] rounded-md text-[#b5bfd0] hover:bg-[#172132] hover:text-white flex items-center justify-center disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
            className="w-[34px] h-[34px] rounded-md text-[#b5bfd0] hover:bg-[#172132] hover:text-white flex items-center justify-center"
          >
            <ZoomOut size={16} />
          </button>
          <span className="px-2 text-xs text-[#c3cad7]">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
            className="w-[34px] h-[34px] rounded-md text-[#b5bfd0] hover:bg-[#172132] hover:text-white flex items-center justify-center"
          >
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div className="flex-1 min-h-0 flex overflow-auto bg-[radial-gradient(circle_at_50%_35%,#1a2535,#111925_55%,#0d1420)] p-6 justify-center">
        {error && (
          <div className="bg-danger/10 text-danger p-4 rounded-lg flex items-center gap-2 mb-4 h-fit">
            <AlertCircle size={20} /> {error}
          </div>
        )}
        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError("Failed to load PDF.")}
          loading={
            <div className="flex items-center gap-2 text-text-muted mt-10">
              <Loader2 className="animate-spin" /> Loading PDF...
            </div>
          }
          className="flex flex-col items-center"
        >
          <Page
            pageNumber={currentPage}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="bg-white"
          />
        </Document>
      </div>
    </div>
  );
}
