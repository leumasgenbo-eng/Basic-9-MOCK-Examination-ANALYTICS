
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../supabaseClient';
import { ForwardingData } from '../../types';

const MarketingDeskView: React.FC = () => {
  const [submissions, setSubmissions] = useState<ForwardingData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<ForwardingData | null>(null);

  const fetchSubmissions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('uba_persistence')
      .select('id, payload, last_updated')
      .like('id', 'forward_%');
    
    if (data) {
      setSubmissions(data.map(d => ({ ...d.payload, lastSync: d.last_updated }) as ForwardingData));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const handleUpdateStatus = async (schoolId: string, status: 'APPROVED' | 'REJECTED') => {
    const sub = submissions.find(s => s.schoolId === schoolId);
    if (!sub) return;

    const nextSub = { ...sub, approvalStatus: status };
    
    // Also verify all items if approved
    if (status === 'APPROVED') {
       Object.keys(nextSub.pupilPayments).forEach(k => nextSub.pupilPayments[Number(k)].particulars.isVerified = true);
       Object.keys(nextSub.facilitatorPayments).forEach(k => nextSub.facilitatorPayments[k].particulars.isVerified = true);
    }

    const { error } = await supabase.from('uba_persistence').upsert({
      id: `forward_${schoolId}`,
      payload: nextSub,
      last_updated: new Date().toISOString()
    });

    if (!error) {
      setSubmissions(prev => prev.map(s => s.schoolId === schoolId ? nextSub : s));
      alert(`Institutional Request: ${status}`);
    }
  };

  const totals = useMemo(() => {
    let pupils = 0;
    submissions.forEach(s => pupils += Object.keys(s.pupilPayments).length);
    return { pupils, institutions: submissions.length };
  }, [submissions]);

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10">
      <div className="flex justify-between items-center mb-10">
        <div className="space-y-2">
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.6)]"></div>
             Network Marketing Desk
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Central Enrolment & Financial Control</p>
        </div>
        <div className="flex gap-6">
           <div className="text-center">
              <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Network Candidates</span>
              <span className="text-2xl font-black text-emerald-400 font-mono">{totals.pupils}</span>
           </div>
           <div className="text-center border-l border-slate-800 pl-6">
              <span className="text-[8px] font-black text-slate-600 uppercase block mb-1">Pending Syncs</span>
              <span className="text-2xl font-black text-yellow-400 font-mono">{submissions.filter(s=>s.approvalStatus==='PENDING').length}</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 flex-1">
         
         {/* Submissions List */}
         <div className="xl:col-span-1 space-y-6 overflow-y-auto max-h-[700px] pr-4 no-scrollbar">
            <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest px-4">Incoming Forwarding Stream</h3>
            {submissions.map(sub => (
               <button 
                 key={sub.schoolId} 
                 onClick={() => setSelectedSub(sub)}
                 className={`w-full text-left p-6 rounded-[2rem] border transition-all ${selectedSub?.schoolId === sub.schoolId ? 'bg-blue-600 border-blue-500 shadow-2xl' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
               >
                  <div className="flex justify-between items-start mb-4">
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{sub.schoolId}</span>
                     <span className={`text-[8px] font-black px-2 py-0.5 rounded ${sub.approvalStatus === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-white'}`}>{sub.approvalStatus}</span>
                  </div>
                  <h4 className="text-lg font-black text-white uppercase leading-none mb-2">{sub.schoolName}</h4>
                  <div className="flex gap-4">
                     <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div><span className="text-[9px] font-black text-white/40 uppercase">P: {Object.keys(sub.pupilPayments).length}</span></div>
                     <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full"></div><span className="text-[9px] font-black text-white/40 uppercase">F: {Object.keys(sub.facilitatorPayments).length}</span></div>
                  </div>
               </button>
            ))}
         </div>

         {/* Detailed Inspector View */}
         <div className="xl:col-span-2 space-y-8">
            {selectedSub ? (
               <div className="bg-slate-950 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl animate-in slide-in-from-right-4 duration-500">
                  <div className="flex justify-between items-start border-b border-slate-800 pb-8 mb-8">
                     <div className="space-y-1">
                        <h4 className="text-2xl font-black text-white uppercase">{selectedSub.schoolName} Appraisal</h4>
                        <p className="text-[10px] font-mono text-slate-500 uppercase">Handshake ID: {selectedSub.schoolId} • Last Sync: {new Date(selectedSub.submissionTimestamp).toLocaleString()}</p>
                     </div>
                     <div className="flex gap-3">
                        <button onClick={() => handleUpdateStatus(selectedSub.schoolId, 'APPROVED')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all">Verify & Approve</button>
                        <button onClick={() => handleUpdateStatus(selectedSub.schoolId, 'REJECTED')} className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase transition-all border border-red-500/20">Reject</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                     <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-3">Institutional Feedback</h5>
                        <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 italic text-slate-300 text-sm leading-relaxed">
                           "{selectedSub.feedback || "No communication message included."}"
                        </div>
                     </div>
                     <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Financial Summary</h5>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Total Paid (Pupils)</span>
                              {/* Fix: Added explicit cast to resolve 'paid' property access error on unknown type */}
                              <span className="text-xl font-black text-white font-mono">{(Object.values(selectedSub.pupilPayments) as any[]).filter(p=>p.paid).length}</span>
                           </div>
                           <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 text-center">
                              <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Total Paid (Facs)</span>
                              {/* Fix: Added explicit cast to resolve 'paid' property access error on unknown type */}
                              <span className="text-xl font-black text-white font-mono">{(Object.values(selectedSub.facilitatorPayments) as any[]).filter(p=>p.paid).length}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="mt-10 space-y-4">
                     <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2">Payment Particulars Breakdown</h5>
                     <div className="bg-slate-900 rounded-3xl overflow-hidden border border-slate-800">
                        <table className="w-full text-left">
                           <thead className="bg-slate-950 text-[7px] font-black text-slate-600 uppercase">
                              <tr>
                                 <th className="px-6 py-4">Role</th>
                                 <th className="px-6 py-4">Payer Particulars</th>
                                 <th className="px-6 py-4">Sender Particulars</th>
                                 <th className="px-6 py-4 text-right">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-950 text-[10px] font-bold text-slate-400">
                              {/* Fix: Added explicit cast to any[] to resolve 'particulars' property access errors */}
                              {(Object.values(selectedSub.pupilPayments) as any[]).slice(0, 5).map((p, i) => (
                                 <tr key={i}>
                                    <td className="px-6 py-3 uppercase">PUPIL</td>
                                    <td className="px-6 py-3 uppercase text-slate-200">{p.particulars.paidBy || '—'}</td>
                                    <td className="px-6 py-3 uppercase text-slate-200">{p.particulars.sentBy || '—'}</td>
                                    <td className="px-6 py-3 text-right"><span className="text-emerald-500">PAID</span></td>
                                 </tr>
                              ))}
                              <tr>
                                 <td colSpan={4} className="px-6 py-3 text-center text-[8px] text-slate-600 uppercase tracking-widest bg-slate-950/50">Showing initial sync load...</td>
                              </tr>
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-20 py-40 bg-slate-950 border border-slate-800 border-dashed rounded-[4rem]">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>
                  <p className="text-white font-black uppercase text-sm tracking-[0.5em]">Select an Institutional Forwarding Shard</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default MarketingDeskView;
