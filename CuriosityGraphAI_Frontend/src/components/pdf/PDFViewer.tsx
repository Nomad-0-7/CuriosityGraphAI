import { useEffect, useState, useRef, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
} from "lucide-react";
import type { Document as DocType } from "../../types";

// REQUIRED — without these, the (invisible) text/annotation layers render
// as visible, unstyled, overlapping text on top of the canvas. This is the
// most common cause of "react-pdf looks broken" bug reports.
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

interface Props {
  fileUrl: string | null;
  targetPage: number | null;
  document: DocType | null;
}

type FitMode = "width" | "page" | "custom";

// Cap devicePixelRatio so we don't blow up canvas memory on very high-DPI
// screens, but still render crisp text instead of the browser's default (1x).
const RENDER_DPR = Math.min(window.devicePixelRatio || 1, 2);

export default function PDFViewer({ fileUrl, targetPage, document }: Props) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageInputValue, setPageInputValue] = useState<string>("1");
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Only used when fitMode is 'custom'
  const [error, setError] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({
    width: 800,
    height: 1000,
  });

  // The REAL aspect ratio (height / width) of the current PDF's pages,
  // learned from the first successfully-rendered page. Falls back to A4
  // until we know better — this replaces the hardcoded 1.414 that caused
  // mismatched wrapper sizing / gaps for non-A4 documents.
  const [pageAspectRatio, setPageAspectRatio] = useState<number>(1.414);

  // Measure the container (debounced via rAF, not on every resize tick)
  useEffect(() => {
    if (!containerRef.current) return;
    let raf = 0;
    const observer = new ResizeObserver((entries) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const entry = entries[0];
        if (!entry) return;
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      });
    });
    observer.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  // Derive the actual page render width from container size + fit mode +
  // the real page aspect ratio (once known).
  const pageWidth = (() => {
    const padding = 48; // 24px each side
    const { width: cw, height: ch } = containerSize;

    if (fitMode === "width") {
      return Math.max(300, cw - padding);
    }
    if (fitMode === "page") {
      const maxWidth = cw - padding;
      const maxHeight = ch - padding;
      let width = maxHeight / pageAspectRatio;
      if (width > maxWidth) width = maxWidth;
      return Math.max(300, width);
    }
    // custom zoom, relative to a 800px baseline
    return 800 * (zoomLevel / 100);
  })();

  const pageHeight = pageWidth * pageAspectRatio;

  // Reset state on new document
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue("1");
    setFitMode("width");
    setZoomLevel(100);
    setNumPages(0);
    setError(null);
    setIsPageLoading(true);
    setPageAspectRatio(1.414);
  }, [fileUrl]);

  // Handle citation clicks / external page jumps
  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages) {
      setCurrentPage(targetPage);
      setPageInputValue(String(targetPage));
    }
  }, [targetPage, numPages]);

  const goToPage = useCallback(
    (page: number) => {
      if (!Number.isFinite(page)) return;
      const clamped = Math.min(Math.max(1, Math.round(page)), numPages || 1);
      setIsPageLoading(true);
      setCurrentPage(clamped);
      setPageInputValue(String(clamped));
    },
    [numPages],
  );

  // Commit page-number input on blur/Enter, not on every keystroke
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  };
  const commitPageInput = () => {
    const parsed = parseInt(pageInputValue, 10);
    if (Number.isFinite(parsed)) {
      goToPage(parsed);
    } else {
      setPageInputValue(String(currentPage));
    }
  };
  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleFitWidth = () => setFitMode("width");
  const handleFitPage = () => setFitMode("page");
  const handleZoomIn = () => {
    setFitMode("custom");
    setZoomLevel((prev) => Math.min(300, prev + 25));
  };
  const handleZoomOut = () => {
    setFitMode("custom");
    setZoomLevel((prev) => Math.max(25, prev - 25));
  };

  const handlePageLoadSuccess = (page: any) => {
    // Learn the REAL aspect ratio from the rendered page instead of
    // assuming A4. originalWidth/originalHeight are unscaled PDF units.
    if (page?.originalWidth && page?.originalHeight) {
      setPageAspectRatio(page.originalHeight / page.originalWidth);
    }
    setIsPageLoading(false);
  };

  if (!fileUrl || !document) {
    return (
      <div className="flex-1 flex items-center justify-center bg-app-bg text-text-muted">
        <div className="text-center">
          <Maximize size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">
            Select an indexed document to begin
          </p>
          <p className="text-sm mt-2 opacity-60">Your PDF will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-app-bg">
      {/* Context Bar */}
      <div className="h-24 px-6 border-b border-border flex items-center justify-between gap-5 shrink-0 bg-sidebar-bg/50">
        <div className="min-w-0">
          <div className="text-text-muted text-[11px] mb-1 font-semibold tracking-wider">
            ACTIVE CONTEXT
          </div>
          <div className="text-[17px] font-semibold text-text-main truncate">
            {document.title}
          </div>
          <div className="text-text-muted text-xs mt-1">PDF Document</div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="pr-6 border-r border-border text-right">
            <div className="text-[17px] font-semibold text-text-main">
              {document.total_pages || "—"}
            </div>
            <div className="text-text-muted text-[10px] uppercase tracking-wider">
              Pages
            </div>
          </div>
          <div className="min-w-[65px]">
            <strong className="text-success text-[13px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-success shadow-[0_0_7px_rgba(53,216,121,0.4)]"></span>
              {document.status}
            </strong>
            <span className="block text-text-muted text-[10px] mt-1 uppercase tracking-wider">
              Status
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-[52px] border-b border-border flex items-center justify-between px-4 bg-panel shrink-0">
        <div className="flex items-center gap-1 bg-[#0b121e] border border-border rounded-md p-1">
          <button
            onClick={handleFitWidth}
            title="Fit to Width"
            className={`h-7 px-3 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${fitMode === "width" ? "bg-accent/20 text-accent-light" : "text-[#b5bfd0] hover:bg-[#172132] hover:text-white"}`}
          >
            <Minimize size={12} className="rotate-90" /> Width
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button
            onClick={handleFitPage}
            title="Fit Entire Page"
            className={`h-7 px-3 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${fitMode === "page" ? "bg-accent/20 text-accent-light" : "text-[#b5bfd0] hover:bg-[#172132] hover:text-white"}`}
          >
            <Maximize size={12} /> Page
          </button>
        </div>

        <div className="flex items-center gap-2 bg-[#0b121e] border border-border rounded-md p-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="w-7 h-7 rounded flex items-center justify-center text-[#b5bfd0] hover:bg-[#172132] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-2 px-2 text-xs text-[#d8deea] min-w-[85px] justify-center">
            <input
              type="number"
              min={1}
              max={numPages}
              value={pageInputValue}
              onChange={handlePageInputChange}
              onBlur={commitPageInput}
              onKeyDown={handlePageInputKeyDown}
              className="w-10 bg-transparent border-b border-transparent hover:border-border-light focus:border-accent outline-none text-center text-text-main font-medium [-moz-appearance:_textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-text-muted">/ {numPages || "..."}</span>
          </div>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="w-7 h-7 rounded flex items-center justify-center text-[#b5bfd0] hover:bg-[#172132] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1 bg-[#0b121e] border border-border rounded-md p-1">
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-7 h-7 rounded flex items-center justify-center text-[#b5bfd0] hover:bg-[#172132] hover:text-white transition"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setFitMode("custom")}
            className="px-2 h-7 rounded text-[11px] text-[#c3cad7] hover:bg-[#172132] hover:text-white min-w-[45px] text-center transition font-medium"
          >
            {fitMode === "custom" ? `${zoomLevel}%` : "Auto"}
          </button>
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-7 h-7 rounded flex items-center justify-center text-[#b5bfd0] hover:bg-[#172132] hover:text-white transition"
          >
            <ZoomIn size={14} />
          </button>
        </div>
      </div>

      {/* Viewer Area */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-auto bg-[#111925] flex items-start justify-center relative"
        style={{ padding: fitMode === "page" ? "24px" : "48px 24px" }}
      >
        {error && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-danger/10 text-danger p-4 rounded-lg flex items-center gap-2 border border-danger/20 z-10">
            <AlertCircle size={20} /> {error}
          </div>
        )}

        {isPageLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <Loader2
              className="animate-spin text-accent opacity-50"
              size={48}
            />
          </div>
        )}

        <Document
          file={fileUrl}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          onLoadError={() => setError("Failed to load PDF.")}
          loading={null}
        >
          {/* No width/height transition here — animating a div that wraps a
              <canvas> stretches the raster mid-transition and snaps once
              react-pdf re-renders, which reads as a blurry warp. If you want
              a fit-change animation, fade opacity instead. */}
          <div
            className="relative bg-white shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
            style={{
              width: `${pageWidth}px`,
              minHeight: `${pageHeight}px`,
            }}
          >
            <Page
              // Key only changes on document swap — NOT on page turn —
              // so react-pdf can reuse/update the canvas instead of a full
              // unmount/remount flash on every page change.
              key={fileUrl ?? "doc"}
              pageNumber={currentPage}
              width={pageWidth}
              devicePixelRatio={RENDER_DPR}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              onLoadSuccess={handlePageLoadSuccess}
              onRenderError={() => setError("Failed to render page.")}
              loading=""
            />
          </div>
        </Document>
      </div>
    </div>
  );
}
