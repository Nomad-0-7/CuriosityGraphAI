import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/layout/Sidebar";
import PDFViewer from "../components/pdf/PDFViewer";
import ChatPanel from "../components/chat/ChatPanel";
import SettingsModal from "../components/settings/SettingsModal";
import ApiModelModal from "../components/settings/ApiModelModal";
import {
  getDocuments,
  uploadDocument,
  deleteDocument, // <-- Make sure this is imported!
  getDocumentFileUrl,
} from "../api/documents";
import { sendChatMessage, getThreadMessages } from "../api/chat";
import type { Document, Message } from "../types";

export default function Workspace() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showApiModel, setShowApiModel] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
      if (selectedDoc) {
        const fresh = docs.find((d) => d.id === selectedDoc.id);
        if (fresh) setSelectedDoc(fresh);
      }
    } catch (err: any) {
      setGlobalError("Failed to connect to backend.");
    }
  }, [selectedDoc]);

  useEffect(() => {
    loadDocuments();
    const interval = setInterval(loadDocuments, 3000);
    return () => clearInterval(interval);
  }, [loadDocuments]);

  useEffect(() => {
    if (!selectedDoc || selectedDoc.status !== "INDEXED") {
      setMessages([]);
      setActiveThreadId(null);
      return;
    }
    const savedThreadId = localStorage.getItem(`thread_${selectedDoc.id}`);
    if (savedThreadId) {
      setActiveThreadId(savedThreadId);
      getThreadMessages(savedThreadId)
        .then(setMessages)
        .catch(() => {
          localStorage.removeItem(`thread_${selectedDoc.id}`);
          setActiveThreadId(null);
          setMessages([]);
        });
    } else {
      setActiveThreadId(null);
      setMessages([]);
    }
  }, [selectedDoc]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setGlobalError(null);
    try {
      const newDoc = await uploadDocument(file);
      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedDoc(newDoc);
    } catch (err: any) {
      setGlobalError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // --- ADD THIS FUNCTION HERE ---
  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));

      // If we deleted the currently selected document, clear the view
      if (selectedDoc?.id === id) {
        setSelectedDoc(null);
        localStorage.removeItem(`thread_${id}`);
        setMessages([]);
        setActiveThreadId(null);
      }
    } catch (err: any) {
      setGlobalError(err.message || "Failed to delete document");
    }
  };
  // ------------------------------

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
    if (selectedDoc) localStorage.removeItem(`thread_${selectedDoc.id}`);
  };

  const handleCitationClick = (page: number) => {
    setTargetPage(page);
    setTimeout(() => setTargetPage(null), 1000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg">
      {globalError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-danger/10 border border-danger/30 text-danger px-4 py-2 rounded-md shadow-lg z-50 text-sm">
          {globalError}
        </div>
      )}

      <Sidebar
        documents={documents}
        selectedId={selectedDoc?.id || null}
        onSelect={setSelectedDoc}
        onUpload={handleUpload}
        onDelete={handleDelete}
        onOpenSettings={() => setShowSettings(true)}
        onOpenApiModel={() => setShowApiModel(true)}
        isUploading={isUploading}
      />

      <PDFViewer
        fileUrl={
          selectedDoc && selectedDoc.status === "INDEXED"
            ? getDocumentFileUrl(selectedDoc.id)
            : null
        }
        targetPage={targetPage}
        document={selectedDoc}
      />

      <ChatPanel
        messages={messages}
        isLoading={isChatting}
        onSend={handleSendMessage}
        onCitationClick={handleCitationClick}
        onNewThread={handleNewThread}
        documentTitle={selectedDoc?.title || null}
      />

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
