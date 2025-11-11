import React, { useCallback, useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'xlsx'; // Import to ensure the script is loaded via import map
import { UploadCloudIcon, FileTextIcon, FileSpreadsheetIcon, LockIcon } from './Icons';
import Spinner from './Spinner';

interface FileUploadProps {
  onFileChange: (file: File | null, extractedText?: string | null) => void;
  fileDataUrl: string | null;
  file: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, fileDataUrl, file }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  
  // State for password-protected PDFs
  const [passwordRequiredFile, setPasswordRequiredFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);


  useEffect(() => {
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
    } catch(e) {
        console.error("Error setting up pdf.js worker", e)
    }
  }, []);

  const resetPasswordState = () => {
    setPasswordRequiredFile(null);
    setPassword('');
    setPasswordError(null);
  };

  const extractTextFromPdf = async (fileToProcess: File, providedPassword?: string): Promise<string> => {
    const arrayBuffer = await fileToProcess.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({
      data: arrayBuffer,
      ...(providedPassword && { password: providedPassword }),
    });

    const pdf = await loadingTask.promise;
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

  const handleFileSelect = useCallback(async (selectedFile: File | null) => {
    if (!selectedFile) {
        resetPasswordState();
        onFileChange(null);
        return;
    }
    
    resetPasswordState();
    setIsProcessing(true);

    try {
        if (selectedFile.type === 'application/pdf') {
            setProcessingMessage('Extracting text from PDF...');
            const text = await extractTextFromPdf(selectedFile);
            onFileChange(selectedFile, text);
        } else if (selectedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            setProcessingMessage('Processing Excel sheets...');
            const text = await extractTextFromXlsx(selectedFile);
            onFileChange(selectedFile, text);
        } else {
            onFileChange(selectedFile);
        }
    } catch (error: any) {
        // More robust check for password errors from pdf.js
        const isPasswordError = error.name === 'PasswordException' || 
                              (error.message && error.message.toLowerCase().includes('password'));

        if (selectedFile.type === 'application/pdf' && isPasswordError) {
            console.log('File is password-protected.');
            setPasswordRequiredFile(selectedFile);
            onFileChange(selectedFile, null); // Pass file so UI can update, but no text yet
        } else {
            console.error("Error extracting text from file:", error);
            onFileChange(selectedFile, null); // Pass file without text as a fallback
        }
    } finally {
        setIsProcessing(false);
        setProcessingMessage('');
    }
  }, [onFileChange]);
  
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordRequiredFile || !password) return;

    setIsProcessing(true);
    setPasswordError(null);
    setProcessingMessage('Unlocking PDF...');

    try {
        const text = await extractTextFromPdf(passwordRequiredFile, password);
        onFileChange(passwordRequiredFile, text); // Success!
        resetPasswordState(); // Clean up
    } catch (error: any) {
        console.error("Error unlocking PDF:", error);
        // pdf.js can throw 'Invalid PDF structure' for incorrect passwords on certain files.
        if (error.name === 'PasswordException' || (error.message && error.message.includes('Invalid PDF structure'))) {
            setPasswordError('Incorrect password. Please try again.');
        } else {
            setPasswordError('Failed to unlock PDF. The file may be corrupted or use an unsupported encryption type.');
        }
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
    if(passwordRequiredFile || isProcessing) return;
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
    if(passwordRequiredFile || isProcessing) return;
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0] || null;
    handleFileSelect(droppedFile);
  };
  
  const renderFilePreview = () => {
    if (!file) return null;

    if (passwordRequiredFile) {
        return (
             <form onSubmit={handlePasswordSubmit} className="flex flex-col items-center justify-center text-slate-300 w-full animate-fade-in">
                <LockIcon className="w-12 h-12 mb-3 text-amber-400" />
                <p className="font-semibold">Password Required</p>
                <p className="text-sm text-slate-400 mb-4 max-w-xs">Enter the password for <span className="font-medium truncate">{passwordRequiredFile.name}</span></p>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-center text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-xs"
                    placeholder="Enter password..."
                    autoFocus
                />
                {passwordError && <p className="text-sm text-red-400 mt-2">{passwordError}</p>}
                <button
                    type="submit"
                    disabled={!password || isProcessing}
                    className="mt-4 w-full max-w-xs bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                   {isProcessing ? 'Unlocking...' : 'Unlock & Continue'}
                </button>
            </form>
        );
    }
    
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
        </div>
    );
  }

  const isUiDisabled = isProcessing || !!passwordRequiredFile;

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-300 h-64 flex flex-col items-center justify-center
        ${isDragging ? 'border-blue-500 bg-slate-800' : 'border-slate-600'}
        ${!isUiDisabled && 'hover:border-blue-500 hover:bg-slate-850 cursor-pointer'}
        ${isUiDisabled && 'bg-slate-850 border-slate-700'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !isUiDisabled && document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        onChange={handleInputChange}
        accept="image/png, image/jpeg, image/webp, application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        disabled={isUiDisabled}
      />
      {isProcessing && !passwordRequiredFile && (
          <div className="flex flex-col items-center text-slate-400">
            <Spinner />
            <p className="mt-4">{processingMessage || 'Processing file...'}</p>
          </div>
      )}
      {!isProcessing && file ? renderFilePreview() : null}
      {!isProcessing && !file && (
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