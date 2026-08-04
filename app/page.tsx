"use client";

import React, { useState } from "react";
import axios from "axios";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus, { FileTask } from "@/components/ProcessingStatus";
import ExtractedTable from "@/components/ExtractedTable";
import { PublicationRecord } from "@/lib/types";
import { DatabaseZap, Code, Sparkles, Send, RotateCcw, LayoutTemplate, X } from "lucide-react";

export default function Home() {
  const [status, setStatus] = useState<"idle" | "extracting" | "submitting" | "success" | "error">("idle");
  const [fileTasks, setFileTasks] = useState<FileTask[]>([]);
  const [records, setRecords] = useState<PublicationRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  const [categories, setCategories] = useState(["CSA", "CSB", "SS"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const handleProcess = async (files: File[]) => {
    setStatus("extracting");
    
    const tasks: FileTask[] = files.map(f => ({ name: f.name, state: 'queued' }));
    setFileTasks([...tasks]);
    
    let index = 0;
    const newRecords: PublicationRecord[] = [];

    const processNext = async () => {
      while (true) {
        if (index >= files.length) break;
        const currentIndex = index++;
        const file = files[currentIndex];
        
        setFileTasks(prev => {
          const next = [...prev];
          next[currentIndex].state = 'processing';
          return next;
        });

        try {
          const formData = new FormData();
          formData.append("image", file);

          const response = await axios.post("/api/ocr", formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });
          
          if (response.data.success) {
            // Append source image metadata to records 
            const newImageRecords = response.data.records.map((r: PublicationRecord) => ({
              ...r,
              id: r.id || Math.random().toString(36).substring(7),
              sourceImageId: response.data.sourceImageId
            }));
            newRecords.push(...newImageRecords);
            setFileTasks(prev => {
              const next = [...prev];
              next[currentIndex].state = 'done';
              return next;
            });
          } else {
            throw new Error("Failed");
          }
        } catch {
          setFileTasks(prev => {
            const next = [...prev];
            next[currentIndex].state = 'error';
            return next;
          });
        }
      }
    };

    const workers = [];
    for (let i = 0; i < Math.min(3, files.length); i++) {
      workers.push(processNext());
    }
    await Promise.all(workers);
    
    if (newRecords.length > 0) {
      setRecords(prev => [...newRecords, ...prev]);
    }
    
    setTimeout(() => {
      setStatus("idle");
      setFileTasks([]);
    }, 2500);
  };

  const handleSubmit = async () => {
    if (!selectedCategory) {
      setErrorMessage("Please select a Filing Category before submitting.");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
      return;
    }

    const invalidRecords = records.filter(r => !r.doi?.trim() || !r.rollNumber?.trim());
    if (invalidRecords.length > 0) {
      setErrorMessage(`Cannot submit: ${invalidRecords.length} record(s) missing required fields (DOI or Roll Number). Please fix the highlighted red fields.`);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 6000);
      return;
    }

    setStatus("submitting");
    try {
      const webhookUrl = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;
      if (!webhookUrl) throw new Error("Webhook URL is not configured in .env.local");

      await axios.post(webhookUrl, { 
        category: selectedCategory,
        submittedAt: new Date().toISOString(),
        records 
      });
      
      setStatus("success");
      setSuccessMessage(`${records.length} record(s) successfully submitted under ${selectedCategory}!`);
    } catch (err: unknown) {
      console.error(err);
      setStatus("error");
      const errMessage = err instanceof Error ? err.message : "Failed to submit data to the webhook.";
      setErrorMessage(errMessage);
    }
  };

  const handleAddCategory = () => {
    const cat = newCategory.trim();
    if (cat && !categories.includes(cat)) {
      setCategories(prev => [...prev, cat]);
      setSelectedCategory(cat);
    } else if (cat && categories.includes(cat)) {
      setSelectedCategory(cat);
    }
    setNewCategory("");
    setIsAddingCategory(false);
  };

  const handleReset = () => {
    setStatus("idle");
    setRecords([]);
    setFileTasks([]);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const steps = ["Upload", "Extract", "Verify", "Submit"];
  let currentStep = 0;
  if (status === "extracting") currentStep = 1;
  else if (records.length > 0 && status !== "submitting" && status !== "success") currentStep = 2;
  else if (status === "submitting" || status === "success" || (status === "error" && records.length > 0)) currentStep = 3;

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-50 selection:bg-indigo-500/30 selection:text-indigo-200">
      
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 self-start md:self-auto">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-100">PubExtract</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">OCR Digitization</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-6 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar mask-edges-horizontal">
            {steps.map((step, idx) => {
              const isActive = idx === currentStep;
              const isPast = idx < currentStep;
              return (
                <div key={step} className="flex items-center gap-2 sm:gap-6 whitespace-nowrap">
                  <div className={`flex items-center gap-2.5 transition-colors ${isActive ? 'text-indigo-400 font-semibold' : isPast ? 'text-slate-300' : 'text-slate-600'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border transition-colors ${isActive ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : isPast ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-transparent border-slate-800 text-slate-600'}`}>
                      {idx + 1}
                    </div>
                    <span className="text-sm">{step}</span>
                  </div>
                  {idx < steps.length - 1 && <div className={`w-4 sm:w-8 h-px transition-colors ${isPast ? 'bg-slate-700' : 'bg-slate-800/80'}`} />}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-0">
        
        <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
          <UploadZone 
            onProcess={handleProcess} 
            isProcessing={status === "extracting" || status === "submitting"}
          />
          
          {(status === "extracting" || status === "success" || status === "error" || status === "submitting") && (
             <ProcessingStatus 
               status={status} 
               tasks={fileTasks} 
               message={status === 'success' ? successMessage : errorMessage} 
               onRetry={status === 'error' && errorMessage.includes("webhook") ? handleSubmit : undefined}
             />
          )}

          {records.length > 0 && (
             <button
               onClick={handleReset}
               className="mt-2 flex items-center justify-center gap-2 px-4 py-3 bg-slate-900/60 hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 rounded-xl font-medium transition-all border border-slate-800/80 outline-none focus-visible:ring-2 focus-visible:ring-slate-500 shadow-sm"
             >
               <RotateCcw className="w-4 h-4" /> Clear all & Start Over
             </button>
          )}
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {records.length > 0 ? (
            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-500">
              
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm backdrop-blur-sm">
                <div>
                  <h3 className="text-base font-semibold text-slate-200">Filing Category <span className="text-red-400">*</span></h3>
                  <p className="text-xs text-slate-400 mt-1">Select the destination sheet for these records.</p>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {isAddingCategory ? (
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <input 
                        type="text" 
                        value={newCategory} 
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="New Category..."
                        className="w-full sm:w-40 bg-slate-800 border border-indigo-500 rounded-lg px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm shadow-sm"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddCategory();
                          if (e.key === 'Escape') setIsAddingCategory(false);
                        }}
                      />
                      <button 
                        onClick={handleAddCategory}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-sm transition-colors"
                      >
                        Add
                      </button>
                      <button 
                        onClick={() => setIsAddingCategory(false)}
                        className="p-2 text-slate-400 hover:text-slate-200 transition-colors bg-slate-800/50 rounded-lg hover:bg-slate-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <select 
                      value={selectedCategory}
                      onChange={e => {
                        if (e.target.value === "__add_new__") setIsAddingCategory(true);
                        else setSelectedCategory(e.target.value);
                      }}
                      className={`w-full sm:w-auto bg-slate-800 border rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-sm cursor-pointer transition-colors ${!selectedCategory ? 'border-red-500/50 text-slate-300' : 'border-slate-700 text-slate-100'}`}
                    >
                      <option value="" disabled>Select a category...</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="__add_new__">+ Add new category</option>
                    </select>
                  )}
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-slate-900/40 border border-slate-800/60 rounded-3xl backdrop-blur-sm overflow-hidden">
                <ExtractedTable data={records} onChange={setRecords} />
                
                <div className="p-6 border-t border-slate-800/80 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4 sticky bottom-0">
                  <p className="text-sm text-slate-400">
                    Verify required fields (<span className="text-red-400">red</span>) before submitting.
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={status === 'submitting'}
                    className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    <Send className="w-5 h-5" />
                    Submit {records.length} Records
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-slate-500 p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20">
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center mb-6 shadow-sm">
                <LayoutTemplate className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="text-2xl font-bold text-slate-300 mb-3 tracking-tight">No Records Extracted</h3>
              <p className="max-w-md text-center text-sm leading-relaxed text-slate-400">
                Start by dropping your certificate images into the upload zone on the left. Once you extract the data, the table will appear here for verification.
              </p>
            </div>
          )}
        </div>
      </div>
      
      <footer className="border-t border-slate-900 bg-slate-950 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-xs font-medium text-slate-500">
          <div className="flex items-center gap-2">
            <DatabaseZap className="w-4 h-4 text-indigo-500" />
            <span>Stateless Client-side Processing</span>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center gap-6">
            <a href="#" className="hover:text-slate-300 transition-colors">Documentation</a>
            <a href="#" className="flex items-center gap-2 hover:text-slate-300 transition-colors">
              <Code className="w-4 h-4" /> GitHub
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
