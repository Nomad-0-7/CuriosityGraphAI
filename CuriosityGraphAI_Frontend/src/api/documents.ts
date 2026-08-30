import { fetchApi, getFileUrl } from './client';
import type { Document } from '../types';

export const getDocuments = () => fetchApi<Document[]>('/api/documents');
export const getDocument = (id: string) => fetchApi<Document>(`/api/documents/${id}`);
export const getDocumentStatus = (id: string) => fetchApi<Document>(`/api/documents/${id}/status`);
export const deleteDocument = (id: string) => fetchApi<{ deleted: boolean }>(`/api/documents/${id}`, { method: 'DELETE' });

export const uploadDocument = async (file: File): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  return fetchApi<Document>('/api/documents/upload', {
    method: 'POST',
    body: formData,
  });
};

export const getDocumentFileUrl = (id: string) => getFileUrl(`/api/documents/${id}/file`);