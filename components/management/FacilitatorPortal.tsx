import React, { useState } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings, InvigilationSlot } from '../../types';
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
  const [expandedStaff, setExpandedStaff] = useState<string | null>(null);

  const createEmptyRegister = (): InvigilationSlot[] => 
    Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));

  const handleAddStaff = async (e?: React.FormEvent, customStaff?: any) => {
    if (e) e.preventDefault();
    const staffData = customStaff || newStaff;
    if (!staffData.name || !staffData.email) return;
    setIsEnrolling(true);

    try {
      const hubId = settings.schoolNumber || "SSMAP-2025-01";
      const staffId = customStaff?.id || `FAC-${Math.floor(1000 + Math.random() * 9000)}`;
      const nodeId = staffId.includes('/') ? staffId : `${hubId}/${staffId}`;
      const targetEmail = staffData.email.toLowerCase().trim();
      const targetName = staffData.name.toUpperCase().trim();

      // 1. IDENTITY RECALL SYNC
      await supabase.from('uba_identities').upsert({
        email: targetEmail,
        full_name: targetName,
        node_id: nodeId, 
        hub_id: hubId,   
        role: 'facilitator'
      });

      // 2. AUTH HANDSHAKE
      await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          data: { 
            role: 'facilitator', hubId, nodeId, facilitatorId: nodeId, 
            email: targetEmail, full_name: targetName, subject: staffData.subject 
          },
          shouldCreateUser: true
        }
      });

      const staff: StaffAssignment = {
        name: targetName,
        email: targetEmail,
        role: staffData.role || 'FACILITATOR',
        taughtSubject: staffData.subject,
        enrolledId: nodeId, 
        invigilations: createEmptyRegister(),
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      setFacilitators(prev => {
        const next = { ...prev, [targetEmail]: staff };
        return next;
      });

      if (!customStaff) {
        setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
        alert(`FACULTY HANDSHAKE COMPLETE: ${targetName} enrolled with ID ${nodeId}`);
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsEnrolling(false);
      setTimeout(onSave, 100);
    }
  };

  const updateInvigilation = (email: string, index: number, field: keyof InvigilationSlot, value: string) => {
    setFacilitators(prev => {
      const staff = { ...prev[email] };
      const nextInv = [...staff.invigilations];
      nextInv[index] = { ...nextInv[index], [field]: value };
      return { ...prev, [email]: { ...staff, invigilations: nextInv } };
    });
  };

  const handleCopyCredentials = (f: StaffAssignment) => {
    const text = `${settings.schoolName} - FACULTY LOGIN PACK\n------------------------\nLegal Identity: ${f.name}\nEnrolled Institutional ID: ${f.enrolledId}\nHub Role: ${f.role}\nPortal: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    alert(`LOGIN PACK COPIED: Successfully captured credentials for ${f.name}.`);
  };

  const handleForwardCredentials = async (email: string) => {
     try {
       await supabase.auth.signInWithOtp({ email });
       alert("Verification PIN re-dispatched to facilitator email.");
     } catch (e) { alert("Dispatch failed."); }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      <section className="bg-slate-950 text-white p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-start gap-8">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter">{settings.schoolName} Faculty</h2>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Institutional Identity & Invigilation Matrix</p>
            </div>
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
              <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="LEGAL IDENTITY..." required />
              <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-2 focus:ring-blue-500/50" placeholder="FACULTY@EMAIL.COM" required />
              <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                 <option value="" className="text-slate-900">SUBJECT SPECIALIST...</option>
                 {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">
                 {isEnrolling ? "SYNCING..." : "Enroll Specialist"}
              </button>
           </form>
         )}
      </section>

      <div className="grid grid-cols-1 gap-8">
        {(Object.values(facilitators) as StaffAssignment[]).map((f, staffIdx) => {
          const isExpanded = expandedStaff === f.email;
          const dutyCount = f.invigilations.filter(d => d.dutyDate && d.subject).length;

          return (
            <div key={f.email} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group transition-all hover:shadow-2xl">
               <div className="p-8 flex flex-col lg:flex-row justify-between items-center gap-8">
                  <div className="flex items-center gap-6 flex-1">
                     <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex flex-col items-center justify-center font-black shadow-lg border-4 border-white relative">
                        <span className="text-[10px] opacity-40">#{staffIdx + 1}</span>
                        <span className="text-2xl">{f.name.charAt(0)}</span>
                     </div>
                     <div className="space-y-2">
                        <div className="flex items-center gap-3">
                           <h4 className="text-xl font-black text-slate-900 uppercase leading-none">{f.name}</h4>
                           <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{dutyCount}/9 DUTIES</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                           <span className="text-blue-600">{f.taughtSubject}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span>{f.role}</span>
                           <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                           <span className="font-mono text-[9px]">{f.enrolledId}</span>
                        </div>
                     </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                     <button onClick={() => setExpandedStaff(isExpanded ? null : f.email)} className={`px-6 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isExpanded ? 'bg-blue-900 text-white shadow-lg' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>
                        {isExpanded ? 'Close Register' : 'Invigilation Register'}
                     </button>
                     <button onClick={() => handleCopyCredentials(f)} className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        Copy Pack
                     </button>
                     <button onClick={() => handleForwardCredentials(f.email)} className="bg-gray-50 text-slate-600 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200 hover:bg-gray-100">Sync PIN</button>
                     <button onClick={() => {
                        if(window.confirm(`Revoke identity shard for ${f.name}?`)) {
                           setFacilitators(prev => {
                              const next = {...prev}; delete next[f.email]; return next;
                           });
                           setTimeout(onSave, 100);
                        }
                     }} className="bg-red-50 text-red-600 px-5 py-2.5 rounded-xl font-black text-[9px] uppercase hover:bg-red-600 hover:text-white transition-all">Revoke</button>
                  </div>
               </div>

               {isExpanded && (
                 <div className="bg-slate-50 p-10 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                    <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                       <div className="space-y-1">
                          <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Official Invigilation Register</h5>
                          <p className="text-lg font-black text-slate-900 uppercase">Manage Duty Slots for {f.name}</p>
                       </div>
                       <button onClick={onSave} className="bg-blue-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Commit Register Changes</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       {f.invigilations.map((slot, idx) => (
                         <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4 hover:border-blue-300 transition-colors">
                            <div className="flex justify-between items-center">
                               <span className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center font-black text-[10px] text-slate-400">{idx + 1}.</span>
                               <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Duty Slot</span>
                            </div>
                            <div className="space-y-3">
                               <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Duty Date</label>
                                  <input 
                                    type="date" 
                                    value={slot.dutyDate} 
                                    onChange={e => updateInvigilation(f.email, idx, 'dutyDate', e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20" 
                                  />
                               </div>
                               <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Session Time</label>
                                  <input 
                                    type="text" 
                                    placeholder="e.g. 09:00 AM"
                                    value={slot.timeSlot} 
                                    onChange={e => updateInvigilation(f.email, idx, 'timeSlot', e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 uppercase" 
                                  />
                               </div>
                               <div className="flex flex-col gap-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Assigned Discipline</label>
                                  <select 
                                    value={slot.subject} 
                                    onChange={e => updateInvigilation(f.email, idx, 'subject', e.target.value)}
                                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black outline-none focus:ring-2 focus:ring-blue-500/20 uppercase"
                                  >
                                     <option value="">SELECT SUBJECT...</option>
                                     {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          );
        })}
        {Object.keys(facilitators).length === 0 && (
           <div className="py-32 text-center opacity-20 bg-slate-50 rounded-[4rem] border-4 border-dashed border-gray-200">
              <div className="flex flex-col items-center gap-6">
                 <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                 <p className="text-sm font-black uppercase tracking-[0.5em]">Awaiting Academy Faculty Enrollment</p>
              </div>
           </div>
        )}
      </div>
    </div>
  );
};

export default FacilitatorPortal;