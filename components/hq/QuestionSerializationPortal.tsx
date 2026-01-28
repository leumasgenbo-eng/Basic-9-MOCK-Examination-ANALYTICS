
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [activeTab, setActiveTab] = useState<'INGEST' | 'PACKS' | 'MATRIX' | 'EMBOSS'>('INGEST');
  
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [schoolSerialization, setSchoolSerialization] = useState<SerializationData | null>(null);
  const [serializedExam, setSerializedExam] = useState<SerializedExam | null>(null);
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
    const fetchNodeSerials = async () => {
      if (!selectedSchoolId) return;
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', `serialization_${selectedSchoolId}_${selectedMock.replace(/\s+/g, '')}`).maybeSingle();
      if (data?.payload) setSchoolSerialization(data.payload);
      else setSchoolSerialization(null);
    };
    fetchNodeSerials();
  }, [selectedSchoolId, selectedMock]);

  const handleAddRow = (type: 'OBJECTIVE' | 'THEORY') => {
    const newQ: MasterQuestion = {
      id: `MQ-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      originalIndex: masterQuestions.length + 1,
      type,
      strand: '',
      subStrand: '',
      indicator: '',
      questionText: '',
      correctKey: 'A',
      weight: type === 'OBJECTIVE' ? 1 : 10,
      blooms: 'Understanding',
      instruction: '',
      diagramUrl: '',
      parts: type === 'THEORY' ? [
        { partLabel: 'a.i', text: '', possibleAnswers: '', markingScheme: '', weight: 2, blooms: 'Knowledge' },
        { partLabel: 'b.ii', text: '', possibleAnswers: '', markingScheme: '', weight: 3, blooms: 'Understanding' },
        { partLabel: 'c.iii', text: '', possibleAnswers: '', markingScheme: '', weight: 5, blooms: 'Application' }
      ] : [],
      answerScheme: ''
    };
    setMasterQuestions([...masterQuestions, newQ]);
  };

  const handleUpdateRow = (id: string, field: keyof MasterQuestion, value: any) => {
    setMasterQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleUpdatePart = (qId: string, partIdx: number, field: keyof QuestionSubPart, value: any) => {
    setMasterQuestions(prev => prev.map(q => {
      if (q.id !== qId) return q;
      const nextParts = [...q.parts];
      nextParts[partIdx] = { ...nextParts[partIdx], [field]: value };
      return { ...q, parts: nextParts };
    }));
  };

  const handleFileUpload = (qId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => handleUpdateRow(qId, 'diagramUrl', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBank = async () => {
    setIsProcessing(true);
    await supabase.from('uba_persistence').upsert({ id: bankId, payload: masterQuestions, last_updated: new Date().toISOString() });
    setIsProcessing(false);
    alert("Subject Master Bank synchronized.");
  };

  const generateObjectiveSet = () => {
    const set: MasterQuestion[] = Array.from({ length: 40 }, (_, i) => ({
      id: `MQ-OBJ-${Date.now()}-${i}`,
      originalIndex: i + 1,
      type: 'OBJECTIVE',
      strand: 'ENGLISH',
      subStrand: 'GRAMMAR',
      indicator: `B9.1.1.1.${i+1}`,
      questionText: `Standard English Item #${i+1}`,
      correctKey: 'A',
      weight: 1,
      blooms: 'Knowledge',
      instruction: 'Choose the best option.',
      parts: [],
      answerScheme: 'Standard Option A'
    }));
    setMasterQuestions([...masterQuestions, ...set]);
  };

  const generateVariants = async () => {
    if (!selectedSchoolId) return alert("Select an institutional node.");
    setIsProcessing(true);
    
    const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

    const createPack = (variant: 'A' | 'B' | 'C' | 'D'): QuestionPack => {
      const objs = masterQuestions.filter(q => q.type === 'OBJECTIVE');
      const theories = masterQuestions.filter(q => q.type === 'THEORY');
      
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

    const newExam: SerializedExam = {
      schoolId: selectedSchoolId,
      mockSeries: selectedMock,
      subject: selectedSubject,
      packs: { A: createPack('A'), B: createPack('B'), C: createPack('C'), D: createPack('D') },
      timestamp: new Date().toISOString()
    };

    await supabase.from('uba_persistence').upsert({ 
      id: `serialized_exam_${selectedSchoolId}_${selectedMock.replace(/\s+/g, '')}_${selectedSubject.replace(/\s+/g, '')}`, 
      payload: newExam, 
      last_updated: new Date().toISOString() 
    });
    
    setSerializedExam(newExam);
    setIsProcessing(false);
    setActiveTab('PACKS');
  };

  const downloadMatrix = () => {
    if (!serializedExam) return;
    const variants: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
    let csv = `EXAM MATCHING MATRIX: ${selectedSubject} - ${selectedMock}\n`;
    csv += `PACK INDEX,PACK A (MASTER),PACK B,PACK C,PACK D,MASTER SCHEME\n`;
    
    for (let i = 1; i <= 40; i++) {
       const row = variants.map(v => {
         const entry = serializedExam.packs[v].matchingMatrix[`OBJ_${i}`];
         return entry ? `Q${entry.masterIdx}` : '-';
       });
       const master = serializedExam.packs['A'].matchingMatrix[`OBJ_${i}`];
       csv += `OBJ ${i},${row.join(',')},${master?.scheme || ''}\n`;
    }
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SCHEME_MATRIX_${selectedSubject.replace(/\s+/g, '_')}.csv`;
    link.click();
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
          <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
            <option value="">SELECT HUB NODE...</option>
            {registry.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
          </select>
        </div>
      </div>

      {/* Primary Tabs */}
      <div className="flex gap-2 mb-8 bg-slate-900/50 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['INGEST', 'PACKS', 'MATRIX', 'EMBOSS'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>
            {tab === 'INGEST' ? 'Hub Ingestion' : tab === 'PACKS' ? 'Variant Monitor' : tab === 'MATRIX' ? 'Answer Key' : 'Paper Embossing'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-[600px] flex flex-col">
        {activeTab === 'INGEST' && (
          <div className="flex flex-col gap-6 animate-in slide-in-from-left-4 h-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 shadow-xl space-y-4">
                  <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest px-2">Global Instructions Control</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <textarea value={generalRules} onChange={e=>setGeneralRules(e.target.value)} placeholder="General Exam Rules..." className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-[10px] font-bold text-white outline-none min-h-[80px]" />
                     <div className="space-y-2">
                        <input value={sectionInstructions.A} onChange={e=>setSectionInstructions({...sectionInstructions, A: e.target.value})} placeholder="Sec A Instruction..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none" />
                        <input value={sectionInstructions.B} onChange={e=>setSectionInstructions({...sectionInstructions, B: e.target.value})} placeholder="Sec B Instruction..." className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none" />
                     </div>
                  </div>
               </div>
               <div className="bg-slate-900 p-6 rounded-[2.5rem] border border-slate-800 flex flex-col justify-center gap-3">
                  <button onClick={generateObjectiveSet} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase shadow-lg">+ 40 Objectives</button>
                  <button onClick={() => handleAddRow('THEORY')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase shadow-lg">+ Theory Row</button>
                  <button onClick={handleSaveBank} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-black text-[9px] uppercase shadow-lg">Save Master Bank</button>
               </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl flex flex-col flex-1">
               <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                  <table className="w-full text-left border-collapse min-w-[1200px]">
                     <thead className="bg-slate-950 text-slate-500 uppercase text-[8px] font-black tracking-widest sticky top-0 z-20 border-b border-slate-800">
                        <tr>
                           <th className="px-6 py-5 text-center w-16">Sec</th>
                           <th className="px-4 py-5 w-16 text-center">Q#</th>
                           <th className="px-6 py-5 w-40">Classification</th>
                           <th className="px-6 py-5 w-48">Content & Instruction</th>
                           <th className="px-6 py-5 w-64">Sub-Parts / Options</th>
                           <th className="px-6 py-5 w-48">Answer Scheme</th>
                           <th className="px-4 py-5 text-center">Blooms</th>
                           <th className="px-4 py-5 text-center">Wgt</th>
                           <th className="px-4 py-5 text-center">Del</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-800/50">
                        {masterQuestions.map((q) => (
                          <tr key={q.id} className="hover:bg-blue-900/10 transition-colors group">
                             <td className="px-6 py-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-black ${q.type === 'OBJECTIVE' ? 'bg-blue-900 text-blue-200' : 'bg-indigo-900 text-indigo-200'}`}>{q.type === 'OBJECTIVE' ? 'A' : 'B'}</span>
                             </td>
                             <td className="px-4 py-4 text-center">
                                <span className="font-black text-xs text-slate-500">{q.originalIndex}</span>
                             </td>
                             <td className="px-6 py-4">
                                <div className="space-y-1">
                                   <input placeholder="Strand" value={q.strand} onChange={e=>handleUpdateRow(q.id, 'strand', e.target.value)} className="w-full bg-transparent text-[9px] text-slate-300 font-bold uppercase outline-none focus:text-blue-400" />
                                   <input placeholder="Indicator" value={q.indicator} onChange={e=>handleUpdateRow(q.id, 'indicator', e.target.value)} className="w-full bg-transparent text-[8px] text-slate-500 font-mono font-bold uppercase outline-none focus:text-blue-400" />
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                <div className="space-y-2">
                                   <input placeholder="Question instruction..." value={q.instruction} onChange={e=>handleUpdateRow(q.id, 'instruction', e.target.value)} className="w-full bg-slate-950/50 border border-slate-800 rounded px-2 py-1 text-[8px] italic text-slate-400 outline-none" />
                                   <textarea placeholder="Main question text..." value={q.questionText} onChange={e=>handleUpdateRow(q.id, 'questionText', e.target.value)} className="w-full bg-transparent text-[11px] text-white font-bold outline-none focus:text-blue-400 min-h-[60px] resize-none" />
                                   <div className="flex items-center gap-2">
                                      <input type="file" onChange={e=>handleFileUpload(q.id, e)} className="hidden" id={`file-${q.id}`} />
                                      <label htmlFor={`file-${q.id}`} className="text-[7px] font-black uppercase text-blue-500 cursor-pointer hover:underline">{q.diagramUrl ? 'Change Diagram' : 'Attach Diagram'}</label>
                                      {q.diagramUrl && <div className="w-6 h-6 rounded border border-slate-700 overflow-hidden"><img src={q.diagramUrl} className="w-full h-full object-cover" /></div>}
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4">
                                {q.type === 'OBJECTIVE' ? (
                                   <div className="grid grid-cols-1 gap-1">
                                      {['A','B','C','D'].map((key, i) => (
                                         <div key={key} className="flex gap-2 items-center">
                                            <span className="text-[9px] font-black text-blue-500">{key}.</span>
                                            <input 
                                              value={q.options?.[i]?.text || ''} 
                                              onChange={e => {
                                                 const nextOpts = [...(q.options || [{key:'A',text:''},{key:'B',text:''},{key:'C',text:''},{key:'D',text:''}])];
                                                 nextOpts[i] = { key: key as any, text: e.target.value };
                                                 handleUpdateRow(q.id, 'options', nextOpts);
                                              }}
                                              className="flex-1 bg-transparent text-[10px] text-slate-400 outline-none border-b border-transparent focus:border-slate-700" 
                                            />
                                         </div>
                                      ))}
                                   </div>
                                ) : (
                                   <div className="space-y-3">
                                      {q.parts.map((p, pi) => (
                                         <div key={pi} className="space-y-1 pl-2 border-l border-indigo-900/50">
                                            <div className="flex gap-2 items-center">
                                               <input value={p.partLabel} onChange={e=>handleUpdatePart(q.id, pi, 'partLabel', e.target.value)} className="w-8 bg-transparent text-[9px] font-black text-indigo-400 outline-none" />
                                               <input placeholder="Part text..." value={p.text} onChange={e=>handleUpdatePart(q.id, pi, 'text', e.target.value)} className="flex-1 bg-transparent text-[9px] text-white outline-none border-b border-slate-800" />
                                               <select value={p.blooms} onChange={e=>handleUpdatePart(q.id, pi, 'blooms', e.target.value)} className="bg-slate-950 text-[7px] text-slate-500 rounded p-0.5">{BLOOMS.map(b=><option key={b} value={b}>{b.charAt(0)}</option>)}</select>
                                            </div>
                                         </div>
                                      ))}
                                   </div>
                                )}
                             </td>
                             <td className="px-6 py-4">
                                <textarea 
                                  placeholder="Answer Scheme..." 
                                  value={q.answerScheme} 
                                  onChange={e=>handleUpdateRow(q.id, 'answerScheme', e.target.value)} 
                                  className="w-full bg-slate-950/30 border border-slate-800/50 rounded-lg p-2 text-[9px] font-medium text-emerald-400 outline-none min-h-[80px]"
                                />
                             </td>
                             <td className="px-4 py-4 text-center">
                                <select value={q.blooms} onChange={e=>handleUpdateRow(q.id, 'blooms', e.target.value)} className="bg-slate-900 text-white rounded px-2 py-1 text-[8px] font-black outline-none border border-slate-800">
                                   {BLOOMS.map(b => <option key={b} value={b}>{b.toUpperCase()}</option>)}
                                </select>
                             </td>
                             <td className="px-4 py-4 text-center">
                                <input type="number" value={q.weight} onChange={e=>handleUpdateRow(q.id, 'weight', parseInt(e.target.value)||0)} className="w-8 bg-transparent text-white font-black text-center outline-none border-b border-slate-800" />
                             </td>
                             <td className="px-4 py-4 text-center">
                                <button onClick={() => setMasterQuestions(prev => prev.filter(item => item.id !== q.id))} className="text-red-500/30 hover:text-red-500 transition-colors">
                                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                             </td>
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
               <div className="p-8 border-t border-slate-800 flex justify-between items-center bg-slate-950">
                  <div className="flex gap-8 text-[9px] font-black uppercase tracking-widest text-slate-600">
                     <span>Total Weight: {masterQuestions.reduce((a,b)=>a+b.weight, 0)} pts</span>
                     <span>OBJ: {masterQuestions.filter(q=>q.type==='OBJECTIVE').length}</span>
                     <span>THY: {masterQuestions.filter(q=>q.type==='THEORY').length}</span>
                  </div>
                  <button onClick={generateVariants} disabled={masterQuestions.length === 0 || !selectedSchoolId} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 disabled:opacity-30">Compile 4-Pack Network Matrix</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'PACKS' && serializedExam && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in zoom-in-95 h-full">
            {(['A', 'B', 'C', 'D'] as const).map(v => (
              <div key={v} className="bg-slate-900 border border-slate-800 rounded-[3rem] p-8 flex flex-col h-full shadow-2xl relative overflow-hidden group">
                 <div className={`absolute top-0 left-0 w-full h-1.5 ${v==='A'?'bg-blue-500':v==='B'?'bg-indigo-500':v==='C'?'bg-purple-500':'bg-slate-500'}`}></div>
                 <div className="flex justify-between items-center mb-8">
                    <h4 className="text-4xl font-black text-white">PACK {v}</h4>
                    <div className="text-right">
                       <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Variant ID</span>
                       <span className="text-[10px] font-mono text-blue-400 font-black">{serializedExam.packs[v].schemeCode.split('-').pop()}</span>
                    </div>
                 </div>
                 <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
                    <span className="text-[8px] font-black text-blue-300 uppercase tracking-widest block px-2">Objective Sequence</span>
                    {serializedExam.packs[v].objectives.map((q, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl flex justify-between items-center group">
                         <span className="text-[10px] font-black text-slate-400">{idx+1}.</span>
                         <div className="flex-1 px-4 truncate text-[10px] text-slate-200 font-bold uppercase">{q.questionText}</div>
                         <span className="text-[10px] font-black text-blue-500">{q.correctKey}</span>
                      </div>
                    ))}
                    <div className="h-px bg-slate-800 my-4"></div>
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block px-2">Theory Sequence</span>
                    {serializedExam.packs[v].theory.map((q, idx) => (
                      <div key={idx} className="p-3 bg-slate-950/50 border border-slate-800 rounded-2xl space-y-1">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400">Q{idx+1}</span>
                            <span className="text-[8px] font-mono text-slate-600 uppercase">Orig: {q.originalIndex}</span>
                         </div>
                         <div className="truncate text-[10px] text-slate-300 font-bold uppercase">{q.strand} / {q.indicator}</div>
                      </div>
                    ))}
                 </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'MATRIX' && serializedExam && (
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 h-full flex flex-col shadow-2xl animate-in fade-in">
             <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                   <h3 className="text-2xl font-black text-white uppercase tracking-tight">Examiner Marking Matrix</h3>
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cross-Variant Matching Keys for Unified Grading</p>
                </div>
                <button onClick={downloadMatrix} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Download Scheme Matrix</button>
             </div>
             <div className="flex-1 overflow-y-auto no-scrollbar border border-slate-800 rounded-3xl bg-slate-950">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-[8px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                      <tr>
                         <th className="px-8 py-5">Serial Index</th>
                         <th className="px-6 py-5">Pack A (Master)</th>
                         <th className="px-6 py-5">Pack B</th>
                         <th className="px-6 py-5">Pack C</th>
                         <th className="px-6 py-5">Pack D</th>
                         <th className="px-8 py-5">Matching Key/Scheme</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-900">
                      {Array.from({ length: 40 }).map((_, i) => (
                        <tr key={i} className="hover:bg-blue-900/10 transition-colors">
                           <td className="px-8 py-4 font-black text-slate-500 text-xs">OBJ {i+1}</td>
                           {(['A','B','C','D'] as const).map(v => {
                              const m = serializedExam.packs[v].matchingMatrix[`OBJ_${i+1}`];
                              return <td key={v} className="px-6 py-4 font-black text-white text-xs">Q{m?.masterIdx}</td>;
                           })}
                           <td className="px-8 py-4"><span className="text-emerald-400 font-mono text-[10px] font-black">{serializedExam.packs['A'].matchingMatrix[`OBJ_${i+1}`]?.key} — {serializedExam.packs['A'].matchingMatrix[`OBJ_${i+1}`]?.scheme.substring(0, 30)}...</span></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {activeTab === 'EMBOSS' && schoolSerialization && serializedExam && (
          <div className="bg-slate-900 border border-slate-800 rounded-[3rem] p-10 h-full overflow-y-auto no-scrollbar shadow-2xl animate-in slide-in-from-bottom-4">
             <div className="grid grid-cols-1 gap-20">
                {schoolSerialization.pupils.map((p, i) => (
                   <div key={i} className="bg-white p-12 rounded-sm border-t-[14px] border-indigo-950 shadow-2xl font-serif text-slate-900 scale-95 origin-top print:scale-100 print:shadow-none print:m-0 max-w-[210mm] mx-auto min-h-[297mm] flex flex-col">
                      {/* EMBOSSED HEADER AREA */}
                      <div className="border-b-4 border-slate-900 pb-6 mb-6 flex justify-between items-start">
                         <div className="space-y-2">
                            <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">{registry.find(r=>r.id===selectedSchoolId)?.name}</h4>
                            <p className="text-[12px] font-black uppercase tracking-[0.4em] text-indigo-700">OFFICIAL {selectedMock} - {selectedSubject}</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">School Hub Node: {selectedSchoolId}</p>
                         </div>
                         <div className="bg-slate-900 text-white px-6 py-4 rounded-xl flex flex-col items-center justify-center min-w-[100px] shadow-lg">
                            <span className="text-[11px] font-black uppercase">PACK</span>
                            <span className="text-5xl font-black leading-none">{p.serial}</span>
                         </div>
                      </div>

                      {/* CANDIDATE LEDGER */}
                      <div className="grid grid-cols-2 gap-10 mb-8 text-[12px] font-bold border-b-2 border-slate-200 pb-6">
                         <div className="space-y-2">
                            <div className="flex gap-3"><span>PUPIL:</span> <span className="border-b border-slate-900 flex-1 font-black uppercase">{p.name}</span></div>
                            <div className="flex gap-3"><span>INDEX:</span> <span className="border-b border-slate-900 flex-1 font-mono">{selectedSchoolId}/PUP-{p.id}</span></div>
                         </div>
                         <div className="space-y-2 text-right">
                            <div className="flex gap-3 justify-end"><span>EXAM DATE:</span> <span className="font-black uppercase">{schoolSerialization.startDate}</span></div>
                            <div className="flex gap-3 justify-end"><span>SERIAL CODE:</span> <span className="font-mono text-indigo-700 bg-indigo-50 px-2 font-black">{p.questionCode}</span></div>
                         </div>
                      </div>

                      {/* GENERAL RULES BOX */}
                      <div className="border-2 border-slate-900 p-4 rounded-xl mb-8 bg-slate-50">
                         <h5 className="text-[10px] font-black uppercase tracking-widest mb-1 border-b border-slate-300 pb-1">GENERAL EXAMINATION RULES</h5>
                         <p className="text-xs italic leading-relaxed">{serializedExam.packs[p.serial].generalRules}</p>
                      </div>

                      {/* SECTION A: OBJECTIVES */}
                      <div className="mb-10">
                         <div className="bg-slate-900 text-white p-3 rounded-t-xl flex justify-between items-center">
                            <h5 className="font-black uppercase text-sm tracking-widest">SECTION A: OBJECTIVES (40 MARKS)</h5>
                            <span className="text-[10px] font-bold uppercase opacity-50">VARIANT {p.serial}</span>
                         </div>
                         <div className="border-2 border-slate-900 p-4 rounded-b-xl space-y-8">
                            <p className="text-xs font-black uppercase tracking-tighter italic border-b border-slate-100 pb-2">{serializedExam.packs[p.serial].sectionInstructions.A}</p>
                            <div className="space-y-6">
                               {serializedExam.packs[p.serial].objectives.slice(0, 5).map((q, idx) => (
                                  <div key={idx} className="space-y-2">
                                     <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1">
                                           <p className="text-sm font-black uppercase leading-tight">{idx+1}. {q.questionText}</p>
                                           <div className="grid grid-cols-2 gap-x-10 gap-y-1 mt-3 pl-4">
                                              {q.options?.map(opt => <span key={opt.key} className="text-xs font-bold uppercase text-slate-600">[{opt.key}] {opt.text}</span>)}
                                           </div>
                                        </div>
                                        {q.diagramUrl && <div className="w-24 h-24 border border-slate-300 rounded-lg p-1 bg-white shadow-sm shrink-0"><img src={q.diagramUrl} className="w-full h-full object-contain" /></div>}
                                     </div>
                                  </div>
                               ))}
                               <div className="pt-4 text-center opacity-20 font-black text-[8px] uppercase tracking-[1.5em]">OBJECTIVE MATRIX CONTINUES...</div>
                            </div>
                         </div>
                      </div>

                      {/* SECTION B: THEORY */}
                      <div className="mb-10">
                         <div className="bg-indigo-900 text-white p-3 rounded-t-xl">
                            <h5 className="font-black uppercase text-sm tracking-widest">SECTION B: THEORY (60 MARKS)</h5>
                         </div>
                         <div className="border-2 border-slate-900 p-4 rounded-b-xl space-y-10">
                            <p className="text-xs font-black uppercase tracking-tighter italic border-b border-slate-100 pb-2">{serializedExam.packs[p.serial].sectionInstructions.B}</p>
                            <div className="space-y-12">
                               {serializedExam.packs[p.serial].theory.slice(0, 2).map((q, idx) => (
                                  <div key={idx} className="space-y-4">
                                     <div className="flex justify-between border-b-2 border-slate-900 pb-1 items-end">
                                        <span className="font-black text-lg">QUESTION {idx+1}</span>
                                        <div className="flex gap-4">
                                           <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 rounded">{q.strand}</span>
                                           <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest border border-indigo-100 px-2 rounded">BLOOMS: {q.blooms}</span>
                                        </div>
                                     </div>
                                     {q.instruction && <p className="text-[10px] font-black bg-indigo-50 border-l-4 border-indigo-500 px-3 py-1 italic uppercase">{q.instruction}</p>}
                                     <div className="flex justify-between gap-6">
                                        <div className="flex-1 space-y-4">
                                           <p className="text-sm font-black uppercase leading-snug">{q.questionText}</p>
                                           <div className="space-y-10 pl-6">
                                              {q.parts.map((part, pi) => (
                                                <div key={pi} className="space-y-3">
                                                   <div className="flex justify-between items-center text-[11px] font-bold">
                                                      <span>({part.partLabel}) {part.text || `Establish the core indicators for ${q.indicator}.`}</span>
                                                      <span className="text-slate-400">[{part.weight} mks]</span>
                                                   </div>
                                                   <div className="border-2 border-slate-300 h-32 rounded-xl w-full bg-slate-50/50 flex items-center justify-center italic text-[11px] text-slate-400 border-dashed">
                                                      CANDIDATE RESPONSE AREA - {part.partLabel.toUpperCase()}
                                                   </div>
                                                </div>
                                              ))}
                                           </div>
                                        </div>
                                        {q.diagramUrl && <div className="w-48 h-48 border-2 border-slate-900 rounded-xl p-2 bg-white shadow-xl shrink-0 flex items-center justify-center"><img src={q.diagramUrl} className="max-w-full max-h-full object-contain" /></div>}
                                     </div>
                                  </div>
                               ))}
                            </div>
                         </div>
                      </div>

                      {/* VALIDATION FOOTER */}
                      <div className="mt-auto pt-8 border-t-4 border-double border-slate-900 flex justify-between items-end">
                         <div className="text-center w-[30%]">
                            <div className="border-t border-slate-400 pt-1 font-black text-[8px] uppercase tracking-widest text-slate-400">Examiner Signature</div>
                            <p className="text-[10px] font-black uppercase mt-1">{schoolSerialization.chiefExaminerName}</p>
                         </div>
                         <p className="text-[10px] font-black uppercase tracking-[1em] opacity-40">UBA NETWORK HUB</p>
                         <div className="text-center w-[30%]">
                            <div className="border-t border-slate-400 pt-1 font-black text-[8px] uppercase tracking-widest text-slate-400">Candidate Signature</div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
             <div className="mt-12 flex justify-center sticky bottom-0 no-print">
                <button onClick={() => window.print()} className="bg-white text-slate-950 px-24 py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.5em] shadow-[0_30px_70px_rgba(255,255,255,0.15)] transition-all hover:scale-105 active:scale-95">Dispatch Multi-Variant Batch To Printer</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionSerializationPortal;
