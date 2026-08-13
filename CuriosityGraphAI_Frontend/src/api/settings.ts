import { fetchApi } from './client';
import type { LLMSettings } from '../types';

export const getSettings = () => fetchApi<LLMSettings>('/api/settings/llm');

export const saveSettings = (provider: string, model: string, apiKey?: string) => {
  return fetchApi<LLMSettings>('/api/settings/llm', {
    method: 'POST',
    body: JSON.stringify({ provider, model, api_key: apiKey }),
  });
};