
import React, { useState, useEffect, useMemo } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings, InvigilationSlot, MasterQuestion } from '../../types';
import { supabase } from '../../supabaseClient';
import EditableField from '../shared/EditableField';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

interface QuestionCounts {
  theory: number;
  objective: number;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ subjects, facilitators, setFacilitators, settings, isFacilitator, activeFacilitator }) => {
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'FACILITATOR' as StaffRole, subject: '' });
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [qCounts, setQCounts] = useState<Record<string, QuestionCounts>>({});
  const [showRoster, setShowRoster] = useState(false);

  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, QuestionCounts> = {};
      const staffEntries = Object.entries(facilitators || {}) as [string, StaffAssignment][];

      for (const [idKey, f] of staffEntries) {
        if (!f.taughtSubject || !f.name) continue;
        const bankId = `likely_${f.taughtSubject.replace(/\s+/g, '')}_${f.name.replace(/\s+/g, '')}`;
        const { data } = await supabase.from('uba_persistence').select('payload').eq('id', bankId).maybeSingle();
        
        if (data?.payload) {
          const qs = data.payload as MasterQuestion[];
          counts[idKey] = {
            theory: qs.filter(q => q.type === 'THEORY').length,
            objective: qs.filter(q => q.type === 'OBJECTIVE').length
          };
        } else {
          counts[idKey] = { theory: 0, objective: 0 };
        }
      }
      setQCounts(counts);
    };

    fetchCounts();
  }, [facilitators]);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;
    setIsEnrolling(true);

    try {
      const hubId = settings.schoolNumber;
      const enrolledId = `FAC-${Math.floor(100 + Math.random() * 899)}`;
      const targetEmail = newStaff.email.toLowerCase().trim();
      const targetName = newStaff.name.toUpperCase().trim();

      // 1. DISPATCH IDENTITY TO REGISTRY
      await supabase.from('uba_identities').upsert({
         email: targetEmail,
         full_name: targetName,
         node_id: enrolledId,
         hub_id: hubId,
         role: 'facilitator'
      });

      // 2. TRIGGER SIGN IN WITH OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          data: { 
            role: 'facilitator', 
            hubId: hubId, 
            name: targetName,
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
        name: targetName,
        email: targetEmail,
        role: newStaff.role,
        taughtSubject: newStaff.subject,
        enrolledId,
        invigilations: emptyInvigilations,
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      setFacilitators(prev => ({ ...prev, [enrolledId]: staff }));
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
      alert(`STAFF ENROLLED: Shard verified. Access PIN sent to ${targetEmail}`);
    } catch (err: any) {
      alert("HR Sync Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleResendPin = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: email.toLowerCase().trim() });
      if (error) throw error;
      alert(`PIN DISPATCHED: Handshake token has been sent.`);
    } catch (err: any) {
      alert("Auth Gateway Error: " + err.message);
    }
  };

  const handleUpdateStaffMember = (id: string, field: keyof StaffAssignment, value: any) => {
    setFacilitators(prev => {
      const staff = prev[id];
      if (!staff) return prev;
      return { ...prev, [id]: { ...staff, [field]: value } };
    });
  };

  const updateDuty = (staffId: string, slotIndex: number, field: keyof InvigilationSlot, value: string) => {
    setFacilitators(prev => {
      const next = { ...prev };
      const staff = next[staffId];
      if (staff) {
        const safeSlots = staff.invigilations || Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));
        const nextSlots = [...safeSlots];
        nextSlots[slotIndex] = { ...nextSlots[slotIndex], [field]: value };
        next[staffId] = { ...staff, invigilations: nextSlots };
      }
      return next;
    });
  };

  const masterRoster = useMemo(() => {
    const list: any[] = [];
    (Object.values(facilitators || {}) as StaffAssignment[]).forEach(f => {
      (f.invigilations || []).forEach(slot => {
        if (slot.dutyDate) {
          list.push({ ...slot, staffName: f.name });
        }
      });
    });
    return list.sort((a, b) => new Date(a.dutyDate).getTime() - new Date(b.dutyDate).getTime());
  }, [facilitators]);

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 font-sans">
      <section className="bg-slate-950 text-white p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden no-print">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter leading-none flex items-center gap-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3L17 12"/></svg>
                  Academy HR Command
               </h2>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Faculty Management Portal</p>
            </div>
            {!isFacilitator && (
               <button onClick={() => setShowRoster(true)} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-50 transition-all">Generate Master Roster</button>
            )}
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none" placeholder="NAME..." required />
              <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none" placeholder="EMAIL..." required />
              <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none">
                 <option value="" className="text-slate-900">SELECT SUBJECT...</option>
                 {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg disabled:opacity-50">
                 {isEnrolling ? "SYNCING..." : "Enrol Staff Node"}
              </button>
           </form>
         )}
      </section>

      <div className="space-y-6 no-print">
         <div className="grid grid-cols-1 gap-12">
            {(Object.entries(facilitators || {}) as [string, StaffAssignment][]).map(([idKey, f], i) => {
              if (!f) return null;
              const safeInvigilations = f.invigilations || Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));
              const invigilationCount = safeInvigilations.filter(d => d.dutyDate).length;
              const counts = qCounts[idKey] || { theory: 0, objective: 0 };
              
              return (
                <div key={idKey} className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden">
                  <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl">#{i+1}</div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{f.taughtSubject} Specialist</span>
                          <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            <EditableField value={f.name} onChange={(v) => handleUpdateStaffMember(idKey, 'name', v.toUpperCase())} className="border-none" />
                          </h4>
                          <p className="text-[10px] font-mono text-slate-400 uppercase">{f.email}</p>
                          <p className="text-[9px] font-mono text-blue-400 uppercase tracking-tighter">Node ID: {f.enrolledId}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-2xl text-center">
                       <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Theory</span>
                          <span className="text-lg font-black text-blue-900">{counts.theory}</span>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Obj.</span>
                          <span className="text-lg font-black text-blue-900">{counts.objective}</span>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Dutys</span>
                          <span className="text-lg font-black text-indigo-600">{invigilationCount}</span>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Marking</span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${f.marking?.inProgress ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {f.marking?.inProgress ? 'ACTIVE' : 'SENT'}
                          </span>
                       </div>
                    </div>

                    <div className="flex gap-2">
                       {!isFacilitator && (
                         <button onClick={() => handleResendPin(f.email)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all">PIN</button>
                       )}
                       <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-emerald-100">VERIFIED</div>
                    </div>
                  </div>

                  <div className="p-10 bg-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
                        {safeInvigilations.map((slot, si) => (
                          <div key={si} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <span className="text-[10px] font-black text-slate-300 block">{si + 1}.</span>
                            <input type="date" value={slot.dutyDate} onChange={e=>updateDuty(idKey, si, 'dutyDate', e.target.value)} className="w-full bg-transparent text-[8px] font-bold outline-none uppercase text-blue-900" disabled={isFacilitator} />
                            <input type="text" placeholder="TIME" value={slot.timeSlot} onChange={e=>updateDuty(idKey, si, 'timeSlot', e.target.value.toUpperCase())} className="w-full bg-transparent text-[8px] font-black border-b border-slate-200 outline-none uppercase" disabled={isFacilitator} />
                            <select value={slot.subject} onChange={e=>updateDuty(idKey, si, 'subject', e.target.value)} className="w-full bg-transparent text-[8px] font-black outline-none uppercase text-indigo-600" disabled={isFacilitator}>
                                <option value="">SUB</option>
                                {subjects.map(s => <option key={s} value={s}>{s.substring(0,3)}</option>)}
                            </select>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
         </div>
      </div>
    </div>
  );
};

export default FacilitatorPortal;
