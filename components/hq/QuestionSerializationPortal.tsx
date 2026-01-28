
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { 
  SchoolRegistryEntry, 
  MasterQuestion, 
  SerializedExam, 
  QuestionPack, 
  SerializationData 
} from '../../types';
import { SUBJECT_LIST } from '../../constants';

const QuestionSerializationPortal: React.FC<{ registry: SchoolRegistryEntry[] }> = ({ registry }) => {
  const [selectedSubject, setSelectedSubject] = useState(SUBJECT_LIST[0]);
  const [selectedMock, setSelectedMock] = useState('MOCK 1');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [activeTab, setActiveTab] = useState<'INGEST' | 'PACKS' | 'EMBOSS'>('INGEST');
  
  const [masterQuestions, setMasterQuestions] = useState<MasterQuestion[]>([]);
  const [pastedData, setPastedData] = useState('');
  const [serializedExam, setSerializedExam] = useState<SerializedExam | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [schoolSerialization, setSchoolSerialization] = useState<SerializationData | null>(null);

  // Sync with likely questions desk and existing packs
  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `master_bank_${selectedSubject.replace(/\s+/g, '')}`)
        .maybeSingle();
      if (data?.payload) setMasterQuestions(data.payload);
    };
    fetchExisting();
  }, [selectedSubject]);

  useEffect(() => {
    const fetchNodeSerials = async () => {
      if (!selectedSchoolId) return;
      const { data } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `serialization_${selectedSchoolId}_${selectedMock.replace(/\s+/g, '')}`)
        .maybeSingle();
      if (data?.payload) setSchoolSerialization(data.payload);
    };
    fetchNodeSerials();
  }, [selectedSchoolId, selectedMock]);

  const handleIngestPaste = () => {
    // Basic parser for "Question text [A] Option A [B] Option B..."
    const lines = pastedData.split('\n').filter(l => l.trim().length > 5);
    const newQs: MasterQuestion[] = lines.map((line, i) => ({
      id: `MQ-${Date.now()}-${i}`,
      type: line.includes('[A]') ? 'OBJECTIVE' : 'THEORY',
      strand: 'GENERAL',
      subStrand: 'MIXED',
      questionText: line.split('[A]')[0].trim(),
      correctKey: 'A',
      weight: 1,
      options: line.includes('[A]') ? [
        { key: 'A', text: 'Option A Placeholder' },
        { key: 'B', text: 'Option B Placeholder' },
        { key: 'C', text: 'Option C Placeholder' },
        { key: 'D', text: 'Option D Placeholder' }
      ] : undefined
    }));
    setMasterQuestions([...masterQuestions, ...newQs]);
    setPastedData('');
  };

  const generateVariants = async () => {
    setIsProcessing(true);
    
    const shuffle = <T,>(array: T[]): T[] => [...array].sort(() => Math.random() - 0.5);

    const createPack = (variant: 'A' | 'B' | 'C' | 'D'): QuestionPack => {
      const objs = masterQuestions.filter(q => q.type === 'OBJECTIVE');
      const theories = masterQuestions.filter(q => q.type === 'THEORY');
      return {
        variant,
        objectives: shuffle(objs),
        theory: shuffle(theories),
        schemeCode: `SC-${variant}-${Math.random().toString(36).substring(7).toUpperCase()}`
      };
    };

    const newExam: SerializedExam = {
      schoolId: selectedSchoolId,
      mockSeries: selectedMock,
      subject: selectedSubject,
      packs: {
        A: createPack('A'),
        B: createPack('B'),
        C: createPack('C'),
        D: createPack('D')
      },
      timestamp: new Date().toISOString()
    };

    const id = `serialized_exam_${selectedSchoolId}_${selectedMock.replace(/\s+/g, '')}_${selectedSubject.replace(/\s+/g, '')}`;
    await supabase.from('uba_persistence').upsert({ id, payload: newExam, last_updated: new Date().toISOString() });
    
    setSerializedExam(newExam);
    setIsProcessing(false);
    alert(`A/B/C/D PACKS GENERATED: Serialization engine complete for ${selectedSubject}.`);
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-8 font-sans">
      
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10 border-b border-slate-800 pb-8">
        <div className="space-y-1">
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-4 h-4 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-pulse"></div>
             Question Serialization & Embossing Hub
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Multi-Variant Scrambling Engine v4.0</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
            {SUBJECT_LIST.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
          <select value={selectedMock} onChange={e => setSelectedMock(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
            {Array.from({ length: 10 }, (_, i) => `MOCK ${i+1}`).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-[10px] font-black text-white outline-none">
            <option value="">SELECT HUB...</option>
            {registry.map(r => <option key={r.id} value={r.id}>{r.name} ({r.id})</option>)}
          </select>
        </div>
      </div>

      {/* Internal Navigation */}
      <div className="flex gap-2 mb-8 bg-slate-950 p-1 rounded-2xl border border-slate-800 w-fit">
        {(['INGEST', 'PACKS', 'EMBOSS'] as const).map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`px-8 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden min-h-[600px]">
        {activeTab === 'INGEST' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-full animate-in slide-in-from-left-4">
            <div className="space-y-6">
              <div className="bg-slate-950 border border-slate-800 p-8 rounded-[3rem] shadow-2xl space-y-4">
                 <h3 className="text-xs font-black uppercase text-indigo-400 tracking-widest">Question Ingestion Terminal</h3>
                 <textarea 
                    value={pastedData}
                    onChange={e => setPastedData(e.target.value)}
                    placeholder="Paste master questions here... Format: Question Text [A] Option A [B] Option B..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-[2rem] p-6 text-sm font-bold text-white outline-none focus:ring-8 focus:ring-indigo-500/10 min-h-[300px] shadow-inner"
                 />
                 <button onClick={handleIngestPaste} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.4em] shadow-xl transition-all">Ingest To Master Bank</button>
              </div>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-[3rem] shadow-2xl flex flex-col">
               <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest">Master Bank: {selectedSubject}</h3>
                  <span className="text-[10px] font-mono text-indigo-400">{masterQuestions.length} ITEMS</span>
               </div>
               <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                  {masterQuestions.map((q, i) => (
                    <div key={q.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-start group">
                       <div className="space-y-2">
                          <div className="flex gap-3">
                             <span className="text-[8px] font-black bg-indigo-900 px-2 py-0.5 rounded text-indigo-200">#{i+1}</span>
                             <span className="text-[8px] font-black text-slate-500 uppercase">{q.type}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-300 leading-relaxed uppercase">{q.questionText}</p>
                       </div>
                       <button onClick={() => setMasterQuestions(prev => prev.filter(item => item.id !== q.id))} className="text-red-500/30 hover:text-red-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                       </button>
                    </div>
                  ))}
               </div>
               <div className="p-6">
                  <button onClick={generateVariants} disabled={masterQuestions.length === 0 || !selectedSchoolId} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.5em] shadow-xl transition-all disabled:opacity-30">Lock & Scramble Matrix</button>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'PACKS' && serializedExam && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-full animate-in zoom-in-95 duration-500">
             {(['A', 'B', 'C', 'D'] as const).map(variant => (
               <div key={variant} className="bg-slate-950 border border-slate-800 rounded-[2.5rem] flex flex-col h-full shadow-2xl relative overflow-hidden">
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${variant === 'A' ? 'bg-blue-500' : variant === 'B' ? 'bg-indigo-500' : variant === 'C' ? 'bg-purple-500' : 'bg-slate-500'}`}></div>
                  <div className="p-6 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
                     <h4 className="text-2xl font-black text-white">PACK {variant}</h4>
                     <span className="text-[8px] font-mono text-slate-500">{serializedExam.packs[variant].schemeCode}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                     <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block">Scrambled Sequence</span>
                     {serializedExam.packs[variant].objectives.map((q, idx) => (
                        <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                           <p className="text-[9px] font-bold text-slate-400 uppercase line-clamp-2">{idx+1}. {q.questionText}</p>
                        </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'EMBOSS' && schoolSerialization && serializedExam && (
          <div className="bg-slate-950 border border-slate-800 rounded-[3rem] p-10 h-full overflow-y-auto no-scrollbar shadow-2xl animate-in slide-in-from-bottom-4">
             <h3 className="text-xl font-black uppercase text-white mb-8 flex items-center gap-4">
                Candidate Paper Embossing Preview
                <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-[9px] font-black">{schoolSerialization.pupils.length} NODES DISCOVERED</span>
             </h3>
             
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                {schoolSerialization.pupils.slice(0, 4).map((p, i) => (
                   <div key={i} className="bg-white p-10 rounded-sm border-t-[12px] border-indigo-900 shadow-2xl font-serif text-slate-900 scale-95 origin-top">
                      {/* EMBOSSED HEADER AREA */}
                      <div className="border-b-4 border-slate-900 pb-4 mb-6 flex justify-between items-start">
                         <div className="space-y-1">
                            <h4 className="text-2xl font-black uppercase tracking-tighter leading-none">{registry.find(r=>r.id===selectedSchoolId)?.name}</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest">OFFICIAL {selectedMock} EXAMINATION</p>
                         </div>
                         <div className="bg-slate-900 text-white p-4 rounded-lg flex flex-col items-center justify-center min-w-[80px]">
                            <span className="text-[10px] font-black uppercase">PACK</span>
                            <span className="text-4xl font-black leading-none">{p.serial}</span>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-8 mb-8 text-[11px] font-bold border-b-2 border-slate-200 pb-6">
                         <div className="space-y-1.5">
                            <div className="flex gap-2"><span>PUPIL NAME:</span> <span className="border-b border-slate-900 flex-1 font-black uppercase">{p.name}</span></div>
                            <div className="flex gap-2"><span>INDEX NO:</span> <span className="border-b border-slate-900 flex-1 font-mono">{p.id}</span></div>
                         </div>
                         <div className="space-y-1.5 text-right">
                            <div className="flex gap-2 justify-end"><span>SUBJECT:</span> <span className="font-black uppercase">{selectedSubject}</span></div>
                            <div className="flex gap-2 justify-end"><span>EMBOSS CODE:</span> <span className="font-mono text-indigo-700 bg-indigo-50 px-2">{p.questionCode}</span></div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h5 className="text-center font-black uppercase underline text-lg">SECTION A: OBJECTIVES (40 MARKS)</h5>
                         <p className="text-[10px] italic text-slate-500 text-center mb-8">Each question is followed by four options lettered A to D. Select the correct option for each question.</p>
                         
                         <div className="space-y-4">
                            {serializedExam.packs[p.serial].objectives.slice(0, 3).map((q, idx) => (
                               <div key={idx} className="space-y-2">
                                  <p className="text-sm font-bold uppercase">{idx+1}. {q.questionText}</p>
                                  <div className="grid grid-cols-2 gap-2 text-xs pl-4">
                                     <span>[A] Option A Placeholder</span>
                                     <span>[B] Option B Placeholder</span>
                                     <span>[C] Option C Placeholder</span>
                                     <span>[D] Option D Placeholder</span>
                                  </div>
                               </div>
                            ))}
                            <div className="pt-4 text-center opacity-40 font-black text-[9px] uppercase tracking-[2em]">END OF PREVIEW</div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>

             <div className="mt-12 flex justify-center sticky bottom-0">
                <button onClick={() => window.print()} className="bg-white text-slate-950 px-20 py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.5em] shadow-[0_20px_50px_rgba(255,255,255,0.2)] transition-all active:scale-95">Generate Embossed PDF Pack</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionSerializationPortal;
