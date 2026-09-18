import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  PanelLeft,
  PanelRight,
} from "lucide-react";
import type { Document as DocType } from "../../types";
import { useScrollWindow } from "../../hooks/useScrollWindow";

import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

type FitMode = "width" | "page" | "custom";

const RENDER_DPR = Math.min(window.devicePixelRatio || 1, 2);

const STAGE_PAD_X = 24;
const STAGE_PAD_Y = 24;
const PAGE_GAP = 24;
const PAGE_OVERSCAN = 1;

const THUMB_WIDTH = 84;
const THUMB_GAP = 12;
const THUMB_PAD_Y = 12;
const THUMB_OVERSCAN = 4;

const DEFAULT_ASPECT = 1.414;
const DEFAULT_NATURAL_WIDTH = 612;

interface Props {
  fileUrl: string | null;
  targetPage: number | null;
  document: DocType | null;
  isSidebarOpen: boolean;
  isChatOpen: boolean;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
}

export default function PDFViewer({
  fileUrl,
  targetPage,
  document,
  isSidebarOpen,
  isChatOpen,
  onToggleSidebar,
  onToggleChat,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInputValue, setPageInputValue] = useState("1");
  const [fitMode, setFitMode] = useState<FitMode>("width");
  const [zoomLevel, setZoomLevel] = useState(100);
  const [error, setError] = useState<string | null>(null);
  const [isDocLoading, setIsDocLoading] = useState(true);

  const [pageAspectRatio, setPageAspectRatio] = useState(DEFAULT_ASPECT);
  const [naturalWidth, setNaturalWidth] = useState(DEFAULT_NATURAL_WIDTH);

  const scrollLockRef = useRef<{ page: number; until: number } | null>(null);

  // Stage hook: used ONLY for measurement + scrollTop (range computed below)
  const stage = useScrollWindow({
    count: numPages,
    itemSize: 1,
    padTop: STAGE_PAD_Y,
    overscan: 0,
    resetKey: fileUrl,
  });

  const thumbSlot = THUMB_WIDTH * pageAspectRatio + THUMB_GAP;
  const rail = useScrollWindow({
    count: numPages,
    itemSize: thumbSlot,
    padTop: THUMB_PAD_Y,
    overscan: THUMB_OVERSCAN,
    resetKey: fileUrl,
  });

  // ---- Geometry -----------------------------------------------------------
  const pageWidth = useMemo(() => {
    const availW = (stage.viewport.width || 900) - STAGE_PAD_X * 2;
    const availH = (stage.viewport.height || 700) - STAGE_PAD_Y * 2;
    if (fitMode === "width") return Math.max(200, availW);
    if (fitMode === "page") {
      return Math.max(200, Math.min(availH / pageAspectRatio, availW));
    }
    return Math.max(120, naturalWidth * (zoomLevel / 100));
  }, [
    stage.viewport.width,
    stage.viewport.height,
    fitMode,
    pageAspectRatio,
    naturalWidth,
    zoomLevel,
  ]);

  const pageHeight = pageWidth * pageAspectRatio;
  const slot = pageHeight + PAGE_GAP;

  // ---- Reset on new document ----------------------------------------------
  useEffect(() => {
    setCurrentPage(1);
    setPageInputValue("1");
    setFitMode("width");
    setZoomLevel(100);
    setNumPages(0);
    setError(null);
    setIsDocLoading(true);
    setPageAspectRatio(DEFAULT_ASPECT);
    setNaturalWidth(DEFAULT_NATURAL_WIDTH);
    scrollLockRef.current = null;
    stage.scrollToOffset(0, "auto");
    rail.scrollToOffset(0, "auto");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  // ---- Scroll-spy (top-aligned, padding/gap aware) --------------------------
  useEffect(() => {
    if (!numPages || slot <= 0) return;
    const lock = scrollLockRef.current;
    if (lock && Date.now() < lock.until) {
      setCurrentPage((prev) => (prev === lock.page ? prev : lock.page));
      return;
    }
    if (lock) scrollLockRef.current = null;
    const idx = Math.min(
      numPages,
      Math.max(1, Math.floor((stage.scrollTop - STAGE_PAD_Y) / slot) + 1),
    );
    setCurrentPage((prev) => (prev === idx ? prev : idx));
  }, [stage.scrollTop, numPages, slot]);

  useEffect(() => {
    setPageInputValue(String(currentPage));
  }, [currentPage]);

  // ---- Zoom / resize scroll anchoring ---------------------------------------
  const prevSlotRef = useRef(slot);
  useEffect(() => {
    const prev = prevSlotRef.current;
    if (prev === slot) return;
    prevSlotRef.current = slot;
    if (!numPages) return;
    scrollLockRef.current = { page: currentPage, until: Date.now() + 200 };
    stage.scrollToOffset(STAGE_PAD_Y + (currentPage - 1) * slot, "auto");
  }, [slot, numPages, currentPage, stage]);

  // ---- Navigation -------------------------------------------------------------
  const railCenterThumb = useCallback(
    (page: number, behavior: ScrollBehavior) => {
      const el = rail.containerRef.current;
      if (!el) return;
      const offset =
        THUMB_PAD_Y +
        (page - 1) * thumbSlot -
        el.clientHeight / 2 +
        thumbSlot / 2;
      rail.scrollToOffset(offset, behavior);
    },
    [rail, thumbSlot],
  );

  const goToPage = useCallback(
    (page: number, behavior: ScrollBehavior = "smooth") => {
      if (!numPages || slot <= 0) return;
      const clamped = Math.min(numPages, Math.max(1, Math.round(page)));
      scrollLockRef.current = {
        page: clamped,
        until: Date.now() + (behavior === "smooth" ? 900 : 200),
      };
      stage.scrollToOffset(STAGE_PAD_Y + (clamped - 1) * slot, behavior);
      railCenterThumb(clamped, behavior);
      setCurrentPage((prev) => (prev === clamped ? prev : clamped));
    },
    [numPages, slot, stage, railCenterThumb],
  );

  useEffect(() => {
    if (targetPage && targetPage >= 1 && targetPage <= numPages) {
      goToPage(targetPage, "smooth");
    }
  }, [targetPage, numPages, goToPage]);

  // Keep active thumbnail visible during free scrolling
  useEffect(() => {
    if (!numPages) return;
    if (scrollLockRef.current && Date.now() < scrollLockRef.current.until)
      return;
    const el = rail.containerRef.current;
    if (!el) return;
    const top = THUMB_PAD_Y + (currentPage - 1) * thumbSlot;
    if (
      top < el.scrollTop ||
      top + thumbSlot > el.scrollTop + el.clientHeight
    ) {
      rail.scrollToOffset(top - el.clientHeight / 2 + thumbSlot / 2, "auto");
    }
  }, [currentPage, numPages, thumbSlot, rail]);

  // ---- Page input ---------------------------------------------------------------
  const commitPageInput = () => {
    const parsed = parseInt(pageInputValue, 10);
    if (Number.isFinite(parsed) && parsed !== currentPage) goToPage(parsed);
    else setPageInputValue(String(currentPage));
  };

  const handlePageLoad = useCallback((page: any) => {
    if (page?.originalWidth && page?.originalHeight) {
      setPageAspectRatio(page.originalHeight / page.originalWidth);
      setNaturalWidth(page.originalWidth);
    }
  }, []);

  const handleZoomIn = () => {
    setFitMode("custom");
    setZoomLevel((prev) => Math.min(300, prev + 25));
  };
  const handleZoomOut = () => {
    setFitMode("custom");
    setZoomLevel((prev) => Math.max(25, prev - 25));
  };

  // ---- Virtualized ranges (fully derived from LIVE scroll state) ---------------
  const stageRange = useMemo(() => {
    if (numPages <= 0) return { start: 1, end: 0 };
    if (slot <= 0 || stage.viewport.height <= 0) {
      return { start: 1, end: Math.min(numPages, 3) };
    }
    const first = Math.floor((stage.scrollTop - STAGE_PAD_Y) / slot) + 1;
    const last =
      Math.ceil(
        (stage.scrollTop + stage.viewport.height - STAGE_PAD_Y) / slot,
      ) + 1;
    let start = Math.max(1, Math.min(first, last) - PAGE_OVERSCAN);
    let end = Math.min(numPages, Math.max(first, last) + PAGE_OVERSCAN);
    // HARD GUARANTEE: the current page is never unrendered
    start = Math.min(start, currentPage);
    end = Math.max(end, currentPage);
    return { start, end };
  }, [numPages, slot, stage.scrollTop, stage.viewport.height, currentPage]);

  const railRange = useMemo(
    () => ({
      start: Math.max(1, Math.min(rail.range.start, currentPage)),
      end: Math.min(numPages, Math.max(rail.range.end, currentPage)),
    }),
    [rail.range.start, rail.range.end, currentPage, numPages],
  );

  const stagePages = useMemo(() => {
    const list: number[] = [];
    for (let p = stageRange.start; p <= stageRange.end; p++) list.push(p);
    return list;
  }, [stageRange.start, stageRange.end]);

  const railPages = useMemo(() => {
    const list: number[] = [];
    for (let p = railRange.start; p <= railRange.end; p++) list.push(p);
    return list;
  }, [railRange.start, railRange.end]);

  const stageTopSpacer = Math.max(0, (stageRange.start - 1) * slot);
  const stageBottomSpacer = Math.max(0, (numPages - stageRange.end) * slot);
  const railTopSpacer = Math.max(0, (railRange.start - 1) * thumbSlot);
  const railBottomSpacer = Math.max(0, (numPages - railRange.end) * thumbSlot);

  const toggleBtn =
    "w-8 h-8 rounded flex items-center justify-center text-[#b5bfd0] hover:bg-[#172132] hover:text-white transition";

  // ---- Empty state ---------------------------------------------------------------
  if (!fileUrl || !document) {
    return (
      <div className="relative flex-1 h-full min-h-0 flex items-center justify-center bg-app-bg text-text-muted">
        {!isSidebarOpen && (
          <button
            onClick={onToggleSidebar}
            title="Open Sidebar"
            className={`absolute top-4 left-4 ${toggleBtn} border border-border-light bg-panel`}
          >
            <PanelLeft size={16} />
          </button>
        )}
        {!isChatOpen && (
          <button
            onClick={onToggleChat}
            title="Open Chat"
            className={`absolute top-4 right-4 ${toggleBtn} border border-border-light bg-panel`}
          >
            <PanelRight size={16} />
          </button>
        )}
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
    <div className="flex-1 h-full min-h-0 flex flex-col min-w-0 border-r border-border bg-app-bg">
      {/* Toolbar (top row — context bar removed) */}
      <div className="h-[52px] border-b border-border flex items-center justify-between px-4 bg-panel shrink-0 gap-3">
        <div className="flex items-center gap-1 bg-[#0b121e] border border-border rounded-md p-1">
          {!isSidebarOpen && (
            <>
              <button
                onClick={onToggleSidebar}
                title="Open Sidebar"
                className={toggleBtn}
              >
                <PanelLeft size={14} />
              </button>
              <div className="w-px h-4 bg-border mx-1"></div>
            </>
          )}
          <button
            onClick={() => setFitMode("width")}
            title="Fit to Width"
            className={`h-7 px-3 rounded text-[11px] font-medium flex items-center justify-center gap-1.5 transition ${fitMode === "width" ? "bg-accent/20 text-accent-light" : "text-[#b5bfd0] hover:bg-[#172132] hover:text-white"}`}
          >
            <Minimize size={12} className="rotate-90" /> Width
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button
            onClick={() => setFitMode("page")}
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
              onChange={(e) => setPageInputValue(e.target.value)}
              onBlur={commitPageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setPageInputValue(String(currentPage));
                  (e.target as HTMLInputElement).blur();
                }
              }}
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
          <button className={toggleBtn} title="Search in document">
            <Search size={14} />
          </button>
          <div className="w-px h-4 bg-border mx-1"></div>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            className={toggleBtn}
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setFitMode("custom")}
            className="px-2 h-7 rounded text-[11px] text-[#c3cad7] hover:bg-[#172132] hover:text-white min-w-[45px] text-center transition font-medium"
          >
            {fitMode === "custom" ? `${zoomLevel}%` : "Auto"}
          </button>
          <button onClick={handleZoomIn} title="Zoom In" className={toggleBtn}>
            <ZoomIn size={14} />
          </button>
          {!isChatOpen && (
            <>
              <div className="w-px h-4 bg-border mx-1"></div>
              <button
                onClick={onToggleChat}
                title="Open Chat"
                className={toggleBtn}
              >
                <PanelRight size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body: virtualized rail + continuous-scroll stage */}
      <Document
        file={fileUrl}
        onLoadSuccess={({ numPages }) => {
          setNumPages(numPages);
          setIsDocLoading(false);
        }}
        onLoadError={() => setError("Failed to load PDF.")}
        loading={null}
        className="flex-1 min-h-0 flex overflow-hidden bg-[#111925]"
      >
        {/* Thumbnail rail */}
        <div
          ref={rail.setContainerRef}
          className="w-[110px] shrink-0 h-full overflow-y-auto border-r border-border bg-[#0d1421]"
        >
          <div style={{ paddingTop: THUMB_PAD_Y, paddingBottom: THUMB_PAD_Y }}>
            <div style={{ height: railTopSpacer }} />
            <div
              className="flex flex-col items-center"
              style={{ gap: THUMB_GAP }}
            >
              {railPages.map((p) => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`shrink-0 bg-white rounded-sm overflow-hidden transition ${p === currentPage ? "ring-2 ring-accent" : "ring-1 ring-border opacity-70 hover:opacity-100"}`}
                  style={{ width: THUMB_WIDTH }}
                >
                  <Page
                    pageNumber={p}
                    width={THUMB_WIDTH}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    loading=""
                  />
                </button>
              ))}
            </div>
            <div style={{ height: railBottomSpacer }} />
          </div>
        </div>

        {/* Continuous scroll stage */}
        <div
          ref={stage.setContainerRef}
          className="flex-1 min-w-0 h-full overflow-auto relative"
        >
          {error && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-danger/10 text-danger p-4 rounded-lg flex items-center gap-2 border border-danger/20 z-10">
              <AlertCircle size={20} /> {error}
            </div>
          )}
          {isDocLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none bg-[#111925]">
              <Loader2
                className="animate-spin text-accent opacity-50"
                size={48}
              />
            </div>
          )}

          <div
            className="mx-auto w-fit min-w-full"
            style={{ padding: `${STAGE_PAD_Y}px ${STAGE_PAD_X}px` }}
          >
            <div style={{ height: stageTopSpacer }} />
            {/* items-center = pages stay centered at any zoom level */}
            <div
              className="flex flex-col items-center"
              style={{ gap: PAGE_GAP }}
            >
              {stagePages.map((p) => (
                <div
                  key={p}
                  className="relative bg-white shadow-[0_8px_30px_rgba(0,0,0,0.5)] shrink-0"
                  style={{ width: `${pageWidth}px`, height: `${pageHeight}px` }}
                >
                  <Page
                    pageNumber={p}
                    width={pageWidth}
                    devicePixelRatio={RENDER_DPR}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={handlePageLoad}
                    onRenderError={() =>
                      setError(`Failed to render page ${p}.`)
                    }
                    loading=""
                  />
                </div>
              ))}
            </div>
            <div style={{ height: stageBottomSpacer }} />
          </div>
        </div>
      </Document>
    </div>
  );
}
