
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
  const [bulkPupilPayment, setBulkPupilPayment] = useState({ paidBy: '', sentBy: '', amount: 0 });
  const [bulkStaffPayment, setBulkStaffPayment] = useState({ paidBy: '', sentBy: '', amount: 0 });

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

      const { error } = await supabase.from('uba_persistence').upsert({
        id: `forward_${settings.schoolNumber}`,
        payload: payload,
        last_updated: new Date().toISOString()
      });

      if (error) throw error;
      setForwardingData(payload);
      alert("HANDSHAKE SUCCESSFUL: Enrolment data and feedback forwarded to SuperAdmin Advertisement Board.");
    } catch (err: any) {
      alert(`Forwarding Failed: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const updatePupilPayment = (id: number, field: string, value: any) => {
    const next = { ...forwardingData?.pupilPayments } || {};
    if (!next[id]) next[id] = { paid: false, language: 'Asante Twi', particulars: { amount: 0, paidBy: '', sentBy: '', date: '', isBulk: false, isVerified: false } };
    
    if (field === 'paid') next[id].paid = value;
    else if (field === 'language') next[id].language = value;
    else next[id].particulars = { ...next[id].particulars, [field]: value };

    setForwardingData(prev => prev ? { ...prev, pupilPayments: next } : null);
  };

  const updateStaffPayment = (key: string, field: string, value: any) => {
    const next = { ...forwardingData?.facilitatorPayments } || {};
    if (!next[key]) next[key] = { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', date: '', isBulk: false, isVerified: false } };
    
    if (field === 'paid') next[key].paid = value;
    else next[key].particulars = { ...next[key].particulars, [field]: value };

    setForwardingData(prev => prev ? { ...prev, facilitatorPayments: next } : null);
  };

  const applyBulkPupil = () => {
    const next = { ...forwardingData?.pupilPayments } || {};
    students.forEach(s => {
      if (!next[s.id]) next[s.id] = { paid: true, language: 'Asante Twi', particulars: { amount: 0, paidBy: '', sentBy: '', date: '', isBulk: false, isVerified: false } };
      next[s.id].paid = true;
      next[s.id].particulars.paidBy = bulkPupilPayment.paidBy;
      next[s.id].particulars.sentBy = bulkPupilPayment.sentBy;
      next[s.id].particulars.amount = bulkPupilPayment.amount / students.length;
      next[s.id].particulars.isBulk = true;
    });
    setForwardingData(prev => prev ? { ...prev, pupilPayments: next } : null);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* Feedback Section */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="flex items-center gap-4 mb-6">
           <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
           </div>
           <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">HQ Feedback Channel</h3>
        </div>
        <textarea 
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Communicate directly with the SuperAdmin Advertisement Board..."
          className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-orange-500/10 min-h-[120px]"
        />
        <div className="mt-4 flex justify-end">
           <button onClick={handleForwardToHQ} disabled={isSyncing} className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
             {isSyncing ? 'Synchronizing...' : 'Forward to HQ Board'}
           </button>
        </div>
      </section>

      {/* Pupil Enrolment & Financials */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-900 px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
           <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Pupil Enrolment Ledger</h3>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Census Load: {students.length} Candidates</p>
           </div>
           <div className="flex items-center gap-3">
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase shadow-lg ${forwardingData?.approvalStatus === 'APPROVED' ? 'bg-emerald-500 text-white' : 'bg-yellow-500 text-white animate-pulse'}`}>
                Status: {forwardingData?.approvalStatus || 'PENDING'}
              </span>
           </div>
        </div>

        <div className="p-8 border-b border-gray-50 bg-gray-50/50">
           <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bulk Pupil Payment Verification</h4>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" placeholder="Paid By..." value={bulkPupilPayment.paidBy} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, paidBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
              <input type="text" placeholder="Sent By..." value={bulkPupilPayment.sentBy} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, sentBy: e.target.value})} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
              <input type="number" placeholder="Total GHS..." value={bulkPupilPayment.amount} onChange={e=>setBulkPupilPayment({...bulkPupilPayment, amount: Number(e.target.value)})} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold outline-none" />
              <button onClick={applyBulkPupil} className="bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase hover:bg-black transition-all">Apply to All</button>
           </div>
        </div>

        <div className="overflow-x-auto max-h-[400px] no-scrollbar">
           <table className="w-full text-left">
              <thead className="bg-slate-50 text-[8px] font-black text-gray-400 uppercase tracking-widest sticky top-0">
                 <tr>
                    <th className="px-8 py-4">Verif.</th>
                    <th className="px-4 py-4">Pupil</th>
                    <th className="px-4 py-4">Language</th>
                    <th className="px-4 py-4">Paid By</th>
                    <th className="px-4 py-4">Sent By</th>
                    <th className="px-4 py-4 text-right">Approval</th>
                 </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                 {students.map(s => {
                    const p = forwardingData?.pupilPayments[s.id] || { paid: false, language: 'Asante Twi', particulars: { amount: 0, paidBy: '', sentBy: '', date: '', isBulk: false, isVerified: false } };
                    return (
                       <tr key={s.id} className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-8 py-3">
                             <input type="checkbox" checked={p.paid} onChange={e=>updatePupilPayment(s.id, 'paid', e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          </td>
                          <td className="px-4 py-3"><span className="text-[10px] font-black uppercase text-slate-700">{s.name}</span></td>
                          <td className="px-4 py-3">
                             <select value={p.language} onChange={e=>updatePupilPayment(s.id, 'language', e.target.value)} className="bg-transparent text-[10px] font-bold outline-none border-b border-gray-100">
                                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                          </td>
                          <td className="px-4 py-3"><input type="text" value={p.particulars.paidBy} onChange={e=>updatePupilPayment(s.id, 'paidBy', e.target.value)} className="w-full bg-transparent text-[10px] font-bold border-b border-gray-100 outline-none" placeholder="Payer..." /></td>
                          <td className="px-4 py-3"><input type="text" value={p.particulars.sentBy} onChange={e=>updatePupilPayment(s.id, 'sentBy', e.target.value)} className="w-full bg-transparent text-[10px] font-bold border-b border-gray-100 outline-none" placeholder="Sender..." /></td>
                          <td className="px-4 py-3 text-right">
                             <span className={`text-[8px] font-black uppercase ${p.particulars.isVerified ? 'text-emerald-500' : 'text-gray-300'}`}>
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

      {/* Facilitator Financials */}
      <section className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden">
         <div className="bg-indigo-900 px-8 py-6">
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Facilitator Payroll Verification</h3>
         </div>
         <div className="p-8">
            <div className="grid grid-cols-1 gap-4">
               {/* Fix: Added explicit cast to StaffAssignment[] to facilitators mapping to resolve property access errors */}
               {(Object.values(facilitators) as StaffAssignment[]).map(f => {
                  const p = forwardingData?.facilitatorPayments[f.enrolledId] || { paid: false, particulars: { amount: 0, paidBy: '', sentBy: '', date: '', isBulk: false, isVerified: false } };
                  return (
                     <div key={f.enrolledId} className="flex flex-col md:flex-row items-center gap-6 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <div className="flex items-center gap-4 flex-1">
                           <input type="checkbox" checked={p.paid} onChange={e=>updateStaffPayment(f.enrolledId, 'paid', e.target.checked)} className="w-5 h-5 rounded text-indigo-600" />
                           <div className="space-y-1">
                              <p className="text-xs font-black uppercase text-slate-800">{f.name}</p>
                              <p className="text-[9px] font-bold text-indigo-600 uppercase tracking-widest">{f.role}</p>
                           </div>
                        </div>
                        <div className="flex gap-4">
                           <input type="text" value={p.particulars.paidBy} onChange={e=>updateStaffPayment(f.enrolledId, 'paidBy', e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none" placeholder="Paid By..." />
                           <input type="text" value={p.particulars.sentBy} onChange={e=>updateStaffPayment(f.enrolledId, 'sentBy', e.target.value)} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-[10px] font-bold outline-none" placeholder="Sent By..." />
                        </div>
                        <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full ${p.particulars.isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-200 text-gray-500'}`}>
                           {p.particulars.isVerified ? 'APPROVED' : 'AWAITING HQ'}
                        </span>
                     </div>
                  );
               })}
            </div>
         </div>
      </section>

      <div className="flex justify-center pt-10">
         <button onClick={handleForwardToHQ} disabled={isSyncing} className="bg-blue-900 text-white px-20 py-6 rounded-3xl font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95">
           Push Comprehensive Forwarding Data
         </button>
      </div>

    </div>
  );
};

export default EnrolmentForwardingPortal;
