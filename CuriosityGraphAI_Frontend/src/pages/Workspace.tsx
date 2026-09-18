import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Sidebar from "../components/layout/Sidebar";
import PDFViewer from "../components/pdf/PDFViewer";
import ChatPanel from "../components/chat/ChatPanel";
import SettingsModal from "../components/settings/SettingsModal";
import ApiModelModal from "../components/settings/ApiModelModal";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentFileUrl,
} from "../api/documents";
import { sendChatMessage, getThreadMessages } from "../api/chat";
import type { Document, Message } from "../types";
import { X } from "lucide-react";

export default function Workspace() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiModel, setShowApiModel] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [backendDown, setBackendDown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(true);

  const docsRef = useRef<Document[]>([]);

  // Identity-stable selection: only changes when the doc's data changes
  const selectedDoc = useMemo(
    () => documents.find((d) => d.id === selectedId) ?? null,
    [documents, selectedId],
  );

  // Stable poll: deep-compares before setState, so unchanged polls = zero rerenders
  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      const prev = docsRef.current;
      const changed =
        docs.length !== prev.length ||
        docs.some((d, i) => {
          const p = prev[i];
          return (
            !p ||
            p.id !== d.id ||
            p.title !== d.title ||
            p.status !== d.status ||
            p.total_pages !== d.total_pages ||
            p.error_message !== d.error_message
          );
        });
      if (changed) {
        docsRef.current = docs;
        setDocuments(docs);
      }
      setBackendDown(false);
    } catch {
      setBackendDown(true);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  // Thread loading keyed on PRIMITIVES (id + status), not object identity
  const docId = selectedDoc?.id ?? null;
  const docStatus = selectedDoc?.status ?? null;

  useEffect(() => {
    if (!docId || docStatus !== "INDEXED") {
      setMessages([]);
      setActiveThreadId(null);
      return;
    }
    const savedThreadId = localStorage.getItem(`thread_${docId}`);
    if (savedThreadId) {
      setActiveThreadId(savedThreadId);
      getThreadMessages(savedThreadId)
        .then(setMessages)
        .catch(() => {
          localStorage.removeItem(`thread_${docId}`);
          setActiveThreadId(null);
          setMessages([]);
        });
    } else {
      setActiveThreadId(null);
      setMessages([]);
    }
  }, [docId, docStatus]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setGlobalError(null);
    try {
      const newDoc = await uploadDocument(file);
      setDocuments((prev) => {
        const next = [newDoc, ...prev.filter((d) => d.id !== newDoc.id)];
        docsRef.current = next;
        return next;
      });
      setSelectedId(newDoc.id);
    } catch (err: any) {
      setGlobalError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => {
        const next = prev.filter((d) => d.id !== id);
        docsRef.current = next;
        return next;
      });
      if (selectedId === id) {
        setSelectedId(null);
        localStorage.removeItem(`thread_${id}`);
        setMessages([]);
        setActiveThreadId(null);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Failed to delete document");
    }
  };

  const handleSendMessage = async (question: string) => {
    if (!selectedDoc) return;
    setIsChatting(true);
    setGlobalError(null);

    const tempUserMsg: Message = {
      id: crypto.randomUUID(),
      thread_id: activeThreadId || "",
      role: "user",
      content: question,
      sources: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await sendChatMessage(
        selectedDoc.id,
        question,
        activeThreadId || undefined,
      );
      if (!activeThreadId) {
        setActiveThreadId(response.thread_id);
        localStorage.setItem(`thread_${selectedDoc.id}`, response.thread_id);
      }
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        thread_id: response.thread_id,
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setGlobalError(err.message || "Failed to get response");
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsChatting(false);
    }
  };

  const handleNewThread = () => {
    setMessages([]);
    setActiveThreadId(null);
    if (selectedId) localStorage.removeItem(`thread_${selectedId}`);
  };

  const handleCitationClick = (page: number) => {
    setTargetPage(page);
    setTimeout(() => setTargetPage(null), 1000);
  };

  const banner = backendDown ? "Failed to connect to backend." : globalError;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg relative">
      {banner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-danger/10 border border-danger/30 text-danger px-4 py-2 rounded-md shadow-lg z-50 text-sm flex items-center gap-2">
          {banner}
          <button onClick={() => setGlobalError(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Sidebar panel */}
      <div
        className={`h-full min-h-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarOpen ? "w-[280px] opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div className="w-[280px] h-full relative">
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="absolute top-4 right-2 z-50 w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-white hover:bg-[#172132] transition"
            title="Close Sidebar"
          >
            <X size={16} />
          </button>
          <Sidebar
            documents={documents}
            selectedId={selectedId}
            onSelect={(doc) => setSelectedId(doc.id)}
            onUpload={handleUpload}
            onDelete={handleDelete}
            onOpenSettings={() => setShowSettings(true)}
            onOpenApiModel={() => setShowApiModel(true)}
            isUploading={isUploading}
          />
        </div>
      </div>

      {/* Center viewer — toggles now live inside its toolbar */}
      <PDFViewer
        fileUrl={
          selectedDoc && selectedDoc.status === "INDEXED"
            ? getDocumentFileUrl(selectedDoc.id)
            : null
        }
        targetPage={targetPage}
        document={selectedDoc}
        isSidebarOpen={isSidebarOpen}
        isChatOpen={isChatOpen}
        onToggleSidebar={() => setIsSidebarOpen((v) => !v)}
        onToggleChat={() => setIsChatOpen((v) => !v)}
      />

      {/* Chat panel */}
      <div
        className={`h-full min-h-0 transition-all duration-300 ease-in-out overflow-hidden ${
          isChatOpen ? "w-[410px] opacity-100" : "w-0 opacity-0"
        }`}
      >
        <div className="w-[410px] h-full">
          <ChatPanel
            messages={messages}
            isLoading={isChatting}
            onSend={handleSendMessage}
            onCitationClick={handleCitationClick}
            onNewThread={handleNewThread}
            onClose={() => setIsChatOpen(false)}
            documentTitle={selectedDoc?.title || null}
          />
        </div>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
      <ApiModelModal
        isOpen={showApiModel}
        onClose={() => setShowApiModel(false)}
      />
    </div>
  );
}
