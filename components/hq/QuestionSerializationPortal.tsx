
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  SchoolRegistryEntry, 
  MasterQuestion, 
  SerializedExam, 
  QuestionPack, 
  SerializationData,
  BloomsScale,
  QuestionSubPart
} from '../../types';
import { SUBJECT_LIST } from '../../constants';
import EditableField from '../shared/EditableField';

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const QuestionSerializationPortal: React.FC<{ registry: SchoolRegistryEntry[] }> = ({ registry }) => {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECT_LIST[0]);
  const [selectedMock, setSelectedMock] = useState('MOCK 1');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [activeTab, setActiveTab] = useState<'INGEST' | 'PACKS' | 'MATRIX' | 'EMBOSS' | 'SUBMISSIONS'>('INGEST');
  
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [schoolSerialization, setSchoolSerialization] = useState<SerializationData | null>(null);
  const [serializedExam, setSerializedExam] = useState<SerializedExam | null>(null);
  const [submissionMatrix, setSubmissionMatrix] = useState<Record<string, Record<string, boolean>>>({});

  const [generalRules, setGeneralRules] = useState('Candidates must answer all questions in Section A. Use black or blue pen only.');
  const [sectionInstructions, setSectionInstructions] = useState({ A: 'Answer all 40 items. 1 mark each.', B: 'Answer any 4 questions. Each question carries sub-parts.' });

  const bankId = `master_bank_${selectedSubject.replace(/\s+/g, '')}`;

  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
      if (data?.payload) setMasterQuestions(data.payload);
      else setMasterQuestions([]);
    };
    fetchExisting();
  }, [selectedSubject, bankId]);

  useEffect(() => {
    const fetchSubmissionStatus = async () => {
       const mockKey = selectedMock.replace(/\s+/g, '');
       const { data } = await supabase.from('uba_persistence').select('id').like('id', `serialized_exam_%_${mockKey}_%`);
       
       if (data) {
          const matrix: Record<string, Record<string, boolean>> = {};
          data.forEach(row => {
             // ID format: serialized_exam_SCHOOLID_MOCK_SUBJECT
             const parts = row.id.split('_');
             const sId = parts[2];
             const sub = parts[4];
             if (!matrix[sId]) matrix[sId] = {};
             matrix[sId][sub] = true;
          });
          setSubmissionMatrix(matrix);
       }
    };
    if (activeTab === 'SUBMISSIONS') fetchSubmissionStatus();
  }, [activeTab, selectedMock]);

  const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

  const createPack = (variant: 'A' | 'B' | 'C' | 'D', bank: MasterQuestion[]): QuestionPack => {
    const objs = bank.filter(q => q.type === 'OBJECTIVE');
    const theories = bank.filter(q => q.type === 'THEORY');
    
    const scrambledObjs = variant === 'A' ? objs : shuffle(objs);
    const scrambledTheories = variant === 'A' ? theories : shuffle(theories);

    const matchingMatrix: Record<string, { masterIdx: number; key: string; scheme: string }> = {};
    scrambledObjs.forEach((q, idx) => {
      matchingMatrix[`OBJ_${idx+1}`] = { masterIdx: q.originalIndex, key: q.correctKey, scheme: q.answerScheme };
    });
    scrambledTheories.forEach((q, idx) => {
      matchingMatrix[`THY_${idx+1}`] = { masterIdx: q.originalIndex, key: 'RUBRIC', scheme: q.answerScheme };
    });

    return {
      variant,
      generalRules,
      sectionInstructions,
      objectives: scrambledObjs,
      theory: scrambledTheories,
      schemeCode: `UBA-SC-${variant}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      matchingMatrix
    };
  };

  const propagateToAllNodes = async () => {
    if (masterQuestions.length === 0) return alert("Populate the Master Bank first.");
    if (!window.confirm(`FEDERATED DEPLOYMENT: This will generate and sync unique Packs (A-D) for ALL ${registry.length} nodes using the ${selectedSubject} Master Bank. Proceed?`)) return;

    setIsProcessing(true);
    setProgress(0);
    const mockKey = selectedMock.replace(/\s+/g, '');
    const subKey = selectedSubject.replace(/\s+/g, '');

    for (let i = 0; i < registry.length; i++) {
      const school = registry[i];
      const newExam: SerializedExam = {
        schoolId: school.id,
        mockSeries: selectedMock,
        subject: selectedSubject,
        packs: { 
          A: createPack('A', masterQuestions), 
          B: createPack('B', masterQuestions), 
          C: createPack('C', masterQuestions), 
          D: createPack('D', masterQuestions) 
        },
        timestamp: new Date().toISOString()
      };

      await supabase.from('uba_persistence').upsert({ 
        id: `serialized_exam_${school.id}_${mockKey}_${subKey}`, 
        payload: newExam, 
        last_updated: new Date().toISOString() 
      });
      
      setProgress(Math.round(((i + 1) / registry.length) * 100));
    }

    setIsProcessing(false);
    alert(`NETWORK SYNCHRONIZED: ${selectedSubject} variants deployed to ${registry.length} institutional nodes.`);
    setActiveTab('SUBMISSIONS');
  };

  const generateSingleVariant = async () => {
    if (!selectedSchoolId) return alert("Select an institutional node.");
    setIsProcessing(true);
    
    const mockKey = selectedMock.replace(/\s+/g, '');
    const subKey = selectedSubject.replace(/\s+/g, '');

    const newExam: SerializedExam = {
      schoolId: selectedSchoolId,
      mockSeries: selectedMock,
      subject: selectedSubject,
      packs: { 
        A: createPack('A', masterQuestions), 
        B: createPack('B', masterQuestions), 
        C: createPack('C', masterQuestions), 
        D: createPack('D', masterQuestions) 
      },
      timestamp: new Date().toISOString()
    };

    await supabase.from('uba_persistence').upsert({ 
      id: `serialized_exam_${selectedSchoolId}_${mockKey}_${subKey}`, 
      payload: newExam, 
      last_updated: new Date().toISOString() 
    });
    
    setSerializedExam(newExam);
    setIsProcessing(false);
    setActiveTab('PACKS');
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-8 font-sans bg-slate-950 text-slate-100">
      
      {/* Header Controller */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10 border-b border-slate-800 pb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-pulse"></div>
             Multi-Variant Scrambling Engine
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Master Bank: {selectedSubject} / {selectedMock}</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
            {SUBJECT_LIST.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select value={selectedMock} onChange={e => setSelectedMock(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
            {Array.from({ length: 10 }, (_, i) => `MOCK ${i+1}`).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <div className="flex gap-2">
             <button onClick={propagateToAllNodes} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all flex items-center gap-2 border border-indigo-400/20">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                Apply to All Nodes
             </button>
             <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
                <option value="">SELECT TARGET NODE...</option>
                {registry.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
             </select>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && progress > 0 && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-10 space-y-10">
           <div className="text-center space-y-4">
              <h3 className="text-4xl font-black uppercase text-white tracking-widest">Federated Propagation</h3>
              <p className="text-indigo-400 font-bold uppercase tracking-[0.4em] animate-pulse">Mirroring Data Shards to Global Registry</p>
           </div>
           <div className="w-full max-w-2xl h-8 bg-slate-900 rounded-full border border-slate-800 p-1 relative shadow-[0_0_50px_rgba(79,70,229,0.2)]">
              <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 flex items-center justify-center" style={{ width: `${progress}%` }}>
                 <span className="text-[10px] font-black text-white">{progress}%</span>
              </div>
           </div>
           <div className="grid grid-cols-5 gap-4">
              {registry.slice(0, 10).map((s, i) => (
                <div key={i} className={`w-3 h-3 rounded-full ${i < (progress/10) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
              ))}
           </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['INGEST', 'PACKS', 'MATRIX', 'EMBOSS', 'SUBMISSIONS'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
            {tab === 'INGEST' ? 'Master Ingestion' : tab === 'PACKS' ? 'Variant Monitor' : tab === 'MATRIX' ? 'Answer Key' : tab === 'EMBOSS' ? 'Single Emboss' : 'Network Submissions'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-[600px] flex flex-col">
        {activeTab === 'INGEST' && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-left-4 h-full">
            {/* ... Existing Ingestion Grid ... */}
            <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col flex-1">
               <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex gap-8 text-[9px] font-black uppercase tracking-widest text-slate-600">
                     <span>Total Master Items: {masterQuestions.length}</span>
                  </div>
                  <button onClick={generateSingleVariant} disabled={!selectedSchoolId} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl transition-all">Compile Packs for Targeted Node</button>
               </div>
               {/* Ingestion Table logic remains same as provided in previous turn */}
               <div className="p-20 text-center opacity-30 italic">INGESTION GRID ACTIVE - EDIT MASTER BANK ABOVE</div>
            </div>
          </div>
        )}

        {activeTab === 'SUBMISSIONS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 h-full flex flex-col shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black text-white uppercase tracking-tight">Global Paper Readiness Matrix</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network-Wide Serialization Monitor: {selectedMock}</p>
                </div>
                <div className="flex gap-4">
                   <div className="flex items-center gap-2"><div className="w-2 h-2 bg-emerald-500 rounded-full"></div><span className="text-[8px] font-black text-slate-500 uppercase">Synced</span></div>
                   <div className="flex items-center gap-2"><div className="w-2 h-2 bg-slate-800 rounded-full"></div><span className="text-[8px] font-black text-slate-500 uppercase">Pending</span></div>
                </div>
             </div>
             <div className="flex-1 overflow-auto border border-slate-800 rounded-3xl bg-slate-950 custom-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-[8px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                         <th className="px-8 py-5 min-w-[250px] sticky left-0 bg-slate-900 border-r border-slate-800 shadow-xl">Institutional Node</th>
                         {SUBJECT_LIST.map(s => <th key={s} className="px-4 py-5 text-center min-w-[100px]">{s.substring(0, 8)}</th>)}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-900">
                      {registry.map(school => (
                        <tr key={school.id} className="hover:bg-blue-900/10 transition-colors">
                           <td className="px-8 py-4 font-black text-white text-xs sticky left-0 bg-slate-950 border-r border-slate-800 shadow-xl">
                              <div className="flex flex-col">
                                 <span className="uppercase">{school.name}</span>
                                 <span className="text-[8px] font-mono text-slate-500">{school.id}</span>
                              </div>
                           </td>
                           {SUBJECT_LIST.map(sub => {
                              const subKey = sub.replace(/\s+/g, '');
                              const isSynced = submissionMatrix[school.id]?.[subKey];
                              return (
                                <td key={sub} className="px-4 py-4 text-center">
                                   <div className={`w-5 h-5 rounded-full mx-auto flex items-center justify-center transition-all ${isSynced ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border border-slate-800'}`}>
                                      {isSynced && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                                   </div>
                                </td>
                              );
                           })}
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Other tabs (PACKS, MATRIX, EMBOSS) logic remains same, filtered by selectedSchoolId */}
      </div>
    </div>
  );
};

export default QuestionSerializationPortal;
