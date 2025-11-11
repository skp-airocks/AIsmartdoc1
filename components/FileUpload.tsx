
import React, { useCallback, useState } from 'react';
import { UploadCloudIcon, FileTextIcon } from './Icons';

interface FileUploadProps {
  onFileChange: (file: File | null) => void;
  fileDataUrl: string | null;
  file: File | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileChange, fileDataUrl, file }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    onFileChange(file);
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
    const file = e.dataTransfer.files?.[0] || null;
    onFileChange(file);
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-300 h-64 flex flex-col items-center justify-center
        ${isDragging ? 'border-blue-500 bg-slate-800' : 'border-slate-600 hover:border-blue-500 hover:bg-slate-850'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="image/png, image/jpeg, image/webp, application/pdf"
      />
      {fileDataUrl && file ? (
        file.type.startsWith('image/') ? (
          <img src={fileDataUrl} alt="Preview" className="max-h-full max-w-full object-contain rounded-md" />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-300">
            <FileTextIcon className="w-16 h-16 mb-4" />
            <p className="font-semibold truncate max-w-full px-2">{file.name}</p>
          </div>
        )
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-400">
          <UploadCloudIcon className="w-12 h-12 mb-4" />
          <p className="font-semibold">Click to upload or drag and drop</p>
          <p className="text-sm">Supports: PDF, PNG, JPG, WEBP</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
