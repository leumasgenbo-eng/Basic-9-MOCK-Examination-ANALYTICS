
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
    
    // Auto-verify all embedded items if bulk-approved
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
      alert(`Institutional Hub ${schoolId} Status Updated: ${status}`);
    }
  };

  const dashboardStats = useMemo(() => {
    let totalPupils = 0;
    let totalFacs = 0;
    let totalRevenue = 0;
    submissions.forEach(s => {
       const pupils = Object.values(s.pupilPayments) as any[];
       totalPupils += pupils.length;
       totalRevenue += pupils.reduce((sum, p) => sum + (p.particulars.amount || 0), 0);
       totalFacs += Object.keys(s.facilitatorPayments).length;
    });
    return { totalPupils, totalFacs, totalRevenue, schools: submissions.length };
  }, [submissions]);

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 font-sans">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-12">
        <div className="space-y-2">
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-5 h-5 bg-emerald-500 rounded-full shadow-[0_0_25px_rgba(16,185,129,0.8)] animate-pulse"></div>
             Network Marketing Control
          </h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Revenue & Feedback Acquisition Hub</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full xl:w-auto">
           {[
             { label: 'Verified Pupils', val: dashboardStats.totalPupils, color: 'text-blue-400' },
             { label: 'Active Faculty', val: dashboardStats.totalFacs, color: 'text-indigo-400' },
             { label: 'Est. Revenue', val: `GHS ${Math.round(dashboardStats.totalRevenue)}`, color: 'text-emerald-400' },
             { label: 'Pending Nodes', val: submissions.filter(s=>s.approvalStatus==='PENDING').length, color: 'text-amber-400' }
           ].map((s, i) => (
             <div key={i} className="bg-slate-900/50 border border-slate-800 px-6 py-4 rounded-3xl text-center space-y-1 shadow-xl">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest block">{s.label}</span>
                <span className={`text-xl font-black font-mono ${s.color}`}>{s.val}</span>
             </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 flex-1">
         
         {/* LEFT: Institutional Feed */}
         <div className="xl:col-span-4 space-y-6 overflow-y-auto max-h-[750px] pr-4 custom-scrollbar">
            <div className="flex justify-between items-center px-4 mb-2">
               <h3 className="text-xs font-black uppercase text-blue-500 tracking-widest">Incoming Data Shards</h3>
               <button onClick={fetchSubmissions} className="text-[9px] font-black text-slate-600 hover:text-white transition-colors uppercase">Refresh</button>
            </div>
            {submissions.sort((a,b) => b.submissionTimestamp.localeCompare(a.submissionTimestamp)).map(sub => (
               <button 
                 key={sub.schoolId} 
                 onClick={() => setSelectedSub(sub)}
                 className={`w-full text-left p-8 rounded-[2.5rem] border transition-all duration-500 relative overflow-hidden group ${selectedSub?.schoolId === sub.schoolId ? 'bg-blue-600 border-blue-400 shadow-2xl scale-[1.02]' : 'bg-slate-950 border-slate-800 hover:border-slate-600'}`}
               >
                  <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${sub.approvalStatus === 'APPROVED' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/50">{sub.schoolId}</span>
                     </div>
                     <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase ${sub.approvalStatus === 'APPROVED' ? 'bg-white/10 text-white' : 'bg-amber-500 text-white shadow-lg'}`}>{sub.approvalStatus}</span>
                  </div>
                  <h4 className="text-xl font-black text-white uppercase leading-none mb-4 truncate">{sub.schoolName}</h4>
                  
                  <div className="bg-black/20 rounded-2xl p-4 space-y-3">
                     <p className="text-[10px] text-white/40 italic line-clamp-1">"{sub.feedback || "No feedback attached..."}"</p>
                     <div className="flex justify-between items-center border-t border-white/5 pt-3">
                        <div className="flex gap-4">
                           <span className="text-[9px] font-black text-blue-300">PUPILS: {Object.keys(sub.pupilPayments).length}</span>
                           <span className="text-[9px] font-black text-indigo-300">STAFF: {Object.keys(sub.facilitatorPayments).length}</span>
                        </div>
                        <span className="text-[8px] font-mono text-white/30 uppercase">{new Date(sub.submissionTimestamp).toLocaleTimeString()}</span>
                     </div>
                  </div>
               </button>
            ))}
         </div>

         {/* RIGHT: Appraisal Inspection Terminal */}
         <div className="xl:col-span-8 space-y-8">
            {selectedSub ? (
               <div className="bg-slate-950 border border-slate-800 p-12 rounded-[4rem] shadow-2xl animate-in slide-in-from-right-8 duration-500 flex flex-col h-full">
                  
                  <div className="flex flex-col md:flex-row justify-between items-start gap-8 border-b border-slate-900 pb-10 mb-10">
                     <div className="space-y-2">
                        <h4 className="text-3xl font-black text-white uppercase tracking-tighter">{selectedSub.schoolName} Appraisal</h4>
                        <div className="flex flex-wrap gap-4 items-center text-[10px] font-mono text-slate-500 uppercase">
                           <span>SHARD_ID: {selectedSub.schoolId}</span>
                           <span className="w-1 h-1 bg-slate-800 rounded-full"></span>
                           <span>SYNCED: {new Date(selectedSub.submissionTimestamp).toLocaleString()}</span>
                        </div>
                     </div>
                     <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={() => handleUpdateStatus(selectedSub.schoolId, 'APPROVED')} className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase shadow-2xl transition-all active:scale-95 tracking-widest">Verify & Approve</button>
                        <button onClick={() => handleUpdateStatus(selectedSub.schoolId, 'REJECTED')} className="flex-1 md:flex-none bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-10 py-5 rounded-2xl font-black text-xs uppercase transition-all border border-red-500/20 tracking-widest">Reject Sync</button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
                     <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div> Institutional Feedback Message
                        </h5>
                        <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 italic text-slate-300 text-sm leading-relaxed shadow-inner">
                           "{selectedSub.feedback || "The institution provided no specific communication pack with this forwarding data shard."}"
                        </div>
                     </div>
                     <div className="space-y-6">
                        <h5 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] flex items-center gap-3">
                           <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Financial Data Snapshot
                        </h5>
                        <div className="grid grid-cols-2 gap-6">
                           <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 space-y-1">
                              <span className="text-[8px] font-black text-slate-600 uppercase block">Pupil Revenue</span>
                              <p className="text-2xl font-black text-white font-mono">
                                 GHS {(Object.values(selectedSub.pupilPayments) as any[]).reduce((sum, p) => sum + (p.particulars.amount || 0), 0).toFixed(2)}
                              </p>
                           </div>
                           <div className="bg-slate-900 p-6 rounded-[2rem] border border-slate-800 space-y-1">
                              <span className="text-[8px] font-black text-slate-600 uppercase block">Staff Payouts</span>
                              <p className="text-2xl font-black text-white font-mono">
                                 GHS {(Object.values(selectedSub.facilitatorPayments) as any[]).reduce((sum, p) => sum + (p.particulars.amount || 0), 0).toFixed(2)}
                              </p>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1 space-y-6 min-h-0">
                     <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] px-4">Detailed Transaction Ledger</h5>
                     <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-800 flex flex-col h-full max-h-[400px]">
                        <div className="overflow-y-auto custom-scrollbar">
                           <table className="w-full text-left border-collapse">
                              <thead className="bg-slate-950 text-[7px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800/50">
                                 <tr>
                                    <th className="px-8 py-5">Entity</th>
                                    <th className="px-6 py-5">Payer Details</th>
                                    <th className="px-6 py-5">Sender Identity</th>
                                    <th className="px-6 py-5">Transaction ID</th>
                                    <th className="px-6 py-5 text-right">State</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800 text-[10px] font-bold text-slate-400">
                                 {/* Pupil Ledger Slice */}
                                 {(Object.values(selectedSub.pupilPayments) as any[]).map((p, i) => (
                                    <tr key={`p-${i}`} className="hover:bg-white/5 transition-colors">
                                       <td className="px-8 py-4"><span className="text-blue-500 font-black">PUPIL</span></td>
                                       <td className="px-6 py-4 uppercase text-slate-200">{p.particulars.paidBy || '—'}</td>
                                       <td className="px-6 py-4 uppercase text-slate-200">{p.particulars.sentBy || '—'}</td>
                                       <td className="px-6 py-4 font-mono text-[9px] text-blue-400 tracking-tighter uppercase">{p.particulars.transactionId || 'NO_ID'}</td>
                                       <td className="px-6 py-4 text-right"><span className={p.paid ? "text-emerald-500" : "text-slate-700"}>{p.paid ? "PAID" : "UNSET"}</span></td>
                                    </tr>
                                 ))}
                                 {/* Facilitator Ledger Slice */}
                                 {(Object.values(selectedSub.facilitatorPayments) as any[]).map((p, i) => (
                                    <tr key={`f-${i}`} className="hover:bg-white/5 transition-colors">
                                       <td className="px-8 py-4"><span className="text-indigo-500 font-black">STAFF</span></td>
                                       <td className="px-6 py-4 uppercase text-slate-200">{p.particulars.paidBy || '—'}</td>
                                       <td className="px-6 py-4 uppercase text-slate-200">{p.particulars.sentBy || '—'}</td>
                                       <td className="px-6 py-4 font-mono text-[9px] text-indigo-400 tracking-tighter uppercase">{p.particulars.transactionId || 'NO_ID'}</td>
                                       <td className="px-6 py-4 text-right"><span className={p.paid ? "text-emerald-500" : "text-slate-700"}>{p.paid ? "PAID" : "UNSET"}</span></td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-center space-y-8 opacity-20 py-60 bg-slate-950 border border-slate-800 border-dashed rounded-[4rem]">
                  <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center border border-slate-800">
                     <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 2v20m10-10H2"/></svg>
                  </div>
                  <p className="text-white font-black uppercase text-sm tracking-[0.6em]">Awaiting Institutional Shard Selection</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export default MarketingDeskView;
