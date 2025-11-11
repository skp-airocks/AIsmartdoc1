
import React, { useState, useCallback } from 'react';
import { Analysis } from './types';
import { analyzeDocument } from './services/geminiService';
import FileUpload from './components/FileUpload';
import AnalysisDisplay from './components/AnalysisDisplay';
import { BrainCircuitIcon, CodeIcon } from './components/Icons';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  const PROMPT = `You are an expert document analyst AI. Your task is to transform the provided document image into an interactive summary. Analyze the content thoroughly and structure your response as a JSON object. Extract all relevant information accurately. If a section (like costs or risks) has no relevant information, return an empty array for that key. Adhere strictly to the provided JSON schema for your response.`;

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    setAnalysis(null);
    setError(null);

    if (selectedFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFileDataUrl(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setFileDataUrl(null);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!file || !fileDataUrl) {
      setError('Please upload a file first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const base64Data = fileDataUrl.split(',')[1];
      const mimeType = file.type;
      
      const result = await analyzeDocument(PROMPT, base64Data, mimeType);
      setAnalysis(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [file, fileDataUrl, PROMPT]);

  return (
    <div className="min-h-screen bg-slate-950 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-4">
             <BrainCircuitIcon className="w-12 h-12 text-blue-400" />
            <h1 className="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
              AI Document Analyzer
            </h1>
          </div>
          <p className="mt-4 text-lg text-slate-400 max-w-2xl mx-auto">
            Upload a document to receive an AI-powered summary, critical findings, and a cost/risk assessment.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-slate-900 p-6 rounded-lg shadow-2xl border border-slate-700/50 flex flex-col">
            <h2 className="text-2xl font-semibold mb-4 text-slate-100">1. Upload Document</h2>
            <FileUpload onFileChange={handleFileChange} fileDataUrl={fileDataUrl} file={file} />

            <div className="mt-6 border-t border-slate-700 pt-6">
                <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="flex items-center justify-between w-full text-left text-slate-300 hover:text-white transition"
                >
                    <span className="flex items-center gap-2 text-lg font-medium">
                        <CodeIcon className="w-5 h-5" />
                        View Expert Prompt
                    </span>
                    <svg className={`w-5 h-5 transform transition-transform ${showPrompt ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </button>
                {showPrompt && (
                    <div className="mt-4 p-4 bg-slate-850 rounded-md">
                        <p className="text-slate-400 font-mono text-sm">{PROMPT}</p>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-6">
                <button
                onClick={handleAnalyze}
                disabled={!file || isLoading}
                className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 text-lg shadow-lg"
                >
                {isLoading ? 'Analyzing...' : '2. Analyze Document'}
                </button>
            </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-lg shadow-2xl border border-slate-700/50">
            <h2 className="text-2xl font-semibold mb-4 text-slate-100">3. AI Analysis</h2>
            <AnalysisDisplay analysis={analysis} isLoading={isLoading} error={error} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
