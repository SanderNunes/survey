import { AssemblyAI } from 'assemblyai';

export const assemblyClient = new AssemblyAI({
  apiKey: import.meta.env.VITE_ASSEMBLYAI_API_KEY || '707bff5e18734bdfa075a19bffb1d3cd',
});
