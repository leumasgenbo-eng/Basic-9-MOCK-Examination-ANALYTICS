
import React, { useState, useEffect } from 'react';
import { GlobalSettings, StudentData, StaffAssignment, ForwardingData, PaymentParticulars } from '../../types';
import { supabase } from '../../supabaseClient';

interface EnrolmentForwardingPortalProps {
  settings: GlobalSettings;
  students: StudentData[];
  facilitators: Record<string, StaffAssignment>;
}

const LANGUAGES = ['Asante Twi', 'Akuapem Twi', 'Fante', 'Ga', 'Ewe', 'Dangme', 'Nzema', 'Dagbani'];

const EnrolmentForwardingPortal: React.FC<EnrolmentForwardingPortalProps> = ({ settings, students, facilitators }) => {
  const [feedback, setFeedback] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [forwardingData, setForwardingData] = useState<ForwardingData | null>(null);
  
  // Bulk States
  const [bulkPupilPayment, setBulkPupilPayment] = useState({ paidBy: '', sentBy: '', transactionId: '', amount: 0 });
  const [bulkStaffPayment, setBulkStaffPayment] = useState({ paidBy: '', sentBy: '', transactionId: '', amount: 0 });

  useEffect(() => {
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `forward_${settings.schoolNumber}`)
        .maybeSingle();
      if (data && data.payload) {
        setForwardingData(data.payload as ForwardingData);
        setFeedback(data.payload.feedback || '');
      }
    };
    fetchExisting();
  }, [settings.schoolNumber]);

  const handleForwardToHQ = async () => {
    setIsSyncing(true);
    try {
      const payload: ForwardingData = forwardingData || {
        schoolId: settings.schoolNumber,
        schoolName: settings.schoolName,
        feedback: feedback,
        pupilPayments: {},
        facilitatorPayments: {},
        submissionTimestamp: new Date().toISOString(),
        approvalStatus: 'PENDING'
      };

      payload.feedback = feedback;
      payload.submissionTimestamp = new Date().toISOString();
      payload.schoolName = settings.schoolName; // Ensure name is current

      const { error } = await supabase.from('uba_persistence').upsert({
        id: `forward_${settings.schoolNumber}`,
        payload: payload,
        last_updated: new Date().toISOString()
      });

      if (error) throw error;
      setForwardingData(payload);
      alert("HQ HANDSHAKE SUCCESSFUL: Financial particulars and feedback are now live on the SuperAdmin Advertisement Board.");
    } catch (err: any) {
      alert(`Forwarding Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const updatePupilPayment = (id: number, field: string, value: any) => {
    const next = { ...forwardingData?.pupilPayments } || {};
    if (!next[id]) next[id] = { paid: false, language: 'Asante Twi', particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
    
    if (field === 'paid') next[id].paid = value;
    else if (field === 'language') next[id].language = value;
    else next[id].particulars = { ...next[id].particulars, [field]: value };

    setForwardingData(prev => prev ? { ...prev, pupilPayments: next } : null);
  };

  const updateStaffPayment = (key: string, field: string, value: any) => {
    const next = { ...forwardingData?.facilitatorPayments } || {};
    if (!next[key]) next[key] = { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
    
    if (field === 'paid') next[key].paid = value;
    else next[key].particulars = { ...next[key].particulars, [field]: value };

    setForwardingData(prev => prev ? { ...prev, facilitatorPayments: next } : null);
  };

  const applyBulkPupil = () => {
    const next = { ...forwardingData?.pupilPayments } || {};
    students.forEach(s => {
      if (!next[s.id]) next[s.id] = { paid: true, language: 'Asante Twi', particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
      next[s.id].paid = true;
      next[s.id].particulars.paidBy = bulkPupilPayment.paidBy.toUpperCase();
      next[s.id].particulars.sentBy = bulkPupilPayment.sentBy.toUpperCase();
      next[s.id].particulars.transactionId = bulkPupilPayment.transactionId.toUpperCase();
      next[s.id].particulars.amount = bulkPupilPayment.amount / (students.length || 1);
      next[s.id].particulars.isBulk = true;
      next[s.id].particulars.date = new Date().toLocaleDateString();
    });
    setForwardingData(prev => prev ? { ...prev, pupilPayments: next } : null);
  };

  const applyBulkStaff = () => {
    const next = { ...forwardingData?.facilitatorPayments } || {};
    const facKeys = Object.keys(facilitators);
    facKeys.forEach(k => {
      if (!next[k]) next[k] = { paid: true, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
      next[k].paid = true;
      next[k].particulars.paidBy = bulkStaffPayment.paidBy.toUpperCase();
      next[k].particulars.sentBy = bulkStaffPayment.sentBy.toUpperCase();
      next[k].particulars.transactionId = bulkStaffPayment.transactionId.toUpperCase();
      next[k].particulars.amount = bulkStaffPayment.amount / (facKeys.length || 1);
      next[k].particulars.isBulk = true;
      next[k].particulars.date = new Date().toLocaleDateString();
    });
    setForwardingData(prev => prev ? { ...prev, facilitatorPayments: next } : null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-6xl mx-auto pb-20">
      
      {/* 1. Feedback Channel to SuperAdmin */}
      <section className="bg-white p-8 rounded-[3rem] shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative space-y-6">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                 <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Institutional Feedback Hub</h3>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Direct stream to SuperAdmin Marketing Desk</p>
              </div>
           </div>
           <textarea 
             value={feedback}
             onChange={(e) => setFeedback(e.target.value)}
             placeholder="Communicate service feedback, technical issues, or exam schedules to the SuperAdmin..."
             className="w-full bg-slate-50 border border-slate-200 rounded-[2rem] p-8 text-sm font-bold text-slate-700 outline-none focus:ring-8 focus:ring-orange-500/5 min-h-[160px] shadow-inner"
           />
           <div className="flex justify-between items-center px-4">
              <span className="text-[9px] font-black text-slate-400 uppercase italic">Verification will be mirrored in SuperAdmin terminal</span>
              <button onClick={handleForwardToHQ} disabled={isSyncing} className="bg-orange-600 hover:bg-orange-700 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl transition-all active:scale-95 disabled:opacity-50 tracking-widest">
                {isSyncing ? 'Synchronizing Shards...' : 'Broadcast Feedback'}
              </button>
           </div>
        </div>
      </section>

      {/* 2. Pupil Enrolment & Financial Checklist */}
      <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-900 px-10 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
           <div className="space-y-1">
              <h3 className="text-2xl font-black text-white uppercase tracking-tight">Pupil Enrolment Ledger</h3>
              <div className="flex items-center gap-3">
                 <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest bg-blue-800 px-3 py-1 rounded-full">Census Load: {students.length} Candidates</span>
                 <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg border ${forwardingData?.approvalStatus === 'APPROVED' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-amber-500 border-amber-400 text-white animate-pulse'}`}>
                   HQ Status: {forwardingData?.approvalStatus || 'PENDING'}
                 </span>
              </div>
           </div>
        </div>

        {/* Bulk Payment Verification */}
        <div className="p-10 border-b border-gray-100 bg-slate-50/50">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bulk Payment Verification Controller</h4>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <input type="text" placeholder="Paid By..." value={bulkPupilPayment.paidBy} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, paidBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
              <input type="text" placeholder="Sent By..." value={bulkPupilPayment.sentBy} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, sentBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
              <input type="text" placeholder="Trans ID..." value={bulkPupilPayment.transactionId} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, transactionId: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
              <input type="number" placeholder="Amount GHS..." value={bulkPupilPayment.amount} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, amount: Number(e.target.value)})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/10" />
              <button onClick={applyBulkPupil} className="bg-blue-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all shadow-lg">Apply to Cohort</button>
           </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] custom-scrollbar">
           <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[8px] font-black text-gray-400 uppercase tracking-widest sticky top-0 z-20 border-b border-gray-100">
                 <tr>
                    <th className="px-10 py-5 w-20">Verif.</th>
                    <th className="px-6 py-5">Candidate Name</th>
                    <th className="px-6 py-5">Lang. Option</th>
                    <th className="px-6 py-5">Paid By</th>
                    <th className="px-6 py-5">Sent By</th>
                    <th className="px-6 py-5">Transaction ID</th>
                    <th className="px-6 py-5 text-right">Approval</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {students.map(s => {
                    const p = forwardingData?.pupilPayments[s.id] || { paid: false, language: 'Asante Twi', particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
                    return (
                       <tr key={s.id} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="px-10 py-4">
                             <input type="checkbox" checked={p.paid} onChange={e=>updatePupilPayment(s.id, 'paid', e.target.checked)} className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 transition-transform group-hover:scale-110" />
                          </td>
                          <td className="px-6 py-4"><span className="text-xs font-black uppercase text-slate-700">{s.name}</span></td>
                          <td className="px-6 py-4">
                             <select value={p.language} onChange={e=>updatePupilPayment(s.id, 'language', e.target.value)} className="bg-transparent text-[10px] font-bold outline-none border-b border-gray-100 hover:border-blue-400">
                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                          </td>
                          <td className="px-6 py-4"><input type="text" value={p.particulars.paidBy} onChange={e=>updatePupilPayment(s.id, 'paidBy', e.target.value)} className="w-full bg-transparent text-[10px] font-bold border-b border-gray-100 outline-none focus:border-blue-500 uppercase" placeholder="Payer..." /></td>
                          <td className="px-6 py-4"><input type="text" value={p.particulars.sentBy} onChange={e=>updatePupilPayment(s.id, 'sentBy', e.target.value)} className="w-full bg-transparent text-[10px] font-bold border-b border-gray-100 outline-none focus:border-blue-500 uppercase" placeholder="Sender..." /></td>
                          <td className="px-6 py-4"><input type="text" value={p.particulars.transactionId} onChange={e=>updatePupilPayment(s.id, 'transactionId', e.target.value)} className="w-full bg-transparent font-mono text-[9px] font-black border-b border-gray-100 outline-none focus:border-blue-500 uppercase text-blue-600" placeholder="TX-ID..." /></td>
                          <td className="px-6 py-4 text-right">
                             <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${p.particulars.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-gray-400'}`}>
                               {p.particulars.isVerified ? 'Verified' : 'Pending'}
                             </span>
                          </td>
                       </tr>
                    );
                 })}
              </tbody>
           </table>
        </div>
      </section>

      {/* 3. Facilitator Payroll Verification */}
      <section className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
         <div className="bg-slate-900 px-10 py-8">
            <div className="space-y-1">
               <h3 className="text-2xl font-black text-white uppercase tracking-tight">Facilitator Payroll Verification</h3>
               <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Enrolment revenue disbursement confirmation</p>
            </div>
         </div>
         
         <div className="p-10 bg-slate-50/50 border-b border-gray-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bulk Facilitator Payment Data</h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
               <input type="text" placeholder="Paid By..." value={bulkStaffPayment.paidBy} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, paidBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
               <input type="text" placeholder="Sent By..." value={bulkStaffPayment.sentBy} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, sentBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
               <input type="text" placeholder="Trans ID..." value={bulkStaffPayment.transactionId} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, transactionId: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-mono font-bold outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" />
               <input type="number" placeholder="Total GHS..." value={bulkStaffPayment.amount} onChange={e=>setBulkStaffPayment({...bulkStaffPayment, amount: Number(e.target.value)})} className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/10" />
               <button onClick={applyBulkStaff} className="bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all shadow-lg">Apply to Staff</button>
            </div>
         </div>

         <div className="p-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {(Object.values(facilitators) as StaffAssignment[]).map(f => {
                  const p = forwardingData?.facilitatorPayments[f.enrolledId] || { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', transactionId: '', date: '', isBulk: false, isVerified: false } };
                  return (
                     <div key={f.enrolledId} className="flex items-center gap-6 p-6 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-lg transition-all group">
                        <input type="checkbox" checked={p.paid} onChange={e=>updateStaffPayment(f.enrolledId, 'paid', e.target.checked)} className="w-6 h-6 rounded-lg text-slate-900 focus:ring-slate-500" />
                        <div className="flex-1 space-y-1">
                           <p className="text-xs font-black uppercase text-slate-800">{f.name}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{f.taughtSubject || f.role}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${p.particulars.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {p.particulars.isVerified ? 'APPROVED' : 'PENDING'}
                           </span>
                           <span className="text-[8px] font-mono text-slate-400">{p.particulars.transactionId || 'NO_TX_ID'}</span>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      </section>

      {/* Global Sync Controller */}
      <div className="flex justify-center pt-10 sticky bottom-4 z-40">
         <button onClick={handleForwardToHQ} disabled={isSyncing} className="group relative bg-blue-900 hover:bg-black text-white px-24 py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-[0_20px_50px_rgba(30,58,138,0.4)] transition-all active:scale-95 disabled:opacity-50">
           <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem]"></div>
           {isSyncing ? 'Encrypting Matrix...' : 'PUSH COMPREHENSIVE FORWARDING DATA'}
         </button>
      </div>

    </div>
  );
};

export default EnrolmentForwardingPortal;
