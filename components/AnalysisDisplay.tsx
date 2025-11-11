import React from 'react';
import { Analysis } from '../types';
import Spinner from './Spinner';
import { CheckCircleIcon, AlertTriangleIcon, SparklesIcon, FileTextIcon, DollarSignIcon, ShieldAlertIcon, DownloadIcon } from './Icons';
import * as jspdf from 'jspdf';

interface AnalysisDisplayProps {
  analysis: Analysis | null;
  isLoading: boolean;
  error: string | null;
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysis, isLoading, error }) => {

  const handleDownloadPdf = () => {
    if (!analysis) return;

    const doc = new jspdf.jsPDF();
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = margin;

    const addPageNumbers = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    };

    const addSection = (title: string, content: string | string[], color: [number, number, number]) => {
      if (y + 15 > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(title, margin, y);
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);

      if (Array.isArray(content)) {
        if (content.length === 0) {
          if (y + 10 > pageHeight - margin) { doc.addPage(); y = margin; }
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(128, 128, 128);
          doc.text('No items found.', margin, y);
          y += 10;
        } else {
          content.forEach(item => {
            const textLines = doc.splitTextToSize(item, pageWidth - margin * 2 - 5);
            const textHeight = textLines.length * 5;
            if (y + textHeight > pageHeight - margin) {
              doc.addPage();
              y = margin;
            }
            doc.text(`• ${item}`, margin, y, { maxWidth: pageWidth - margin * 2 });
            y += textHeight + 2;
          });
        }
      } else {
        const textLines = doc.splitTextToSize(content, pageWidth - margin * 2);
        const textHeight = textLines.length * 5;
        if (y + textHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(content, margin, y, { maxWidth: pageWidth - margin * 2 });
        y += textHeight + 5;
      }
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      y += 5;
    };

    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('AI Document Analysis Report', pageWidth / 2, y, { align: 'center' });
    y += 15;

    addSection('Summary', analysis.summary, [4, 98, 201]); // Blue
    addSection('Critical Findings', analysis.criticalFindings, [4, 98, 201]); // Blue
    addSection('Cost Analysis', analysis.costAndRiskAnalysis.costs, [22, 115, 82]); // Green
    addSection('Risk Analysis', analysis.costAndRiskAnalysis.risks, [217, 119, 6]); // Amber

    addPageNumbers();
    doc.save('summary_and_analysis.pdf');
  };

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
      <div className="text-right">
        <button
          onClick={handleDownloadPdf}
          className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-md"
        >
          <DownloadIcon className="w-5 h-5" />
          Download Summary & Analysis (PDF)
        </button>
      </div>

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