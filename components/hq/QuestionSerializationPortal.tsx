
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  SchoolRegistryEntry, 
  MasterQuestion, 
  SerializedExam, 
  QuestionPack, 
  SerializationData,
  BloomsScale
} from '../../types';
import { SUBJECT_LIST } from '../../constants';
import EditableField from '../shared/EditableField';

const BLOOMS: BloomsScale[] = ['Knowledge', 'Understanding', 'Application', 'Analysis', 'Synthesis', 'Evaluation'];

const QuestionSerializationPortal: React.FC<{ registry: SchoolRegistryEntry[] }> = ({ registry }) => {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECT_LIST[0]);
  const [selectedMock, setSelectedMock] = useState('MOCK 1');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [activeTab, setActiveTab] = useState<'INGEST' | 'PACKS' | 'MATRIX' | 'EMBOSS' | 'NETWORK'>('INGEST');
  
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serializedExam, setSerializedExam] = useState<SerializedExam | null>(null);
  const [schoolSerialization, setSchoolSerialization] = useState<SerializationData | null>(null);

  // Editable Academy Particulars for Embossing
  const [embossConfig, setEmbossConfig] = useState({
    academyName: 'UNITED BAYLOR ACADEMY',
    academyAddress: 'ACCRA DIGITAL CENTRE, GHANA',
    academyContact: '+233 24 350 4091',
    generalRules: '1. Candidates must answer all questions in Section A.\n2. Use black or blue ink only.\n3. Mobile devices are strictly prohibited.',
    sectionAInstructions: 'ANSWER ALL QUESTIONS. EACH ITEM CARRIES 1 MARK.',
    sectionBInstructions: 'ANSWER ANY FOUR QUESTIONS. ALL QUESTIONS CARRY EQUAL MARKS.'
  });

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
    const fetchNodeSerials = async () => {
      if (!selectedSchoolId) return;
      const mockKey = selectedMock.replace(/\s+/g, '');
      const { data: serData } = await supabase.from('uba_persistence').select('payload').eq('id', `serialization_${selectedSchoolId}_${mockKey}`).maybeSingle();
      const { data: examData } = await supabase.from('uba_persistence').select('payload').eq('id', `serialized_exam_${selectedSchoolId}_${mockKey}_${selectedSubject.replace(/\s+/g, '')}`).maybeSingle();
      
      if (serData?.payload) setSchoolSerialization(serData.payload);
      if (examData?.payload) setSerializedExam(examData.payload);
    };
    fetchNodeSerials();
  }, [selectedSchoolId, selectedMock, selectedSubject]);

  const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

  const createPack = (variant: 'A' | 'B' | 'C' | 'D', bank: MasterQuestion[]): QuestionPack => {
    const objs = bank.filter(q => q.type === 'OBJECTIVE');
    const theories = bank.filter(q => q.type === 'THEORY');
    
    // Pack A is always the Master Sequence
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
      generalRules: embossConfig.generalRules,
      sectionInstructions: { A: embossConfig.sectionAInstructions, B: embossConfig.sectionBInstructions },
      objectives: scrambledObjs,
      theory: scrambledTheories,
      schemeCode: `UBA-SC-${variant}-${Math.random().toString(36).substring(7).toUpperCase()}`,
      matchingMatrix
    };
  };

  const propagateToAllNodes = async () => {
    if (masterQuestions.length === 0) return alert("Populate the Master Bank first.");
    if (!window.confirm(`BULK DEPLOYMENT: Generate unique scrambled packs for ALL ${registry.length} nodes?`)) return;

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
    alert("GLOBAL SYNCHRONIZATION COMPLETE.");
    setActiveTab('NETWORK');
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-6 bg-slate-950 text-slate-100 overflow-hidden">
      
      {/* Top Command Bar */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-8 border-b border-slate-800 pb-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase text-white tracking-tighter flex items-center gap-3">
             <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
             Master Serialization Hub
          </h2>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Integrated Examination & Embossing Engine</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black text-white outline-none">
            {SUBJECT_LIST.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select value={selectedMock} onChange={e => setSelectedMock(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black text-white outline-none">
            {['MOCK 1', 'MOCK 2', 'MOCK 3', 'MOCK 4', 'MOCK 5'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={propagateToAllNodes} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
             {isProcessing ? 'Syncing...' : 'Propagate to Network'}
          </button>
        </div>
      </div>

      {/* Progress Overlay */}
      {isProcessing && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-10 space-y-8">
           <h3 className="text-4xl font-black uppercase text-white tracking-widest">Federated Deployment</h3>
           <div className="w-full max-w-2xl h-6 bg-slate-900 rounded-full border border-slate-800 p-1">
              <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
           </div>
           <p className="text-indigo-400 font-bold uppercase tracking-[0.4em] animate-pulse">Mirroring shards to global registry: {progress}%</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['INGEST', 'PACKS', 'EMBOSS', 'NETWORK'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
            {tab === 'INGEST' ? 'Master Ingestion' : tab === 'PACKS' ? 'Pack Monitor' : tab === 'EMBOSS' ? 'Academy Embossing' : 'Network Readiness'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-[500px]">
        {activeTab === 'EMBOSS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full overflow-hidden">
             {/* CONFIG PANEL */}
             <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col space-y-8 overflow-y-auto no-scrollbar">
                <div className="space-y-1">
                   <h3 className="text-lg font-black uppercase text-blue-400">Embossing Controller</h3>
                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Customize printable paper particulars</p>
                </div>

                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Official Academy Identity</label>
                      <input value={embossConfig.academyName} onChange={e=>setEmbossConfig({...embossConfig, academyName: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-xs font-black text-white outline-none focus:border-blue-500" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Postal Node Address</label>
                      <input value={embossConfig.academyAddress} onChange={e=>setEmbossConfig({...embossConfig, academyAddress: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-xs font-black text-white outline-none focus:border-blue-500" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Examination General Rules</label>
                      <textarea value={embossConfig.generalRules} onChange={e=>setEmbossConfig({...embossConfig, generalRules: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-5 text-[10px] font-bold text-slate-300 outline-none focus:border-blue-500 min-h-[120px]" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Target Node for Preview</label>
                      <select value={selectedSchoolId} onChange={e=>setSelectedSchoolId(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-xs font-black text-white outline-none">
                         <option value="">SELECT SCHOOL...</option>
                         {registry.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                   </div>
                </div>

                <div className="pt-4">
                   <button onClick={() => window.print()} className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 tracking-widest">Dispatch to Printer</button>
                </div>
             </div>

             {/* PREVIEW PANEL */}
             <div className="lg:col-span-8 h-full overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-inner">
                {schoolSerialization && serializedExam ? (
                   <div className="space-y-20">
                      {schoolSerialization.pupils.slice(0, 3).map((p, i) => (
                        <div key={i} className="bg-white p-12 rounded-sm border-t-[15px] border-indigo-950 shadow-2xl text-slate-900 font-serif max-w-[210mm] mx-auto min-h-[297mm] flex flex-col scale-[0.9] origin-top">
                           {/* HEADER */}
                           <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
                              <div className="space-y-2">
                                 <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{embossConfig.academyName}</h1>
                                 <p className="text-[12px] font-black text-blue-800 uppercase tracking-[0.4em]">{selectedMock} — {selectedSubject.toUpperCase()}</p>
                                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{embossConfig.academyAddress}</p>
                              </div>
                              <div className="bg-slate-900 text-white px-6 py-4 rounded-xl flex flex-col items-center justify-center min-w-[100px]">
                                 <span className="text-[10px] font-black uppercase">PACK</span>
                                 <span className="text-5xl font-black leading-none">{p.serial}</span>
                              </div>
                           </div>

                           {/* CANDIDATE BOX */}
                           <div className="grid grid-cols-2 gap-10 mb-8 text-[12px] font-bold border-b-2 border-slate-200 pb-6">
                              <div className="space-y-2">
                                 <div className="flex gap-3"><span>NAME:</span> <span className="border-b border-slate-900 flex-1 font-black uppercase">{p.name}</span></div>
                                 <div className="flex gap-3"><span>INDEX:</span> <span className="border-b border-slate-900 flex-1 font-mono">{selectedSchoolId}/PUP-{p.id}</span></div>
                              </div>
                              <div className="space-y-2 text-right">
                                 <div className="flex gap-3 justify-end"><span>EXAM DATE:</span> <span className="font-black">{schoolSerialization.startDate}</span></div>
                                 <div className="flex gap-3 justify-end"><span>SERIAL:</span> <span className="font-mono text-indigo-700 bg-indigo-50 px-2 font-black">{p.questionCode}</span></div>
                              </div>
                           </div>

                           {/* RULES */}
                           <div className="border-2 border-slate-900 p-4 rounded-xl mb-8 bg-slate-50">
                              <h5 className="text-[9px] font-black uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">GENERAL RULES</h5>
                              <p className="text-[11px] italic leading-relaxed whitespace-pre-wrap">{embossConfig.generalRules}</p>
                           </div>

                           {/* CONTENT PREVIEW */}
                           <div className="flex-1 space-y-10">
                              <div className="space-y-4">
                                 <div className="bg-slate-900 text-white p-2 rounded-t-lg text-[10px] font-black uppercase tracking-[0.2em]">Section A: Objectives (40 Marks)</div>
                                 <div className="border-2 border-slate-900 p-4 rounded-b-lg italic text-xs text-slate-500 min-h-[100px] flex items-center justify-center">
                                    [ VARIANT {p.serial} SEQUENCE EMBEDDED — 40 ITEMS ]
                                 </div>
                              </div>
                              <div className="space-y-4">
                                 <div className="bg-indigo-900 text-white p-2 rounded-t-lg text-[10px] font-black uppercase tracking-[0.2em]">Section B: Theory (60 Marks)</div>
                                 <div className="border-2 border-slate-900 p-4 rounded-b-lg italic text-xs text-slate-500 min-h-[150px] flex items-center justify-center">
                                    [ VARIANT {p.serial} SEQUENCE EMBEDDED — 5 QUESTIONS ]
                                 </div>
                              </div>
                           </div>

                           {/* FOOTER */}
                           <div className="mt-10 pt-6 border-t-4 border-double border-slate-900 flex justify-between items-end">
                              <div className="w-[30%] text-center border-t border-slate-400 pt-1 text-[8px] font-black uppercase text-slate-500">Chief Examiner Signature</div>
                              <p className="text-[8px] font-black uppercase tracking-[1em] opacity-40">UBA NETWORK HUB</p>
                              <div className="w-[30%] text-center border-t border-slate-400 pt-1 text-[8px] font-black uppercase text-slate-500">Candidate Signature</div>
                           </div>
                        </div>
                      ))}
                      <p className="text-center text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Previewing 3 of {schoolSerialization.pupils.length} papers</p>
                   </div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6 py-20">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                      <p className="font-black uppercase text-sm tracking-[0.4em]">Select serialized node for embossing preview</p>
                   </div>
                )}
             </div>
          </div>
        )}
        
        {/* Placeholder for other tabs logic... */}
        {activeTab !== 'EMBOSS' && <div className="p-20 text-center opacity-20 uppercase font-black tracking-widest">{activeTab} MODULE ACTIVE</div>}
      </div>
    </div>
  );
};

export default QuestionSerializationPortal;
