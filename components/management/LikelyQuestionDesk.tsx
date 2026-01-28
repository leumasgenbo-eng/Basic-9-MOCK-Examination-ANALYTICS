
import React, { useState, useEffect } from 'react';
import { StaffAssignment, MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';

interface LikelyQuestionDeskProps {
  activeFacilitator?: { name: string; subject: string } | null;
}

const LikelyQuestionDesk: React.FC<LikelyQuestionDeskProps> = ({ activeFacilitator }) => {
  const [questions, setQuestions] = useState<MasterQuestion[]>([]);
  const [formData, setFormData] = useState({
    type: 'OBJECTIVE' as 'OBJECTIVE' | 'THEORY',
    strand: '',
    subStrand: '',
    questionText: '',
    correctKey: 'A'
  });
  const [isSyncing, setIsSyncing] = useState(false);

  const subject = activeFacilitator?.subject || 'English Language';

  useEffect(() => {
    const fetchMySubmissions = async () => {
       const { data } = await supabase
         .from('uba_persistence')
         .select('payload')
         .eq('id', `likely_${subject.replace(/\s+/g, '')}_${activeFacilitator?.name.replace(/\s+/g, '')}`)
         .maybeSingle();
       if (data?.payload) setQuestions(data.payload);
    };
    fetchMySubmissions();
  }, [subject, activeFacilitator]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.questionText.trim()) return;

    const newQ: MasterQuestion = {
      id: `LQ-${Date.now()}`,
      ...formData,
      weight: 1,
      options: formData.type === 'OBJECTIVE' ? [
         { key: 'A', text: '' }, { key: 'B', text: '' }, { key: 'C', text: '' }, { key: 'D', text: '' }
      ] : undefined
    };

    const nextQs = [...questions, newQ];
    setIsSyncing(true);
    
    // Save to facilitator's personal likely bank
    await supabase.from('uba_persistence').upsert({
       id: `likely_${subject.replace(/\s+/g, '')}_${activeFacilitator?.name.replace(/\s+/g, '')}`,
       payload: nextQs,
       last_updated: new Date().toISOString()
    });

    // Also append to global master subject bank for HQ visibility
    const { data: currentMaster } = await supabase.from('uba_persistence').select('payload').eq('id', `master_bank_${subject.replace(/\s+/g, '')}`).maybeSingle();
    const updatedMaster = [...(currentMaster?.payload || []), newQ];
    await supabase.from('uba_persistence').upsert({
       id: `master_bank_${subject.replace(/\s+/g, '')}`,
       payload: updatedMaster,
       last_updated: new Date().toISOString()
    });

    setQuestions(nextQs);
    setFormData({ ...formData, questionText: '', strand: '', subStrand: '' });
    setIsSyncing(false);
    alert("Likely question mirrored to HQ Master Bank.");
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="bg-indigo-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative space-y-2">
           <h3 className="text-2xl font-black uppercase tracking-tight">Likely Question Desk</h3>
           <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-[0.4em]">Faculty Contribution Portal: {subject}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
         <form onSubmit={handleSubmit} className="lg:col-span-5 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl space-y-6">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b pb-4">Draft Submission</h4>
            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase">Type</label>
                  <select value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value as any})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10">
                     <option value="OBJECTIVE">OBJECTIVE</option>
                     <option value="THEORY">THEORY</option>
                  </select>
               </div>
               <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-500 uppercase">Correct Key</label>
                  <select value={formData.correctKey} onChange={e=>setFormData({...formData, correctKey: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-[10px] font-black outline-none focus:ring-4 focus:ring-indigo-500/10">
                     <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                  </select>
               </div>
            </div>
            <div className="space-y-4">
               <input type="text" placeholder="STRAND..." value={formData.strand} onChange={e=>setFormData({...formData, strand: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" />
               <input type="text" placeholder="SUB-STRAND..." value={formData.subStrand} onChange={e=>setFormData({...formData, subStrand: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-3 text-[10px] font-bold outline-none uppercase" />
               <textarea placeholder="QUESTION TEXT..." value={formData.questionText} onChange={e=>setFormData({...formData, questionText: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 min-h-[120px] uppercase" />
            </div>
            <button type="submit" disabled={isSyncing} className="w-full bg-indigo-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50">
               {isSyncing ? 'Syncing Shards...' : 'Mirror to HQ Bank'}
            </button>
         </form>

         <div className="lg:col-span-7 bg-slate-50 rounded-[2.5rem] border border-gray-100 shadow-inner flex flex-col h-full overflow-hidden">
            <div className="p-6 bg-white border-b border-gray-100 flex justify-between items-center">
               <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">My Sync History</h4>
               <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">{questions.length} Items</span>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[500px] no-scrollbar">
               {questions.map((q, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-2">
                     <div className="flex justify-between items-center">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">{q.strand} → {q.subStrand}</span>
                        <span className="text-[8px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded uppercase">{q.type}</span>
                     </div>
                     <p className="text-[11px] font-bold text-slate-700 uppercase leading-relaxed line-clamp-2">"{q.questionText}"</p>
                  </div>
               ))}
               {questions.length === 0 && (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                     <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                     <p className="font-black uppercase text-[10px] tracking-widest">No likely questions submitted for this cycle</p>
                  </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default LikelyQuestionDesk;
