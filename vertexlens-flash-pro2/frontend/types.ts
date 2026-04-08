export interface AnalysisResult {
  fileName: string;
  description: string;
  topics: string[];
  overallSentiment: string;
  actionItems: string[];
}

export interface VideoItem {
  id: string;
  file: File;
  status: 'idle' | 'analyzing' | 'completed' | 'error';
  analysis: AnalysisResult | null;
  error?: string;
}