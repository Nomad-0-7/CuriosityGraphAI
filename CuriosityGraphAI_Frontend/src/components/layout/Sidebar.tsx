import {
  Upload,
  FileText,
  Settings,
  Sparkles,
  HelpCircle,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import type { Document } from "../../types";

interface Props {
  documents: Document[];
  selectedId: string | null;
  onSelect: (doc: Document) => void;
  onUpload: (file: File) => void;
  onOpenSettings: () => void;
  onOpenApiModel: () => void;
  isUploading: boolean;
}

export default function Sidebar({
  documents,
  selectedId,
  onSelect,
  onUpload,
  onOpenSettings,
  onOpenApiModel,
  isUploading,
}: Props) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUpload(e.target.files[0]);
      e.target.value = "";
    }
  };

  const getStatusColor = (status: string) => {
    if (status === "INDEXED")
      return "bg-success shadow-[0_0_7px_rgba(53,216,121,0.4)]";
    if (status === "PROCESSING") return "bg-warning";
    if (status === "FAILED") return "bg-danger";
    return "bg-text-muted";
  };

  const getStatusText = (status: string) => {
    if (status === "INDEXED") return "text-[#71e59c]";
    if (status === "PROCESSING") return "text-[#f4c15b]";
    if (status === "FAILED") return "text-[#ef7977]";
    return "text-text-muted";
  };

  return (
    <aside className="w-[280px] bg-sidebar-bg border-r border-border flex flex-col h-screen p-4 pt-6 min-w-[280px]">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="w-9 h-9 flex items-center justify-center rounded-[10px] bg-gradient-to-br from-[#6944ff] to-[#8b68ff] shadow-[0_0_25px_rgba(112,76,255,0.2)] text-white text-xl font-bold">
          <Sparkles size={20} />
        </div>
        <div>
          <div className="text-[17px] font-bold tracking-tight text-text-main">
            CuriosityGraphAI
          </div>
          <div className="text-text-muted text-[11px] mt-0.5">
            RAG Document Assistant
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <label
        className={`flex items-center justify-center gap-2 w-full h-[42px] rounded-lg bg-gradient-to-br from-[#704cff] to-[#6540e7] font-semibold cursor-pointer shadow-[0_8px_24px_rgba(112,76,255,0.16)] hover:brightness-110 hover:-translate-y-0.5 transition-all ${isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {isUploading ? (
          <Loader2 className="animate-spin" size={16} />
        ) : (
          <Upload size={16} />
        )}
        <span className="text-sm">Upload PDF</span>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      <div className="text-[#aab4c5] text-[11px] font-semibold tracking-[0.8px] mt-6 mb-3 px-2">
        DOCUMENTS
      </div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {documents.length === 0 && !isUploading && (
          <p className="text-center text-text-muted text-xs mt-10 px-4">
            No documents yet. Upload a PDF to start.
          </p>
        )}

        {documents.map((doc) => (
          <button
            key={doc.id}
            onClick={() => onSelect(doc)}
            className={`w-full text-left p-3 rounded-[9px] border transition-all group ${
              selectedId === doc.id
                ? "border-accent bg-gradient-to-br from-accent/15 to-accent/5"
                : "border-border bg-panel/65 hover:border-[#3a4760] hover:bg-[#121b2b]"
            }`}
          >
            <div className="flex gap-2.5">
              <div className="w-7 h-8 flex-shrink-0 flex items-center justify-center border border-[#39445a] rounded bg-[#151e2c] text-text-muted">
                <FileText size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate text-text-main">
                  {doc.title}
                </div>
                <div className="text-text-muted text-[11px] mt-1 truncate">
                  {doc.status === "FAILED"
                    ? doc.error_message || "Processing failed"
                    : "PDF Document"}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2.5 text-[11px] text-text-muted">
              <div className="flex items-center gap-1.5">
                {doc.status === "PROCESSING" ? (
                  <Loader2 size={10} className="text-warning animate-spin" />
                ) : (
                  <span
                    className={`w-[7px] h-[7px] rounded-full ${getStatusColor(doc.status)}`}
                  ></span>
                )}
                <span className={`capitalize ${getStatusText(doc.status)}`}>
                  {doc.status.toLowerCase()}
                </span>
              </div>
              <span>{doc.total_pages ? `${doc.total_pages} pages` : "—"}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-1 pt-3 mt-3 border-t border-border">
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-3 w-full h-10 px-3 rounded-lg text-[#aeb8c9] hover:bg-[#131d2c] hover:text-white transition text-sm text-left"
        >
          <Settings size={16} /> Settings
        </button>
        <button
          onClick={onOpenApiModel}
          className="flex items-center gap-3 w-full h-10 px-3 rounded-lg text-[#aeb8c9] hover:bg-[#131d2c] hover:text-white transition text-sm text-left"
        >
          <Sparkles size={16} /> API & Model
        </button>
        <button className="flex items-center gap-3 w-full h-10 px-3 rounded-lg text-[#aeb8c9] hover:bg-[#131d2c] hover:text-white transition text-sm text-left">
          <HelpCircle size={16} /> Help & Documentation
        </button>
      </div>
    </aside>
  );
}
