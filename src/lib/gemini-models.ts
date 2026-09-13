export interface GeminiModelInfo {
  id: string;
  name: string;
  description?: string;
}

export const FALLBACK_GEMINI_MODELS: GeminiModelInfo[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Fast & Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro (Deep Reasoning & Complex STEM)' },
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Next-Gen Fast)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro (Frontier Reasoning)' },
];

export const AVAILABLE_GEMINI_MODELS = FALLBACK_GEMINI_MODELS;
