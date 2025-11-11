
import React from 'react';
import { Analysis } from '../types';
import Spinner from './Spinner';
import { CheckCircleIcon, AlertTriangleIcon, SparklesIcon, FileTextIcon, DollarSignIcon, ShieldAlertIcon } from './Icons';

interface AnalysisDisplayProps {
  analysis: Analysis | null;
  isLoading: boolean;
  error: string | null;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Spinner />
        <p className="mt-4 text-lg">AI is analyzing your document...</p>
        <p className="text-sm">This may take a moment.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 bg-red-900/20 p-6 rounded-lg">
        <AlertTriangleIcon className="w-12 h-12 mb-4" />
        <h3 className="text-xl font-semibold">Analysis Failed</h3>
        <p className="mt-2 text-center">{error}</p>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <SparklesIcon className="w-16 h-16 mb-4" />
        <p className="text-lg">Your analysis will appear here.</p>
      </div>
    );
  }

  const renderListItems = (items: string[]) => {
    if (items.length === 0) {
      return <li className="text-slate-500 italic">No items found.</li>;
    }
    return items.map((item, index) => (
      <li key={index} className="flex items-start gap-2">
        <CheckCircleIcon className="w-5 h-5 text-teal-400 flex-shrink-0 mt-1" />
        <span>{item}</span>
      </li>
    ));
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-slate-850 p-4 rounded-lg">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-100 mb-3">
            <FileTextIcon className="w-6 h-6 text-blue-400" />
            Summary
        </h3>
        <p className="text-slate-300">{analysis.summary}</p>
      </div>

      <div className="bg-slate-850 p-4 rounded-lg">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-slate-100 mb-3">
            <SparklesIcon className="w-6 h-6 text-blue-400" />
            Critical Findings
        </h3>
        <ul className="space-y-2 text-slate-300 list-inside">
          {renderListItems(analysis.criticalFindings)}
        </ul>
      </div>

      <div className="bg-slate-850 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                 <h4 className="flex items-center gap-2 text-lg font-semibold text-slate-100 mb-3">
                    <DollarSignIcon className="w-5 h-5 text-green-400" />
                    Cost Analysis
                 </h4>
                <ul className="space-y-2 text-slate-300 list-inside">
                    {renderListItems(analysis.costAndRiskAnalysis.costs)}
                </ul>
            </div>
            <div className="border-t border-slate-700 md:border-t-0 md:border-l md:border-slate-700 md:pl-6">
                <h4 className="flex items-center gap-2 text-lg font-semibold text-slate-100 mb-3 pt-6 md:pt-0">
                    <ShieldAlertIcon className="w-5 h-5 text-amber-400" />
                    Risk Analysis
                </h4>
                <ul className="space-y-2 text-slate-300 list-inside">
                    {renderListItems(analysis.costAndRiskAnalysis.risks)}
                </ul>
            </div>
          </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;
