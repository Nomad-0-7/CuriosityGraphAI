export interface Document {
  id: string;
  title: string;
  file_size_bytes: number;
  total_pages: number | null;
  status: 'UPLOADED' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Source {
  chunk_id: string;
  page: number;
  similarity: number;
  snippet?: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  sources: Source[] | null;
  created_at: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
  thread_id: string;
  document_id: string;
}

export interface LLMSettings {
  provider?: string;
  model?: string;
  has_api_key: boolean;
}