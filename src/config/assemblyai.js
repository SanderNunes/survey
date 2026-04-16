import { AssemblyAI } from 'assemblyai';

export const assemblyClient = new AssemblyAI({
  apiKey: import.meta.env.VITE_ASSEMBLYAI_API_KEY || '',
});
