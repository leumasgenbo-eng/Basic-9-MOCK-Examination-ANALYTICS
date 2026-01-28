
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
  const [activeTab, setActiveTab] = useState<'INGEST' | 'PACKS' | 'MATRIX' | 'EMBOSS' | 'NETWORK'>('INGEST');
  
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [serializedExam, setSerializedExam] = useState<SerializedExam | null>(null);
  const [schoolSerialization, setSchoolSerialization] = useState<SerializationData | null>(null);

  // Global Instructions Control
  const [embossConfig, setEmbossConfig] = useState({
    academyName: 'UNITED BAYLOR ACADEMY',
    academyAddress: 'ACCRA DIGITAL CENTRE, GHANA',
    academyContact: '+233 24 350 4091',
    generalRules: 'Candidates must answer all questions in Section A. Use black or blue pen only.',
    sectionAInstructions: 'Answer all 40 items. 1 mark each.',
    sectionBInstructions: 'Answer any 4 questions. Each question carries sub-parts.'
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

  const handleAddTheoryRow = () => {
    const nextIdx = masterQuestions.length + 1;
    const newQ: MasterQuestion = {
      id: `MQ-${Date.now()}-${nextIdx}`,
      originalIndex: nextIdx,
      type: 'THEORY',
      strand: 'Strand Name',
      subStrand: 'Sub-Strand',
      indicator: 'B9.1.1.1',
      questionText: 'Main question body text...',
      instruction: 'Question instruction...',
      correctKey: 'RUBRIC',
      weight: 10,
      blooms: 'Knowledge',
      parts: [
        { partLabel: 'a.i', text: 'Part text...', possibleAnswers: '', markingScheme: 'Scheme...', weight: 2, blooms: 'Knowledge' },
        { partLabel: 'a.ii', text: 'Part text...', possibleAnswers: '', markingScheme: 'Scheme...', weight: 2, blooms: 'Knowledge' }
      ],
      answerScheme: 'Detailed answer scheme for this theory item...'
    };
    setMasterQuestions([...masterQuestions, newQ]);
  };

  const handleAdd40Objectives = () => {
    const newObjs: MasterQuestion[] = Array.from({ length: 40 }, (_, i) => ({
      id: `MQ-OBJ-${Date.now()}-${i + 1}`,
      originalIndex: masterQuestions.length + i + 1,
      type: 'OBJECTIVE',
      strand: 'ENGLISH',
      subStrand: 'Standard Grammar',
      indicator: `B9.1.1.1.${i + 1}`,
      questionText: `Standard English Item #${i + 1}`,
      instruction: 'Choose the best option.',
      correctKey: 'A',
      weight: 1,
      blooms: 'Knowledge',
      parts: [],
      answerScheme: 'Standard Option A'
    }));
    setMasterQuestions([...masterQuestions, ...newObjs]);
  };

  const handleSaveMasterBank = async () => {
    setIsProcessing(true);
    await supabase.from('uba_persistence').upsert({
      id: bankId,
      payload: masterQuestions,
      last_updated: new Date().toISOString()
    });
    setIsProcessing(false);
    alert("MASTER BANK SYNCHRONIZED.");
  };

  const updateQuestion = (id: string, field: keyof MasterQuestion, value: any) => {
    setMasterQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

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
    if (masterQuestions.length === 0) return alert("Populate Master Bank.");
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
        packs: { A: createPack('A', masterQuestions), B: createPack('B', masterQuestions), C: createPack('C', masterQuestions), D: createPack('D', masterQuestions) },
        timestamp: new Date().toISOString()
      };
      await supabase.from('uba_persistence').upsert({ id: `serialized_exam_${school.id}_${mockKey}_${subKey}`, payload: newExam });
      setProgress(Math.round(((i + 1) / registry.length) * 100));
    }
    setIsProcessing(false);
    alert("NETWORK DEPLOYMENT COMPLETE.");
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-6 bg-slate-950 text-slate-100 overflow-hidden font-sans">
      
      {/* Dynamic Command Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-6 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-black uppercase text-white tracking-tighter flex items-center gap-3">
             <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
             Multi-Variant Ingestion & Serialization
          </h2>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Integrated Hub Engine: {selectedSubject}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black text-white outline-none">
            {SUBJECT_LIST.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select value={selectedMock} onChange={e => setSelectedMock(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-[10px] font-black text-white outline-none">
            {['MOCK 1', 'MOCK 2', 'MOCK 3', 'MOCK 4', 'MOCK 5'].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button onClick={propagateToAllNodes} disabled={isProcessing} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
             {isProcessing ? 'Syncing...' : 'Apply to All Nodes'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['INGEST', 'PACKS', 'MATRIX', 'EMBOSS', 'NETWORK'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
            {tab === 'INGEST' ? 'Hub Ingestion' : tab === 'PACKS' ? 'Variant Monitor' : tab === 'MATRIX' ? 'Answer Key' : tab === 'EMBOSS' ? 'Paper Embossing' : 'Readiness'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'INGEST' && (
          <div className="h-full flex flex-col space-y-6">
            {/* Global Instructions Control */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl">
               <div className="space-y-2">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">General Rules</label>
                  <textarea value={embossConfig.generalRules} onChange={e=>setEmbossConfig({...embossConfig, generalRules: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 min-h-[60px]" />
               </div>
               <div className="space-y-2">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Section A Instructions</label>
                  <textarea value={embossConfig.sectionAInstructions} onChange={e=>setEmbossConfig({...embossConfig, sectionAInstructions: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 min-h-[60px]" />
               </div>
               <div className="space-y-2">
                  <label className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Section B Instructions</label>
                  <textarea value={embossConfig.sectionBInstructions} onChange={e=>setEmbossConfig({...embossConfig, sectionBInstructions: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-[10px] text-slate-300 min-h-[60px]" />
               </div>
            </div>

            <div className="flex gap-4">
               <button onClick={handleAdd40Objectives} className="bg-blue-600/20 text-blue-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-blue-500/30 hover:bg-blue-600 hover:text-white transition-all">+ 40 Objectives</button>
               <button onClick={handleAddTheoryRow} className="bg-indigo-600/20 text-indigo-400 px-6 py-3 rounded-xl font-black text-[10px] uppercase border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all">+ Theory Row</button>
               <button onClick={handleSaveMasterBank} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-xl ml-auto">Save Master Bank</button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-900 rounded-[2rem] border border-slate-800 custom-scrollbar">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-950 sticky top-0 z-10 text-[8px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                     <tr>
                        <th className="px-6 py-4 w-12">Sec</th>
                        <th className="px-4 py-4 w-12 text-center">Q#</th>
                        <th className="px-6 py-4 w-40">Classification</th>
                        <th className="px-6 py-4">Content & Instruction</th>
                        <th className="px-6 py-4 w-60">Sub-Parts / Options</th>
                        <th className="px-6 py-4 w-60">Answer Scheme</th>
                        <th className="px-4 py-4 text-center">Blooms</th>
                        <th className="px-4 py-4 text-center">Wgt</th>
                        <th className="px-4 py-4 text-center">Del</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                     {masterQuestions.map((q) => (
                        <tr key={q.id} className="hover:bg-blue-900/10 group transition-colors">
                           <td className="px-6 py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black ${q.type === 'THEORY' ? 'bg-indigo-500 text-white' : 'bg-blue-500 text-white'}`}>
                                 {q.type === 'THEORY' ? 'B' : 'A'}
                              </span>
                           </td>
                           <td className="px-4 py-4 text-center font-black text-slate-500">{q.originalIndex}</td>
                           <td className="px-6 py-4 space-y-1">
                              <input value={q.strand} onChange={e=>updateQuestion(q.id, 'strand', e.target.value.toUpperCase())} className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-[10px] font-black uppercase text-blue-400" placeholder="Strand..." />
                              <input value={q.indicator} onChange={e=>updateQuestion(q.id, 'indicator', e.target.value.toUpperCase())} className="w-full bg-transparent outline-none border-b border-transparent focus:border-blue-500 text-[9px] font-mono font-bold text-slate-500" placeholder="Indicator..." />
                           </td>
                           <td className="px-6 py-4 space-y-2">
                              <input value={q.instruction} onChange={e=>updateQuestion(q.id, 'instruction', e.target.value)} className="w-full bg-transparent outline-none italic text-[9px] text-slate-500" placeholder="Instruction..." />
                              <textarea value={q.questionText} onChange={e=>updateQuestion(q.id, 'questionText', e.target.value.toUpperCase())} className="w-full bg-transparent outline-none text-[11px] font-bold text-slate-200 resize-none no-scrollbar" rows={2} placeholder="Main question body..." />
                              <button className="text-[7px] font-black uppercase text-blue-500 hover:text-white flex items-center gap-1"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Attach Diagram</button>
                           </td>
                           <td className="px-6 py-4 space-y-2">
                              {q.type === 'OBJECTIVE' ? (
                                <div className="grid grid-cols-1 gap-1">
                                   {['A.', 'B.', 'C.', 'D.'].map(l => (
                                     <div key={l} className="text-[9px] font-bold text-slate-600 flex items-center gap-2">
                                       <span className="w-4">{l}</span>
                                       <input className="bg-transparent outline-none border-b border-slate-800 focus:border-blue-500 flex-1 text-slate-400" placeholder="Option text..." />
                                     </div>
                                   ))}
                                </div>
                              ) : (
                                <div className="space-y-2">
                                   {q.parts.map((p, pi) => (
                                      <div key={pi} className="flex gap-2 items-start">
                                         <span className="text-[8px] font-black text-indigo-400 w-6">{p.partLabel}</span>
                                         <input value={p.text} onChange={e=>{
                                            const nextParts = [...q.parts];
                                            nextParts[pi].text = e.target.value;
                                            updateQuestion(q.id, 'parts', nextParts);
                                         }} className="bg-transparent outline-none border-b border-slate-800 text-[10px] font-medium text-slate-300 flex-1" placeholder="Part text..." />
                                         <span className="text-[8px] font-black text-slate-600">{p.blooms.charAt(0)}</span>
                                      </div>
                                   ))}
                                </div>
                              )}
                           </td>
                           <td className="px-6 py-4">
                              <textarea value={q.answerScheme} onChange={e=>updateQuestion(q.id, 'answerScheme', e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-[10px] font-medium text-emerald-400 min-h-[60px]" placeholder="Answer Scheme..." />
                           </td>
                           <td className="px-4 py-4 text-center">
                              <select value={q.blooms} onChange={e=>updateQuestion(q.id, 'blooms', e.target.value)} className="bg-transparent outline-none text-[9px] font-black uppercase text-indigo-400">
                                 {BLOOMS.map(b => <option key={b} value={b} className="text-slate-900">{b.toUpperCase()}</option>)}
                              </select>
                           </td>
                           <td className="px-4 py-4 text-center font-mono font-black text-slate-400 text-sm">
                              <input type="number" value={q.weight} onChange={e=>updateQuestion(q.id, 'weight', parseInt(e.target.value)||0)} className="w-10 bg-transparent text-center outline-none" />
                           </td>
                           <td className="px-4 py-4 text-center">
                              <button onClick={()=>setMasterQuestions(prev=>prev.filter(x=>x.id!==q.id))} className="text-slate-700 hover:text-red-500 transition-colors">
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

            <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-inner">
               <div className="flex gap-8">
                  <span>Total Weight: {masterQuestions.reduce((a,b)=>a+b.weight, 0)} pts</span>
                  <span className="text-blue-400">OBJ: {masterQuestions.filter(q=>q.type==='OBJECTIVE').length}</span>
                  <span className="text-indigo-400">THY: {masterQuestions.filter(q=>q.type==='THEORY').length}</span>
               </div>
               <button className="bg-indigo-600/20 text-indigo-400 px-6 py-2 rounded-xl border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all">Compile 4-Pack Network Matrix</button>
            </div>
          </div>
        )}

        {activeTab === 'EMBOSS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-full overflow-hidden">
             {/* CONFIG PANEL */}
             <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-2xl flex flex-col space-y-6 overflow-y-auto custom-scrollbar">
                <div className="space-y-1">
                   <h3 className="text-lg font-black uppercase text-blue-400">Embossing Terminal</h3>
                   <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Live Identity Overlays</p>
                </div>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Institution Identity</label>
                      <input value={embossConfig.academyName} onChange={e=>setEmbossConfig({...embossConfig, academyName: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-xs font-black text-white outline-none focus:border-blue-500" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Postal Address Node</label>
                      <input value={embossConfig.academyAddress} onChange={e=>setEmbossConfig({...embossConfig, academyAddress: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-xs font-black text-white outline-none focus:border-blue-500" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-2">Global Access Point (Contact)</label>
                      <input value={embossConfig.academyContact} onChange={e=>setEmbossConfig({...embossConfig, academyContact: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-xs font-black text-white outline-none focus:border-blue-500" />
                   </div>
                   <button onClick={() => window.print()} className="w-full bg-white text-slate-950 py-5 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 tracking-[0.4em] mt-6">Dispatch to Printer</button>
                </div>
             </div>

             {/* PREVIEW PANEL */}
             <div className="lg:col-span-8 h-full overflow-y-auto custom-scrollbar bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 shadow-inner">
                {masterQuestions.length > 0 ? (
                   <div className="bg-white p-12 rounded-sm border-t-[15px] border-indigo-950 shadow-2xl text-slate-900 font-serif max-w-[210mm] mx-auto min-h-[297mm] flex flex-col scale-[0.9] origin-top">
                      <div className="border-b-4 border-slate-900 pb-6 mb-8 flex justify-between items-start">
                         <div className="space-y-2">
                            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">{embossConfig.academyName}</h1>
                            <p className="text-[12px] font-black text-blue-800 uppercase tracking-[0.4em]">{selectedMock} — {selectedSubject.toUpperCase()}</p>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{embossConfig.academyAddress} | {embossConfig.academyContact}</p>
                         </div>
                         <div className="bg-slate-900 text-white px-6 py-4 rounded-xl flex flex-col items-center justify-center min-w-[100px]">
                            <span className="text-[10px] font-black uppercase">PACK</span>
                            <span className="text-5xl font-black leading-none">A</span>
                         </div>
                      </div>
                      <div className="grid grid-cols-2 gap-10 mb-8 text-[12px] font-bold border-b-2 border-slate-200 pb-6">
                         <div className="space-y-2">
                            <div className="flex gap-3"><span>NAME:</span> <span className="border-b border-slate-900 flex-1 font-black uppercase">MASTER TEMPLATE</span></div>
                            <div className="flex gap-3"><span>INDEX:</span> <span className="border-b border-slate-900 flex-1 font-mono tracking-widest">--- SERIALIZED ---</span></div>
                         </div>
                      </div>
                      <div className="border-2 border-slate-900 p-4 rounded-xl mb-8 bg-slate-50">
                         <h5 className="text-[9px] font-black uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">GENERAL INSTRUCTIONS</h5>
                         <p className="text-[11px] italic leading-relaxed whitespace-pre-wrap">{embossConfig.generalRules}</p>
                      </div>
                      <div className="flex-1 space-y-8">
                         <div className="space-y-3">
                            <div className="bg-slate-900 text-white p-2 rounded-t-lg text-[10px] font-black uppercase tracking-[0.2em]">SECTION A: {embossConfig.sectionAInstructions}</div>
                            <div className="border-2 border-slate-900 p-6 min-h-[100px] flex flex-col gap-4">
                               {masterQuestions.filter(q=>q.type==='OBJECTIVE').slice(0, 3).map((q, i) => (
                                 <div key={i} className="text-xs space-y-1">
                                    <p className="font-bold">{i+1}. {q.questionText}</p>
                                    <p className="text-[10px] opacity-60 pl-4">A. option text... B. option text... C. option text... D. option text...</p>
                                 </div>
                               ))}
                               <p className="text-center italic opacity-30 text-[9px]">[ CONTINUED IN OFFICIAL PRINT SHARD ]</p>
                            </div>
                         </div>
                      </div>
                   </div>
                ) : (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center space-y-6 py-20">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      <p className="font-black uppercase text-sm tracking-[0.4em]">Initialize master bank for embossing preview</p>
                   </div>
                )}
             </div>
          </div>
        )}
        
        {activeTab !== 'INGEST' && activeTab !== 'EMBOSS' && (
          <div className="p-20 text-center opacity-20 uppercase font-black tracking-widest">{activeTab} MODULE ACTIVE</div>
        )}
      </div>
    </div>
  );
};

export default QuestionSerializationPortal;
