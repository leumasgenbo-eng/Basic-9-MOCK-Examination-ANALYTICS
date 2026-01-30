
import React, { useState } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  onSave: () => void;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ 
  subjects, 
  facilitators, 
  setFacilitators, 
  settings, 
  onSave,
  isFacilitator, 
  activeFacilitator 
}) => {
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'FACILITATOR' as StaffRole, subject: '' });
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    setIsEnrolling(true);

    try {
      const hubId = settings.schoolNumber;
      // THREE-WAY HANDSHAKE: Email, Node ID (Institution ID), Hub ID (Institution ID)
      // Facilitators use the school's unique ID as their authorized Node ID.
      const nodeId = hubId; 
      const targetEmail = newStaff.email.toLowerCase().trim();
      const targetName = newStaff.name.toUpperCase().trim();

      // 1. IDENTITY RECALL HUB SYNC: Direct Shard Ingestion into public.uba_identities
      // This ensures the identity is recallable even if Auth triggers have latency.
      const { error: idError } = await supabase.from('uba_identities').upsert({
        email: targetEmail,
        full_name: targetName,
        node_id: nodeId, 
        hub_id: hubId,   
        role: 'facilitator'
      });

      if (idError) throw new Error("Identity Shard Failure: " + idError.message);

      // 2. AUTH METADATA INJECTION: Ensure keys match SQL trigger expectations (nodeId, hubId, facilitatorId)
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          data: { 
            role: 'facilitator', 
            hubId: hubId, 
            nodeId: nodeId,          // Primary trigger key
            facilitatorId: nodeId,   // Secondary fallback key
            email: targetEmail,
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
        enrolledId: nodeId, 
        invigilations: Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' })),
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      // 3. INSTITUTIONAL PERSISTENCE: Update Local State and Trigger Global Submission
      setFacilitators(prev => {
        const next = { ...prev, [targetEmail]: staff };
        // Trigger institutional database submission for private persistence
        setTimeout(onSave, 100);
        return next;
      });

      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
      alert(`THREE-WAY HANDSHAKE COMPLETE:\n\nEducator: ${targetName}\nNode ID: ${nodeId}\nHub ID: ${hubId}\n\nIdentity shards successfully synchronized for Recall authentication.`);
    } catch (err: any) {
      alert("Faculty Shard Sync Fault: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleForwardCredentials = async (email: string) => {
     if (!window.confirm(`FORWARD HANDSHAKE: Resend Verification PIN to ${email}?`)) return;
     try {
       await supabase.auth.signInWithOtp({ email });
       alert("Handshake PIN dispatched.");
     } catch (e) { alert("Handshake dispatch failed."); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      <section className="bg-slate-950 text-white p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <div className="relative space-y-2">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Faculty Registry Desk</h2>
            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Authorized Multi-Tenant Handshake Protocol</p>
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
              <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="FULL LEGAL NAME..." required />
              <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="EMAIL ADDRESS..." required />
              <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                 <option value="" className="text-slate-900">SUBJECT SHARD...</option>
                 {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">
                 {isEnrolling ? "FORGING SHARDS..." : "Enroll Educator"}
              </button>
           </form>
         )}
      </section>

      <div className="grid grid-cols-1 gap-6">
        {Object.entries(facilitators || {}).map(([idKey, f]) => (
          <div key={idKey} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl flex justify-between items-center group">
             <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">{f.name.charAt(0)}</div>
                <div>
                   <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{f.name}</h4>
                   <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">{f.taughtSubject}</span>
                      <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Handshake Node: {f.enrolledId}</span>
                   </div>
                </div>
             </div>
             <button onClick={() => handleForwardCredentials(f.email)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-6 py-2 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm">Sync Keys</button>
          </div>
        ))}
        {Object.keys(facilitators || {}).length === 0 && (
           <div className="py-20 text-center opacity-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-gray-200">
              <p className="text-xs font-black uppercase tracking-[0.5em]">No Institutional Faculty Synchronized</p>
           </div>
        )}
      </div>
    </div>
  );
};

export default FacilitatorPortal;
