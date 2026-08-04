"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileSearch, X, Loader2, Sparkles } from "lucide-react";
import { preprocessImage } from "@/lib/preprocess";

interface UploadZoneProps {
  onProcess: (files: File[]) => void;
  isProcessing: boolean;
}

interface PreviewFile {
  id: string;
  originalFile: File;
  originalPreview: string;
  cleanedFile: File | null;
  cleanedPreview: string | null;
  isPreprocessing: boolean;
  showCleaned: boolean;
}

export default function UploadZone({ onProcess, isProcessing }: UploadZoneProps) {
  const [files, setFiles] = useState<PreviewFile[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (isProcessing) return;
    
    const newItems = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substring(7),
      originalFile: file,
      originalPreview: URL.createObjectURL(file),
      cleanedFile: null,
      cleanedPreview: null,
      isPreprocessing: true,
      showCleaned: true
    }));
    
    setFiles(prev => [...prev, ...newItems].slice(0, 30));

    // Process sequentially without blocking UI thread
    for (const item of newItems) {
      try {
        await new Promise(r => setTimeout(r, 50));
        const blob = await preprocessImage(item.originalFile);
        const cleanedFile = new File([blob], `cleaned-${item.originalFile.name}`, { type: 'image/png' });
        const cleanedPreview = URL.createObjectURL(blob);
        
        setFiles(prev => prev.map(f => f.id === item.id ? {
          ...f,
          cleanedFile,
          cleanedPreview,
          isPreprocessing: false
        } : f));
      } catch (err) {
        console.error("Preprocessing failed for", item.originalFile.name, err);
        setFiles(prev => prev.map(f => f.id === item.id ? { ...f, isPreprocessing: false, showCleaned: false } : f));
      }
    }
  }, [isProcessing]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    disabled: isProcessing
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => {
      if (f.id === id) {
        URL.revokeObjectURL(f.originalPreview);
        if (f.cleanedPreview) URL.revokeObjectURL(f.cleanedPreview);
      }
      return f.id !== id;
    }));
  };

  const clearAll = () => {
    files.forEach(f => {
      URL.revokeObjectURL(f.originalPreview);
      if (f.cleanedPreview) URL.revokeObjectURL(f.cleanedPreview);
    });
    setFiles([]);
  };

  const handleExtract = () => {
    const readyFiles = files.filter(f => !f.isPreprocessing);
    if (readyFiles.length > 0) {
      onProcess(readyFiles.map(f => f.cleanedFile || f.originalFile));
    }
  };

  const isAnyPreprocessing = files.some(f => f.isPreprocessing);
  const disableExtract = isProcessing || isAnyPreprocessing;

  return (
    <div className="w-full p-5 sm:p-6 flex flex-col h-full bg-slate-900/50 rounded-2xl">
      <div 
        {...getRootProps()} 
        className={`relative w-full rounded-xl border-2 border-dashed p-8 transition-all duration-300 flex flex-col items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer ${
          isDragActive 
            ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]" 
            : "border-slate-700 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-500"
        } ${isProcessing ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
      >
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <input {...getInputProps({ capture: 'environment' } as any)} />
        
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 flex items-center justify-center shadow-sm transition-transform duration-300">
            <UploadCloud className={`w-7 h-7 transition-colors ${isDragActive ? "text-indigo-400" : "text-slate-400"}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">
              {isDragActive ? "Drop files now" : "Select or Drop Images"}
            </h3>
            <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-2 leading-relaxed">
              Upload up to 30 certificates (JPEG, PNG). Phone camera supported.
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-slate-300">
              {files.length} File{files.length > 1 ? 's' : ''} Ready
            </h4>
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-slate-500 rounded px-1"
            >
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 mb-6 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
            {files.map(item => (
              <div key={item.id} className="relative group rounded-lg overflow-hidden bg-slate-950 border border-slate-800 aspect-square shadow-sm">
                
                {item.isPreprocessing && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 z-20 backdrop-blur-[2px]">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mb-1" />
                    <span className="text-[8px] text-slate-400 font-medium">CLEANING</span>
                  </div>
                )}
                
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={item.showCleaned && item.cleanedPreview ? item.cleanedPreview : item.originalPreview} 
                  alt={item.originalFile.name} 
                  className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${item.showCleaned ? 'grayscale brightness-110' : ''}`} 
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10" />
                
                <p className="absolute bottom-1 left-1 right-1 text-[9px] text-white truncate font-medium drop-shadow-md z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.originalFile.name}
                </p>

                {!isProcessing && !item.isPreprocessing && item.cleanedPreview && (
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, showCleaned: !f.showCleaned } : f));
                    }}
                    title={item.showCleaned ? "Viewing Preprocessed Image. Click to view Original." : "Viewing Original. Click to view Preprocessed."}
                    className="absolute top-1 left-1 px-1.5 py-1 rounded bg-black/70 hover:bg-black text-[9px] font-bold text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all z-20 flex items-center gap-1 border border-white/10"
                  >
                    <Sparkles className={`w-2.5 h-2.5 ${item.showCleaned ? 'text-indigo-400' : 'text-slate-400'}`} />
                    {item.showCleaned ? "CLEAN" : "ORIG"}
                  </button>
                )}

                {!isProcessing && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFile(item.id); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-500/90 text-white flex items-center justify-center backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 transform scale-90 group-hover:scale-100 z-20"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={handleExtract}
            disabled={disableExtract}
            className="mt-auto flex w-full items-center justify-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            {isProcessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Extracting...</>
            ) : isAnyPreprocessing ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Preprocessing Images...</>
            ) : (
              <><FileSearch className="w-5 h-5" /> Extract Data</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
