
import React, { useState } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings, InvigilationSlot } from '../../types';
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
      const enrolledId = `${hubId}/FAC-${Math.floor(100 + Math.random() * 899)}`;
      
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: newStaff.email.toLowerCase().trim(),
        options: {
          data: { 
            role: 'facilitator', 
            hubId: hubId, 
            name: newStaff.name.toUpperCase(),
            subject: newStaff.subject,
            enrolledId: enrolledId
          },
          shouldCreateUser: true
        }
      });

      if (otpError) throw otpError;

      const emptyInvigilations: InvigilationSlot[] = Array.from({ length: 9 }, () => ({
        dutyDate: '',
        timeSlot: '',
        subject: ''
      }));

      const staff: StaffAssignment = {
        name: newStaff.name.toUpperCase(),
        email: newStaff.email.toLowerCase(),
        role: newStaff.role,
        taughtSubject: newStaff.subject,
        enrolledId,
        invigilations: emptyInvigilations,
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      const key = newStaff.subject || `FLOAT_${Date.now()}`;
      setFacilitators(prev => ({ ...prev, [key]: staff }));
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
      alert(`FACULTY NODE ACTIVATED: Legal identity verified and OTP PIN sent to ${newStaff.email}`);
    } catch (err: any) {
      alert("HR Enrolment Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const updateDuty = (staffKey: string, slotIndex: number, field: keyof InvigilationSlot, value: string) => {
    setFacilitators(prev => {
      const next = { ...prev };
      const staff = next[staffKey];
      if (staff) {
        const nextSlots = [...staff.invigilations];
        nextSlots[slotIndex] = { ...nextSlots[slotIndex], [field]: value };
        next[staffKey] = { ...staff, invigilations: nextSlots };
      }
      return next;
    });
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      
      {/* Academy HR Command Header */}
      <section className="bg-slate-950 text-white p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter leading-none flex items-center gap-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3L17 12"/></svg>
                  Staff Deployment Hub
               </h2>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Academy HR Command & Specialist Cadre Management</p>
            </div>
            {!isFacilitator && (
               <button onClick={() => alert("Generating Master HR Roster PDF...")} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-50 transition-all">Generate Master Roster</button>
            )}
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/20" placeholder="LEGAL IDENTITY..." required />
              <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/20" placeholder="STAFF EMAIL..." required />
              <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                 <option value="" className="text-slate-900">SELECT SUBJECT...</option>
                 {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
                 {isEnrolling ? "AUTHORIZING..." : "Add New Staff Node"}
              </button>
           </form>
         )}
      </section>

      <div className="space-y-6">
         <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] px-4">Specialist Facilitator Cadre</h3>
         <div className="grid grid-cols-1 gap-12">
            {(Object.entries(facilitators) as [string, StaffAssignment][]).map(([key, f], i) => (
              <div key={key} className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl">#{i+1}</div>
                      <div className="space-y-1">
                         <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{f.taughtSubject || "General"} Specialist</span>
                         <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{f.name}</h4>
                         <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-tighter">Enrolled Institutional ID: {f.enrolledId}</p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                      <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-emerald-100 shadow-sm">Legal Identity Verified</div>
                      <div className="text-right">
                         <span className="text-[8px] font-black text-slate-400 uppercase block">Hub Role</span>
                         <span className="text-sm font-black text-blue-900 uppercase">{f.role}</span>
                      </div>
                   </div>
                </div>

                <div className="p-10 bg-white">
                   <div className="flex items-center justify-between mb-8">
                      <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                         <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                         Invigilation Register (1-9)
                      </h5>
                      <div className="text-[9px] font-bold text-slate-400 uppercase">{f.invigilations.filter(d=>d.dutyDate).length}/9 Duties Scheduled</div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
                      {f.invigilations.map((slot, si) => (
                        <div key={si} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-blue-50/20 transition-colors">
                           <span className="text-[10px] font-black text-slate-300 block border-b border-slate-200 pb-1">{si + 1}.</span>
                           <input 
                             type="date" 
                             value={slot.dutyDate} 
                             onChange={e=>updateDuty(key, si, 'dutyDate', e.target.value)}
                             className="w-full bg-transparent text-[8px] font-bold outline-none uppercase text-blue-900" 
                           />
                           <input 
                             type="text" 
                             placeholder="TIME" 
                             value={slot.timeSlot} 
                             onChange={e=>updateDuty(key, si, 'timeSlot', e.target.value.toUpperCase())}
                             className="w-full bg-transparent text-[8px] font-black border-b border-slate-200 outline-none uppercase placeholder:text-slate-300" 
                           />
                           <select 
                             value={slot.subject} 
                             onChange={e=>updateDuty(key, si, 'subject', e.target.value)}
                             className="w-full bg-transparent text-[8px] font-black outline-none uppercase text-indigo-600"
                           >
                              <option value="">SELECT SUBJECT...</option>
                              {subjects.map(s => <option key={s} value={s}>{s.substring(0,10)}...</option>)}
                           </select>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            ))}
         </div>
      </div>
    </div>
  );
};

export default FacilitatorPortal;
