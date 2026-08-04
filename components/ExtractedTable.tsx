"use client";

import React, { useState, useEffect } from "react";
import { PublicationRecord } from "@/lib/types";
import { FileDown, Check, AlertTriangle, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface ExtractedTableProps {
  data: PublicationRecord[];
  onChange?: (data: PublicationRecord[]) => void;
}

const EditableCell = ({
  value,
  field,
  recordId,
  lowConf,
  isEmptyReq,
  onUpdate
}: {
  value: string;
  field: keyof PublicationRecord;
  recordId: string;
  lowConf: boolean;
  isEmptyReq?: boolean;
  onUpdate: (id: string, field: keyof PublicationRecord, val: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempVal, setTempVal] = useState(value || "");

  useEffect(() => {
    setTempVal(value || "");
  }, [value]);

  const save = () => {
    setIsEditing(false);
    if (tempVal !== (value || "")) {
      onUpdate(recordId, field, tempVal);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') {
      setTempVal(value || "");
      setIsEditing(false);
    }
  };

  let bgClass = "hover:bg-slate-800/50";
  if (lowConf) bgClass = "bg-yellow-500/20 ring-1 ring-yellow-500/50 hover:bg-yellow-500/30 text-yellow-100";
  if (isEmptyReq) bgClass = "bg-red-500/20 ring-1 ring-red-500/50 hover:bg-red-500/30 text-red-100 font-medium";

  if (isEditing) {
    return (
      <input
        autoFocus
        type="text"
        className="w-full bg-slate-800 border border-indigo-500 rounded px-2 py-1 text-slate-100 outline-none text-sm min-w-[120px] shadow-sm focus:ring-2 focus:ring-indigo-500/50"
        value={tempVal}
        onChange={(e) => setTempVal(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div 
      tabIndex={0}
      onFocus={() => setIsEditing(true)}
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => { if (e.key === 'Enter') setIsEditing(true); }}
      className={`min-h-[30px] w-full px-2 py-1.5 rounded cursor-text transition-colors flex items-center outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 ${bgClass} ${(!value || value.trim() === "") ? 'italic text-slate-500' : 'text-slate-200'}`}
    >
      {value && value.trim() !== "" ? value : "—"}
      {lowConf && !isEditing && (
        <span title="Low confidence OCR" className="ml-auto flex-shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 opacity-70" />
        </span>
      )}
    </div>
  );
};

export default function ExtractedTable({ data, onChange }: ExtractedTableProps) {
  const [records, setRecords] = useState<PublicationRecord[]>(data);

  useEffect(() => {
    setRecords(data);
  }, [data]);

  const updateParent = (newRecords: PublicationRecord[]) => {
    setRecords(newRecords);
    if (onChange) onChange(newRecords);
  };

  if (!records || records.length === 0) return null;

  const handleExportCSV = () => {
    const headers = [
      "Roll Number", "Student Name", "Paper Title", "Journal Name", 
      "ISSN", "Volume/Issue", "DOI", "PR Number", "Faculty Coordinator"
    ];
    
    const rows = records.map(record => [
      record.rollNumber,
      record.studentName,
      `"${record.paperTitle.replace(/"/g, '""')}"`,
      `"${record.journalName.replace(/"/g, '""')}"`,
      record.issn,
      record.volumeIssue,
      record.doi,
      record.prNumber,
      `"${record.facultyCoordinator.replace(/"/g, '""')}"`
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "extracted_publications.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUpdate = (id: string, field: keyof PublicationRecord, value: string) => {
    const updated = records.map(r => r.id === id ? { ...r, [field]: value } : r);
    updateParent(updated);
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    updateParent(updated);
  };

  const handleAddRow = () => {
    const newRecord: PublicationRecord = {
      id: uuidv4(),
      rollNumber: "",
      studentName: "",
      paperTitle: "",
      journalName: "",
      issn: "",
      volumeIssue: "",
      doi: "",
      prNumber: "",
      facultyCoordinator: "",
      sourceImageId: "manual",
    };
    updateParent([newRecord, ...records]);
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-6 sm:px-8 border-b border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white tracking-tight flex items-center gap-2">
              <span className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20 shadow-sm">
                <Check className="w-5 h-5 text-emerald-400" />
              </span>
              Extracted Records
            </h2>
            <p className="text-slate-400 text-sm mt-1.5 max-w-2xl">
              Review and edit the extracted details. Click any cell to edit inline (Blur or Enter to save). Yellow cells indicate low confidence; Red indicates missing required fields.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 border border-indigo-500/30 font-medium text-sm transition-colors active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Plus className="w-4 h-4" /> Add Row
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-all shadow-sm ring-1 ring-white/10 hover:ring-white/20 hover:shadow-lg active:scale-95 outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <FileDown className="w-4 h-4 text-emerald-400" /> Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="w-full flex-1 overflow-x-auto overflow-y-auto max-h-[600px] custom-scrollbar relative">
        <table className="w-full text-sm text-left whitespace-nowrap min-w-max border-collapse">
          <thead className="text-xs text-slate-400 uppercase bg-slate-950/95 sticky top-0 z-20 backdrop-blur-md shadow-sm">
            <tr>
              <th className="px-4 py-3.5 font-semibold sticky left-0 bg-slate-950/95 z-30 shadow-[1px_0_0_rgba(30,41,59,1)]">Source</th>
              <th className="px-4 py-3.5 font-semibold text-red-300">Roll Number *</th>
              <th className="px-4 py-3.5 font-semibold">Student Name</th>
              <th className="px-4 py-3.5 font-semibold min-w-[200px]">Paper Title</th>
              <th className="px-4 py-3.5 font-semibold">Journal Name</th>
              <th className="px-4 py-3.5 font-semibold">ISSN</th>
              <th className="px-4 py-3.5 font-semibold">Vol/Issue</th>
              <th className="px-4 py-3.5 font-semibold text-red-300">DOI *</th>
              <th className="px-4 py-3.5 font-semibold">PR Number</th>
              <th className="px-4 py-3.5 font-semibold">Coordinator</th>
              <th className="px-4 py-3.5 font-semibold text-right sticky right-0 bg-slate-950/95 z-30 shadow-[-1px_0_0_rgba(30,41,59,1)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {records.map(record => (
              <tr key={record.id} className="hover:bg-slate-800/40 transition-colors group">
                <td className="px-4 py-2 sticky left-0 bg-slate-900/50 group-hover:bg-slate-800/80 z-10 transition-colors shadow-[1px_0_0_rgba(30,41,59,0.5)]">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-950/50 text-xs text-slate-400 font-mono ring-1 ring-white/5" title={`Source: ${record.sourceImageId}`}>
                    <ImageIcon className="w-3.5 h-3.5" />
                    {record.sourceImageId === "manual" ? "Manual" : record.sourceImageId.substring(0,4)}
                  </div>
                </td>
                <td className="px-4 py-2"><EditableCell value={record.rollNumber} field="rollNumber" recordId={record.id} lowConf={(record.confidenceScores?.rollNumber || 100) < 70} isEmptyReq={!record.rollNumber || record.rollNumber.trim() === ""} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.studentName} field="studentName" recordId={record.id} lowConf={(record.confidenceScores?.studentName || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.paperTitle} field="paperTitle" recordId={record.id} lowConf={(record.confidenceScores?.paperTitle || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.journalName} field="journalName" recordId={record.id} lowConf={(record.confidenceScores?.journalName || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.issn} field="issn" recordId={record.id} lowConf={(record.confidenceScores?.issn || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.volumeIssue} field="volumeIssue" recordId={record.id} lowConf={(record.confidenceScores?.volumeIssue || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.doi} field="doi" recordId={record.id} lowConf={(record.confidenceScores?.doi || 100) < 70} isEmptyReq={!record.doi || record.doi.trim() === ""} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.prNumber} field="prNumber" recordId={record.id} lowConf={(record.confidenceScores?.prNumber || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2"><EditableCell value={record.facultyCoordinator} field="facultyCoordinator" recordId={record.id} lowConf={(record.confidenceScores?.facultyCoordinator || 100) < 70} onUpdate={handleUpdate} /></td>
                <td className="px-4 py-2 text-right sticky right-0 bg-slate-900/50 group-hover:bg-slate-800/80 z-10 transition-colors shadow-[-1px_0_0_rgba(30,41,59,0.5)]">
                  <button 
                    onClick={() => handleDelete(record.id)} 
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 ring-1 ring-transparent hover:ring-red-500/30"
                    title="Delete row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
