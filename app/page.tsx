"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ProcessingStatus, { FileTask } from "@/components/ProcessingStatus";
import { ExtractionResult, Gym, ImportBatch, UploadedFile, ExtractedMember, MembershipPlan } from "@/types";
import { createStagedMembers } from "@/features/import/staging";
import { processMembers, PipelineStats } from "@/services/business/pipeline";
import { DatabaseZap, Code, Sparkles, LayoutTemplate, RotateCcw, Building2, Package, CheckCircle2, AlertCircle, ShieldAlert, Plus, Trash2, Search, Filter, Users, ChevronRight, Activity, Clock, Server, List } from "lucide-react";

const EditableCell = ({ value, onChange, isLowConfidence, placeholder, disabled }: any) => {
  const [val, setVal] = useState(value || "");
  useEffect(() => setVal(value || ""), [value]);

  return (
    <input 
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 rounded px-1.5 -mx-1.5 py-1 transition-colors text-sm ${isLowConfidence ? 'bg-red-500/20 text-red-200 placeholder:text-red-400/50 border border-red-500/30' : 'hover:bg-slate-800/50 border border-transparent'} disabled:opacity-70 disabled:hover:bg-transparent`}
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={() => { if(val !== (value || "")) onChange(val); }}
    />
  );
};

export default function Home() {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [selectedGymId, setSelectedGymId] = useState<string>("");
  const [dashboardData, setDashboardData] = useState<any>(null);
  
  const [isAddingGym, setIsAddingGym] = useState(false);
  const [newGymName, setNewGymName] = useState("");

  const [currentBatch, setCurrentBatch] = useState<ImportBatch | null>(null);
  const [status, setStatus] = useState<"idle" | "extracting" | "success" | "error">("idle");
  const [fileTasks, setFileTasks] = useState<FileTask[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>("");
  
  const [stagedMembers, setStagedMembers] = useState<ExtractedMember[]>([]);
  const [stagedPlans, setStagedPlans] = useState<MembershipPlan[]>([]);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null);

  const [filter, setFilter] = useState<'All' | 'Ready' | 'Flagged' | 'Needs Review' | 'Audit Logs'>('All');
  const [search, setSearch] = useState('');

  const [pastedJson, setPastedJson] = useState('');
  const [jsonError, setJsonError] = useState('');

  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedGymId || !memberSearchQuery.trim()) {
      setMemberSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/gyms/${selectedGymId}/members/search?q=${encodeURIComponent(memberSearchQuery)}`);
        setMemberSearchResults(res.data.members || []);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [memberSearchQuery, selectedGymId]);

  useEffect(() => {
    axios.get('/api/gyms').then(res => setGyms(res.data)).catch(console.error);
  }, []);

  const handleAddGym = async () => {
    if (!newGymName.trim()) return;
    try {
      const res = await axios.post('/api/gyms', { name: newGymName });
      const newGym = res.data;
      setGyms(prev => [...prev, newGym]);
      setSelectedGymId(newGym.id);
      setIsAddingGym(false);
      setNewGymName("");
    } catch (e) {
      console.error(e);
    }
  };

  const loadDashboard = useCallback(async (gymId: string) => {
    try {
      const res = await axios.get(`/api/gyms/${gymId}/dashboard`);
      setDashboardData(res.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadWorkspace = useCallback(async (batchId: string) => {
    try {
      const res = await axios.get(`/api/review?batchId=${batchId}`);
      const auditRes = await axios.get(`/api/batches/${batchId}/audit`);
      
      const { members, plans, report } = res.data;
      setStagedMembers(members);
      setStagedPlans(plans);
      setAuditLogs(auditRes.data);
      if (report) {
        setPipelineStats({
          extractedCount: report.membersFound,
          readyCount: members.filter((m: any) => m.status === 'READY' && m.confidence >= 80).length,
          flaggedCount: members.filter((m: any) => m.status === 'FLAGGED').length,
          mergedCount: report.mergedMembers,
          errorCount: report.validationErrors
        });
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (selectedGymId) {
      // Clear batch and load dashboard instead of forcing a batch
      setCurrentBatch(null);
      setStagedMembers([]);
      setStagedPlans([]);
      setDuplicates([]);
      setPipelineStats(null);
      loadDashboard(selectedGymId);
    } else {
      setDashboardData(null);
      setCurrentBatch(null);
    }
  }, [selectedGymId, loadDashboard]);

  const startNewBatch = async () => {
    const gym = gyms.find(g => g.id === selectedGymId);
    if (!gym) return;
    const date = new Date();
    const batchName = `${gym.name} - ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    try {
      const res = await axios.post('/api/batches', { gymId: gym.id, batchName });
      setCurrentBatch({
        id: res.data.id,
        gymId: gym.id,
        name: batchName,
        createdAt: date.toISOString(),
        status: 'waiting',
        uploadedFiles: [],
        processingProgress: 0,
      });
      setStatus("idle");
    } catch (e) {
      console.error(e);
    }
  };

  const resumeBatch = async (batch: any) => {
    setCurrentBatch({...batch, uploadedFiles: batch.uploadedFiles || []});
    if (batch.status === 'completed' || batch.status === 'review_required' || batch.status === 'ready') {
      setStatus("idle");
      await loadWorkspace(batch.id);
    } else {
      setStatus("idle");
      setStagedMembers([]);
      setStagedPlans([]);
      setDuplicates([]);
      setPipelineStats(null);
    }
  };



  const handleProcessJson = async () => {
    if (!currentBatch || !selectedGymId || !pastedJson.trim()) return;

    setJsonError("");
    let parsedData = null;
    try {
      parsedData = JSON.parse(pastedJson);
      if (!Array.isArray(parsedData)) {
        setJsonError("Input must be a JSON array of objects.");
        return;
      }
    } catch (e) {
      setJsonError("Invalid JSON format.");
      return;
    }

    setStatus("extracting");
    setCurrentBatch(prev => prev ? { ...prev, status: 'processing' } : null);
    setFileTasks([{ name: 'Direct JSON Import', state: 'processing' }]);

    try {
      await axios.post(`/api/gyms/${selectedGymId}/import-json`, {
        batchId: currentBatch.id,
        gymId: selectedGymId,
        members: parsedData
      });
      await loadWorkspace(currentBatch.id);
      setCurrentBatch(prev => prev ? { ...prev, status: 'completed' } : null);
      setStatus("idle");
    } catch (e: any) {
       console.error("Failed to import JSON", e);
       setJsonError(e.response?.data?.error || "Failed to import JSON.");
       setStatus("error");
       setCurrentBatch(prev => prev ? { ...prev, status: 'failed' } : null);
    }
  };



  const handleUpdateMember = async (id: string, updates: any) => {
    try {
      await axios.put(`/api/members/${id}`, updates);
      if (currentBatch) await loadWorkspace(currentBatch.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteMember = async (id: string) => {
    try {
      await axios.delete(`/api/members/${id}`);
      if (currentBatch) await loadWorkspace(currentBatch.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteProdMember = async (id: string) => {
    try {
      await axios.delete(`/api/members/${id}?type=prod`);
      setMemberSearchResults(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete member');
    }
  };

  const handleDeleteGym = async (id: string) => {
    try {
      await axios.delete(`/api/gyms/${id}`);
      setSelectedGymId("");
      setDashboardData(null);
      const res = await axios.get('/api/gyms');
      setGyms(res.data);
    } catch (e) {
      console.error(e);
      alert('Failed to delete gym');
    }
  };

  const handleAddMember = async () => {
    if (!currentBatch) return;
    try {
      await axios.post('/api/members', {
        gymId: selectedGymId,
        batchId: currentBatch.id
      });
      await loadWorkspace(currentBatch.id);
    } catch (e) {
      console.error(e);
    }
  };


  const handleUpdatePlan = async (id: string, updates: any) => {
    try {
      await axios.put(`/api/plans/${id}`, updates);
      if (currentBatch) await loadWorkspace(currentBatch.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPlan = async () => {
    if (!currentBatch) return;
    try {
      await axios.post('/api/plans', {
        gymId: selectedGymId,
        batchId: currentBatch.id
      });
      await loadWorkspace(currentBatch.id);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCommit = async () => {
    if (!currentBatch || !selectedGymId) return;
    try {
      setStatus("extracting");
      setFileTasks([{ name: 'Atomic Commit', state: 'processing' }]);
      await axios.post(`/api/batches/${currentBatch.id}/commit`, { gymId: selectedGymId });
      
      setStatus("success");
      setFileTasks([{ name: 'Atomic Commit', state: 'done' }]);
      setCurrentBatch({ ...currentBatch, status: 'committed' });
      await loadWorkspace(currentBatch.id);
      
      setTimeout(() => {
        setStatus("idle");
        setFileTasks([]);
      }, 2000);
    } catch (e: any) {
      console.error(e);
      setStatus("error");
      setErrorMessage(e.response?.data?.error || e.message || 'Failed to commit transaction');
      setFileTasks([{ name: 'Atomic Commit', state: 'error' }]);
      setTimeout(() => {
        setStatus("idle");
        setFileTasks([]);
        setErrorMessage("");
      }, 4000);
    }
  };

  const handleCloseBatch = () => {
    setCurrentBatch(null);
    setStagedMembers([]);
    setStagedPlans([]);
    setDuplicates([]);
    setPipelineStats(null);
    if (selectedGymId) loadDashboard(selectedGymId);
  };

  const steps = ["Dashboard", "Upload", "Extract", "Review"];
  let currentStep = 0;
  if (currentBatch) {
    if (status === "extracting" && !fileTasks.find(t => t.name === 'Atomic Commit')) currentStep = 2;
    else if (currentBatch.status === 'committed' || (status === "extracting" && fileTasks.find(t => t.name === 'Atomic Commit'))) currentStep = 4;
    else if (stagedMembers.length > 0) currentStep = 3;
    else currentStep = 1;
  }

  const activeGymName = gyms.find(g => g.id === selectedGymId)?.name || "Unknown Gym";
  const isCommitted = currentBatch?.status === 'committed';
  
  // Filtering & Search
  let filteredMembers = stagedMembers.filter((m: any) => {
    if (filter === 'Ready') return m.status === 'READY' && m.confidence >= 80;
    if (filter === 'Flagged') return m.status === 'FLAGGED';
    if (filter === 'Needs Review') return m.confidence < 80;
    return true;
  });

  if (search.trim()) {
    const s = search.toLowerCase();
    filteredMembers = filteredMembers.filter((m: any) => 
      (m.name || "").toLowerCase().includes(s) ||
      (m.contact_no || "").toLowerCase().includes(s)
    );
  }

  const flaggedMembers = stagedMembers.filter((m: any) => m.status === 'FLAGGED');

  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-50 selection:bg-indigo-500/30 selection:text-indigo-200">
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 self-start md:self-auto cursor-pointer" onClick={handleCloseBatch}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-slate-100">Apex AI Import Engine</h1>
              <p className="text-xs text-slate-400 font-medium tracking-wide">AI-Powered Migration Platform</p>
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

      <div className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 flex flex-col xl:flex-row gap-6 lg:gap-8 min-h-0">
        
        <div className="w-full xl:w-[380px] shrink-0 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Building2 className="w-4 h-4 text-indigo-400" />
                Target Gym
              </label>
              <button onClick={() => setIsAddingGym(!isAddingGym)} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Gym
              </button>
            </div>
            
            {isAddingGym ? (
              <div className="flex items-center gap-2 mb-3 animate-in fade-in slide-in-from-top-2">
                <input 
                  autoFocus
                  type="text" 
                  value={newGymName} 
                  onChange={e => setNewGymName(e.target.value)} 
                  placeholder="Gym name..." 
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200"
                  onKeyDown={e => e.key === 'Enter' && handleAddGym()}
                />
                <button onClick={handleAddGym} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors">
                  Save
                </button>
              </div>
            ) : null}

          <div className="flex items-center gap-2 mb-6">
            <select
              value={selectedGymId}
              onChange={(e) => setSelectedGymId(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-200"
            >
              <option value="" disabled>Select a gym...</option>
              {gyms.map(gym => (
                <option key={gym.id} value={gym.id}>{gym.name}</option>
              ))}
            </select>
            {selectedGymId && (
              <button 
                onClick={() => {
                  const gym = gyms.find(g => g.id === selectedGymId);
                  const conf = window.prompt(`Type "${gym?.name}" to permanently delete this gym and ALL its data.`);
                  if (conf === gym?.name) handleDeleteGym(selectedGymId);
                }} 
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20 shrink-0" 
                title="Delete Gym"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

          {currentBatch && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-4 fade-in">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-4">
                <Package className="w-4 h-4 text-indigo-400" />
                Active Session
              </div>
              <div className="space-y-3 text-sm mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Name:</span>
                  <span className="text-slate-300 font-medium truncate ml-2" title={currentBatch.name}>{currentBatch.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span className="text-slate-300">{new Date(currentBatch.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <span className={`font-medium capitalize ${
                    currentBatch.status === 'completed' ? 'text-emerald-400' :
                    currentBatch.status === 'failed' ? 'text-red-400' :
                    currentBatch.status === 'processing' ? 'text-indigo-400' :
                    'text-yellow-400'
                  }`}>
                    {currentBatch.status}
                  </span>
                </div>
              </div>
              <button onClick={handleCloseBatch} className="w-full flex justify-center items-center gap-2 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 transition-colors">
                <RotateCcw className="w-4 h-4" /> Close Session
              </button>
            </div>
          )}

          {currentBatch && status === "idle" && currentBatch.status === 'waiting' && stagedMembers.length === 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm animate-in slide-in-from-top-4 fade-in">
              <div className="flex flex-col gap-4">
                <textarea 
                  value={pastedJson}
                  onChange={e => { setPastedJson(e.target.value); setJsonError(""); }}
                  placeholder='[{ "name": "John Doe", "contact_no": "1234567890", "price": "5000", "date": "2024-01-01", "plan_duration": "3 Months" }]'
                  className={`w-full h-48 bg-slate-950 border ${jsonError ? 'border-red-500' : 'border-slate-700'} rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none custom-scrollbar`}
                />
                {jsonError && <div className="text-red-400 text-sm font-medium">{jsonError}</div>}
                <button 
                  onClick={handleProcessJson}
                  disabled={!pastedJson.trim()}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import JSON
                </button>
              </div>
            </div>
          )}
          
          {(status === "extracting" || status === "success" || status === "error" || (currentBatch && currentBatch.status === 'processing')) && (
             <ProcessingStatus 
               status={(currentBatch && currentBatch.status === 'processing' && status === 'idle') ? 'extracting' : status as any} 
               tasks={fileTasks} 
               message={errorMessage}
               progress={currentBatch?.processingProgress}
             />
          )}

          {/* Edit Plans Side Panel */}
          {currentBatch && stagedPlans.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 shadow-sm mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <Package className="w-4 h-4 text-purple-400" />
                  Membership Plans
                </div>
                {!isCommitted && (
                  <button onClick={handleAddPlan} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {stagedPlans.map((p: any) => (
                  <div key={p.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 text-sm flex flex-col gap-2">
                    <EditableCell disabled={isCommitted} value={p.name} placeholder="Plan Name" onChange={(val: string) => handleUpdatePlan(p.id, { name: val })} />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <EditableCell disabled={isCommitted} value={p.duration} placeholder="Duration" onChange={(val: string) => handleUpdatePlan(p.id, { duration: val })} />
                      </div>
                      <div className="flex-1">
                        <EditableCell disabled={isCommitted} value={p.price} placeholder="Price" onChange={(val: string) => handleUpdatePlan(p.id, { price: val })} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          {!selectedGymId ? (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-slate-500 p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center mb-6 shadow-sm">
                <LayoutTemplate className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="text-2xl font-bold text-slate-300 mb-3 tracking-tight">Select a Gym</h3>
              <p className="max-w-md text-center text-sm leading-relaxed text-slate-400">
                Choose a target gym to view its import history or start a new session.
              </p>
            </div>
          ) : !currentBatch && dashboardData ? (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between mb-6">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-100">{activeGymName}</h2>
                    <p className="text-sm text-slate-400 mt-2">Import Dashboard</p>
                  </div>
                  <button onClick={startNewBatch} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> Start New Import
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-sm">
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <div className="text-slate-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Members Imported</div>
                    <div className="font-bold text-slate-200 text-2xl">{dashboardData.stats.membersImported}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <div className="text-slate-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Plans Created</div>
                    <div className="font-bold text-purple-400 text-2xl">{dashboardData.stats.plansCreated}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <div className="text-slate-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Duplicates Found</div>
                    <div className="font-bold text-indigo-400 text-2xl">{dashboardData.stats.duplicates}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <div className="text-slate-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Validation Errors</div>
                    <div className="font-bold text-amber-500 text-2xl">{dashboardData.stats.validationErrors}</div>
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/60">
                    <div className="text-slate-500 text-xs mb-1.5 font-medium uppercase tracking-wider">Avg Confidence</div>
                    <div className="font-bold text-emerald-400 text-2xl">{dashboardData.stats.avgConfidence}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 shadow-sm flex flex-col mb-6">
                <div className="flex items-center gap-2 text-slate-200 mb-4 font-bold text-lg">
                  <Search className="w-5 h-5 text-indigo-400" />
                  Member Directory
                </div>
                <input 
                  type="text" 
                  placeholder="Search members by name or phone..." 
                  value={memberSearchQuery}
                  onChange={e => setMemberSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
                {memberSearchQuery.trim().length > 0 && (
                  <div className="mt-4 overflow-y-auto custom-scrollbar pr-2 space-y-2 max-h-[300px]">
                    {memberSearchResults.length === 0 ? (
                      <div className="text-center py-4 text-slate-500 text-sm">No members found matching "{memberSearchQuery}"</div>
                    ) : (
                      memberSearchResults.map((m: any) => (
                        <div key={m.id} className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2">
                          <div>
                            <div className="font-semibold text-slate-200">{m.name || '—'}</div>
                            <div className="text-sm text-slate-400">{m.contact_no || '—'}</div>
                          </div>
                          <div className="sm:text-right flex items-center gap-4">
                            <div>
                              <div className="text-sm text-slate-300 font-medium">{m.plan_name || m.plan_duration || 'No Plan'}</div>
                              <div className="text-xs text-slate-500">Since {m.date || 'Unknown'} &bull; {m.price ? `₹${m.price}` : '—'}</div>
                            </div>
                            <button onClick={() => {
                              if (window.confirm('Are you sure you want to delete this member?')) {
                                handleDeleteProdMember(m.id);
                              }
                            }} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors" title="Delete Member">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 text-slate-200 mb-6 font-bold text-lg">
                  <Activity className="w-5 h-5 text-indigo-400" />
                  Import History
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                  {dashboardData.batches.length === 0 ? (
                    <div className="text-center py-10 text-slate-500">No previous imports found for this gym.</div>
                  ) : (
                    (() => {
                      const isBatchFailed = (batch: any) => {
                        return batch.status === 'failed' || 
                               Number(batch.stale_jobs) > 0 || 
                               ((batch.status === 'completed' || batch.status === 'committed') && Number(batch.membersFound) === 0);
                      };
                      
                      const activeBatches = dashboardData.batches.filter((b: any) => !isBatchFailed(b));
                      const failedBatches = dashboardData.batches.filter((b: any) => isBatchFailed(b));

                      return (
                        <>
                          {activeBatches.map((batch: any) => (
                            <div 
                              key={batch.id}
                              onClick={() => resumeBatch(batch)}
                              className="group bg-slate-950/80 hover:bg-slate-800/80 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all"
                            >
                              <div>
                                <div className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
                                  {batch.batchName}
                                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                    batch.status === 'completed' || batch.status === 'committed' ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' :
                                    'text-amber-400 bg-amber-400/10 border-amber-400/20'
                                  }`}>
                                    {batch.status.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                   <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {new Date(batch.createdAt).toLocaleString()}</span>
                                   <span>{batch.membersFound || 0} Members</span>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                            </div>
                          ))}

                          {failedBatches.length > 0 && (
                            <details className="mt-6 border-t border-slate-800/80 pt-4">
                              <summary className="cursor-pointer text-slate-400 font-semibold mb-3 focus:outline-none hover:text-slate-300">
                                Failed & Empty Imports ({failedBatches.length})
                              </summary>
                              <div className="space-y-3">
                                {failedBatches.map((batch: any) => (
                                  <div 
                                    key={batch.id}
                                    onClick={() => resumeBatch(batch)}
                                    className="group bg-slate-950/40 opacity-75 hover:opacity-100 hover:bg-slate-800/80 border border-slate-800/80 rounded-2xl p-5 flex items-center justify-between cursor-pointer transition-all"
                                  >
                                    <div>
                                      <div className="font-semibold text-slate-200 mb-1 flex items-center gap-2">
                                        {batch.batchName}
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border text-red-400 bg-red-400/10 border-red-400/20`}>
                                          {batch.status === 'completed' || batch.status === 'committed' ? 'No Data' : 'Failed / Stale'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-4 text-xs text-slate-500">
                                         <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5"/> {new Date(batch.createdAt).toLocaleString()}</span>
                                         <span>{batch.membersFound || 0} Members</span>
                                      </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </>
                      );
                    })()
                  )}
                </div>
              </div>
            </div>
          ) : currentBatch && stagedMembers.length > 0 ? (
            <div className="flex-1 flex flex-col animate-in fade-in zoom-in-95 duration-500">
              
              <div className="bg-slate-900/40 border border-slate-800/60 rounded-3xl p-6 mb-6 shadow-sm flex flex-wrap items-center gap-6 justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-200">Interactive Review Workspace</h2>
                  <p className="text-sm text-slate-400 mt-1">Review, edit, and validate staged entities.</p>
                </div>
                <div className="flex flex-wrap items-center gap-8 text-sm">
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Members Extracted</div>
                    <div className="font-semibold text-slate-200 text-lg leading-none">{stagedMembers.length}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Ready</div>
                    <div className="font-semibold text-emerald-400 text-lg leading-none">{stagedMembers.filter((m: any) => m.status === 'READY' && m.confidence >= 80).length}</div>
                  </div>
                  <div>
                    <div className="text-slate-500 text-xs mb-1">Flagged / Needs Review</div>
                    <div className="font-semibold text-red-400 text-lg leading-none">{stagedMembers.filter((m: any) => m.status === 'FLAGGED' || m.confidence < 80).length}</div>
                  </div>
                  
                  {isCommitted ? (
                    <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2 font-bold">
                      <CheckCircle2 className="w-5 h-5" />
                      Session Committed
                    </div>
                  ) : (
                    <button 
                      onClick={handleCommit}
                      disabled={stagedMembers.some((m: any) => m.status !== 'READY' || m.confidence < 80)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="All members must be READY and duplicates resolved to commit."
                    >
                      <Server className="w-4 h-4" /> Commit to Production
                    </button>
                  )}
                </div>
              </div>

              {/* Filters and Search */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800/60 overflow-x-auto custom-scrollbar">
                  {(['All', 'Ready', 'Flagged', 'Needs Review', 'Audit Logs'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${filter === f ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                {filter !== 'Audit Logs' && (
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input 
                        type="text" 
                        placeholder="Search members..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-800/60 rounded-xl text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/50 w-64 transition-all"
                      />
                    </div>
                    {!isCommitted && (
                      <button onClick={handleAddMember} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm">
                        <Plus className="w-4 h-4" /> Add Member
                      </button>
                    )}
                  </div>
                )}
              </div>


              {/* Main Content Area */}
              {filter === 'Audit Logs' ? (
                <div className="flex-1 overflow-hidden bg-slate-900/40 border border-slate-800/60 rounded-3xl flex flex-col shadow-sm mb-6 p-6 md:p-8">
                   <div className="flex items-center gap-3 mb-8">
                     <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                       <List className="w-5 h-5 text-indigo-400" />
                     </div>
                     <div>
                       <h3 className="text-xl font-bold text-slate-200">Immutable Audit Timeline</h3>
                       <p className="text-sm text-slate-400">Append-only record of all actions performed in this session.</p>
                     </div>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
                      {auditLogs.length === 0 ? (
                         <div className="text-center py-12 text-slate-500">No events recorded.</div>
                      ) : (
                         <div className="space-y-6">
                            {auditLogs.map((log: any) => (
                               <div key={log.id} className="relative pl-6 sm:pl-8 py-2">
                                  {/* Timeline line */}
                                  <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-slate-800"></div>
                                  
                                  {/* Timeline node */}
                                  <div className={`absolute left-0 top-3 w-6 h-6 rounded-full border-4 border-slate-950 flex items-center justify-center ${log.actor === 'system' ? 'bg-indigo-500' : 'bg-emerald-500'} shadow-sm z-10`}></div>
                                  
                                  <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 sm:p-5 transition-colors hover:bg-slate-900/80">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                                       <div className="flex items-center gap-2">
                                          <span className="text-slate-200 font-bold tracking-tight">{log.actionType}</span>
                                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${log.actor === 'system' ? 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' : 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'}`}>
                                            {log.actor}
                                          </span>
                                       </div>
                                       <span className="text-xs text-slate-500 font-medium">
                                          {new Date(log.createdAt).toLocaleString()}
                                       </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-sm bg-slate-900/50 p-3 rounded-xl border border-slate-800/50">
                                       <div>
                                          <span className="text-slate-500 block text-xs mb-1 uppercase tracking-wider font-semibold">Entity</span>
                                          <span className="text-slate-300 font-medium">{log.entity}</span>
                                       </div>
                                       <div>
                                          <span className="text-slate-500 block text-xs mb-1 uppercase tracking-wider font-semibold">Entity ID</span>
                                          <span className="text-slate-400 font-mono text-xs">{log.entityId || 'N/A'}</span>
                                       </div>
                                    </div>
                                    
                                    {(log.previousValue || log.newValue) && (
                                       <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {log.previousValue && (
                                             <div className="bg-red-950/10 border border-red-900/20 p-3 rounded-xl">
                                                <div className="text-red-400/80 text-xs uppercase tracking-wider font-bold mb-2">Previous Value</div>
                                                <pre className="text-xs text-slate-400 overflow-x-auto custom-scrollbar">{JSON.stringify(log.previousValue, null, 2)}</pre>
                                             </div>
                                          )}
                                          {log.newValue && (
                                             <div className="bg-emerald-950/10 border border-emerald-900/20 p-3 rounded-xl">
                                                <div className="text-emerald-400/80 text-xs uppercase tracking-wider font-bold mb-2">New Value</div>
                                                <pre className="text-xs text-slate-400 overflow-x-auto custom-scrollbar">{JSON.stringify(log.newValue, null, 2)}</pre>
                                             </div>
                                          )}
                                       </div>
                                    )}
                                  </div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                </div>
              ) : (
                <div className="flex-1 overflow-hidden bg-slate-900/40 border border-slate-800/60 rounded-3xl flex flex-col shadow-sm mb-6">
                  <div className="w-full flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap min-w-max border-collapse">
                      <thead className="text-xs text-slate-400 uppercase bg-slate-950/95 sticky top-0 z-20 backdrop-blur-md shadow-sm">
                        <tr>
                          <th className="px-5 py-4 font-semibold sticky left-0 bg-slate-950/95 z-30 shadow-[1px_0_0_rgba(30,41,59,1)]">Name</th>
                          <th className="px-5 py-4 font-semibold">Phone</th>
                          <th className="px-5 py-4 font-semibold">Date</th>
                          <th className="px-5 py-4 font-semibold">Plan Assignment</th>
                          <th className="px-5 py-4 font-semibold text-right">Status</th>
                          <th className="px-5 py-4 font-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {filteredMembers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">No members found matching the criteria.</td>
                          </tr>
                        ) : filteredMembers.map((member: any) => {
                          const conf = Number(member.confidence || 100);
                          const isLowConf = conf < 80;
                          const isFlagged = member.status === 'FLAGGED';

                          return (
                            <tr key={member.id} className="hover:bg-slate-800/20 transition-colors group">
                              <td className="px-5 py-3 sticky left-0 bg-slate-900/50 z-10 shadow-[1px_0_0_rgba(30,41,59,0.5)]">
                                <EditableCell disabled={isCommitted} value={member.name} placeholder="Name" isLowConfidence={isLowConf} onChange={(val: string) => handleUpdateMember(member.id, { name: val })} />
                              </td>
                              <td className="px-5 py-3 align-top">
                                <EditableCell disabled={isCommitted} value={member.contact_no} placeholder="Contact No" isLowConfidence={isLowConf} onChange={(val: string) => handleUpdateMember(member.id, { contact_no: val })} />
                                {member.existingProdMember && (
                                  <div className="text-[10px] text-indigo-400 mt-1 whitespace-normal">
                                    Will update existing member (last updated {member.existingProdMember.date || new Date(member.existingProdMember.updatedAt).toLocaleDateString()})
                                  </div>
                                )}
                              </td>
                              <td className="px-5 py-3">
                                <EditableCell disabled={isCommitted} value={member.date} placeholder="Join Date" isLowConfidence={isLowConf} onChange={(val: string) => handleUpdateMember(member.id, { date: val })} />
                              </td>
                              <td className="px-5 py-3 min-w-[200px]">
                                <select 
                                  disabled={isCommitted}
                                  className={`w-full bg-transparent outline-none focus:ring-2 focus:ring-indigo-500/50 rounded px-1.5 py-1 text-sm border hover:bg-slate-800/50 transition-colors appearance-none ${isLowConf ? 'bg-red-500/20 text-red-200 border-red-500/30' : 'border-transparent text-slate-300'} disabled:opacity-70`}
                                  value={member.membershipPlanId || ""}
                                  onChange={e => handleUpdateMember(member.id, { membershipPlanId: e.target.value || null })}
                                >
                                  <option value="" className="bg-slate-900 text-slate-400">No Plan Assigned</option>
                                  {stagedPlans.map((p: any) => (
                                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">{p.name} - {p.duration} ({p.price})</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-5 py-3 text-right">
                                {isFlagged ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-red-400 bg-red-400/10 px-2.5 py-1 rounded border border-red-400/20">
                                    <AlertCircle className="w-3.5 h-3.5" /> FLAGGED
                                  </span>
                                ) : isLowConf ? (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded border border-amber-400/20">
                                    <Filter className="w-3.5 h-3.5" /> NEEDS REVIEW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded border border-emerald-400/20">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> READY
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {!isCommitted && (
                                  <button 
                                    onClick={() => handleDeleteMember(member.id)}
                                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                    title="Delete Member"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error Panel */}
              {flaggedMembers.length > 0 && (
                <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-red-400 mb-4 font-bold text-lg">
                    <ShieldAlert className="w-5 h-5" />
                    Validation Issues To Resolve
                  </div>
                  <div className="space-y-4 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                    {flaggedMembers.map((m: any) => (
                      <div key={`err-${m.id}`} className="bg-slate-900/50 border border-red-900/30 rounded-xl p-4 flex gap-4">
                        <div className="font-semibold text-slate-200 min-w-[150px]">{m.name || "Unknown Name"}</div>
                        <ul className="list-disc list-inside text-sm text-red-300/80 space-y-1">
                          {m.validationResults?.filter((r: any) => r.severity === 'error').map((err: any, i: number) => (
                            <li key={i}>{err.message}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-[400px] flex flex-col items-center justify-center text-slate-500 p-8 rounded-3xl border border-dashed border-slate-800 bg-slate-900/20 shadow-sm">
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800/80 flex items-center justify-center mb-6 shadow-sm">
                <LayoutTemplate className="w-10 h-10 text-slate-700" />
              </div>
              <h3 className="text-2xl font-bold text-slate-300 mb-3 tracking-tight">Ready for Extraction</h3>
              <p className="max-w-md text-center text-sm leading-relaxed text-slate-400">
                Upload files to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
