import React, { useCallback, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'xlsx'; // Import to ensure the script is loaded via import map
import { UploadCloudIcon, FileTextIcon, FileSpreadsheetIcon } from './Icons';

interface FileUploadProps {
  onFileChange: (file: File | null, extractedText?: string | null) => void;
  fileDataUrl: string | null;
  file: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, fileDataUrl, file }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');

  useEffect(() => {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    } catch(e) {
        console.error("Error setting up pdf.js worker", e)
    }
  }, []);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    setProcessingMessage('Extracting text from PDF...');
    setIsProcessing(true);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
        fullText += pageText + '\n\n';
    }
    return fullText;
  };

  const extractTextFromXlsx = async (file: File): Promise<string> => {
    setProcessingMessage('Processing Excel sheets...');
    setIsProcessing(true);
    const arrayBuffer = await file.arrayBuffer();

    // The UMD module from the CDN attaches the library to the window object.
    const XLSX = (window as any).XLSX;

    if (!XLSX || typeof XLSX.read !== 'function') {
      throw new Error("SheetJS library (xlsx) did not load correctly.");
    }

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    workbook.SheetNames.forEach(sheetName => {
        fullText += `\n\n--- SHEET: ${sheetName} ---\n\n`;
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        fullText += csv;
    });
    return fullText;
  };

  const handleFileSelect = async (selectedFile: File | null) => {
    if (!selectedFile) {
        onFileChange(null);
        return;
    }

    try {
        if (selectedFile.type === 'application/pdf') {
            const text = await extractTextFromPdf(selectedFile);
            onFileChange(selectedFile, text);
        } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            const text = await extractTextFromXlsx(selectedFile);
            onFileChange(selectedFile, text);
        } else {
            onFileChange(selectedFile);
        }
    } catch (error) {
        console.error("Error extracting text from file:", error);
        // Pass file without text as a fallback, App will show an error.
        onFileChange(selectedFile, null);
    } finally {
        setIsProcessing(false);
        setProcessingMessage('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleFileSelect(file);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  };
  
  const renderFilePreview = () => {
    if (!file) return null;

    let icon;
    if (file.type.startsWith('image/')) {
        return <img src={fileDataUrl!} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />;
    }
    if (file.type === 'application/pdf') {
        icon = <FileTextIcon className="w-16 h-16 mb-4" />;
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        icon = <FileSpreadsheetIcon className="w-16 h-16 mb-4" />;
    } else {
        icon = <FileTextIcon className="w-16 h-16 mb-4" />;
    }

    return (
        <div className="flex flex-col items-center justify-center text-slate-300">
          {icon}
          <p className="font-semibold truncate max-w-full px-2">{file.name}</p>
          {isProcessing && <p className="text-sm text-slate-400 mt-2">{processingMessage}</p>}
        </div>
    );
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 h-64 flex flex-col items-center justify-center
        ${isDragging ? 'border-blue-500 bg-slate-800' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-850'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !isProcessing && document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        onChange={handleInputChange}
        accept="image/png, image/jpeg, image/webp, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={isProcessing}
      />
      {file ? renderFilePreview() : (
        <div className="flex flex-col items-center justify-center text-slate-400">
          <UploadCloudIcon className="w-12 h-12 mb-4" />
          <p className="font-semibold">Click to upload or drag and drop</p>
          <p className="text-sm">Supports: PDF, XLSX, PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;