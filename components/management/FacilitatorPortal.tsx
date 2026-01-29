
import React, { useState } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ subjects, facilitators, setFacilitators, settings, isFacilitator, activeFacilitator }) => {
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'FACILITATOR' as StaffRole, subject: '' });
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    setIsEnrolling(true);

    try {
      const hubId = settings.schoolNumber;
      const enrolledId = `FAC-${Math.floor(100 + Math.random() * 899)}`;
      const targetEmail = newStaff.email.toLowerCase().trim();
      const targetName = newStaff.name.toUpperCase().trim();

      // DISPATCH Login Pack with standard trigger keys
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          data: { 
            role: 'facilitator', 
            hubId: hubId, 
            nodeId: enrolledId,
            full_name: targetName, 
            subject: newStaff.subject 
          },
          shouldCreateUser: true
        }
      });
      
      if (otpError) throw otpError;

      const staff: StaffAssignment = {
        name: targetName,
        email: targetEmail,
        role: newStaff.role,
        taughtSubject: newStaff.subject,
        enrolledId,
        invigilations: Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' })),
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      setFacilitators(prev => ({ ...prev, [enrolledId]: staff }));
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
      alert(`FACILITATOR ADDED: Identity mirrored via SQL Trigger. Verification PIN sent to ${targetEmail}.`);
    } catch (err: any) {
      alert("Faculty Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleForwardCredentials = async (email: string) => {
     if (!window.confirm(`FORWARD CREDENTIALS: Resend Login PIN to ${email}?`)) return;
     try {
       await supabase.auth.signInWithOtp({ email });
       alert("Handshake packet resent.");
     } catch (e) { alert("Dispatch failed."); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      <section className="bg-slate-950 text-white p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="relative space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Faculty Shard Ingestion</h2>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Registering authorized educators in global storage</p>
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none" placeholder="FULL LEGAL NAME..." required />
              <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none" placeholder="EMAIL ADDRESS..." required />
              <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                 <option value="" className="text-slate-900">SUBJECT SHARD...</option>
                 {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all">
                 {isEnrolling ? "MIRRORING..." : "Enroll Educator"}
              </button>
           </form>
         )}
      </section>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(facilitators || {}).map(([idKey, f]) => (
          <div key={idKey} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex justify-between items-center group">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-xl">{f.name.charAt(0)}</div>
                <div>
                   <h4 className="text-lg font-black text-slate-900 uppercase">{f.name}</h4>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{f.taughtSubject} — NODE ID: {f.enrolledId}</p>
                </div>
             </div>
             <button onClick={() => handleForwardCredentials(f.email)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all">Forward Credentials</button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FacilitatorPortal;
