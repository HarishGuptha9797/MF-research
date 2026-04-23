import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileWarning, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { normalizeData } from '../utils/parseUtils';

interface FileUploadProps {
  onDataLoaded: (data: any[]) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded, isLoading }) => {
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Use header: 1 to get array of arrays for more robust parsing
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (rows.length === 0) {
          setError('The file is empty.');
          return;
        }

        // Use normalization logic to validate if the dataset is usable
        const normalized = normalizeData(rows);

        if (!normalized) {
          setError('Could not identify "Date" and "NAV" columns. Please ensure your file has headers like "Date" and "Net Asset Value".');
          return;
        }

        onDataLoaded(rows);
      } catch (err) {
        setError('Error parsing file. Please ensure it is a valid Excel or CSV file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4">
      <div
        className={`relative border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center transition-all ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${error ? 'border-red-300 bg-red-50' : 'bg-white'}`}
        onDragEnter={() => !isLoading && setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleChange}
          accept=".xlsx, .xls, .csv"
          disabled={isLoading}
        />
        
        <div className={`p-4 rounded-full mb-4 ${error ? 'bg-red-100' : 'bg-blue-100'}`}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          ) : error ? (
            <AlertCircle className="w-8 h-8 text-red-600" />
          ) : (
            <Upload className="w-8 h-8 text-blue-600" />
          )}
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {isLoading ? 'Processing Data...' : 'Upload Mutual Fund Data'}
        </h3>
        <p className="text-gray-500 text-center mb-6 max-w-sm">
          Drag and drop your Excel (.xlsx) or CSV file here, or click to browse.
        </p>

        <div className="flex gap-4 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> xlsx, csv
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Date column
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> NAV column
          </div>
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
          >
            <FileWarning className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">File Requirement Error</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
