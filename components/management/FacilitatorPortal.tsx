
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

  // Fetch question counts from HQ banks for each staff member to calculate payment-ready metrics
  useEffect(() => {
    const fetchCounts = async () => {
      const counts: Record<string, QuestionCounts> = {};
      const staffEntries = Object.entries(facilitators || {});

      for (const [idKey, f] of staffEntries) {
        if (!f.taughtSubject || !f.name) continue;
        // The bankId matches the one used in LikelyQuestionDesk.tsx
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
      const enrolledId = `${hubId}/FAC-${Math.floor(100 + Math.random() * 899)}`;
      
      // LOGIC UPDATE: We do not send OTP here. 
      // We simply register the node in the local state. 
      // The staff will receive their OTP when they attempt to sign in via the LoginPortal using this registered email.

      const emptyInvigilations: InvigilationSlot[] = Array.from({ length: 9 }, () => ({
        dutyDate: '',
        timeSlot: '',
        subject: ''
      }));

      const staff: StaffAssignment = {
        name: newStaff.name.toUpperCase(),
        email: newStaff.email.toLowerCase().trim(),
        role: newStaff.role,
        taughtSubject: newStaff.subject,
        enrolledId,
        invigilations: emptyInvigilations,
        marking: { dateTaken: '', dateReturned: '', inProgress: false }
      };

      setFacilitators(prev => ({ ...prev, [enrolledId]: staff }));
      setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
      alert(`STAFF NODE ENROLLED: ${staff.name} is now authorized. They can login to receive their PIN.`);
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
      alert(`PIN DISPATCHED: A manual handshake token has been sent to ${email}`);
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
    Object.values(facilitators || {}).forEach(f => {
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
      
      {/* Academy HR Command - Header */}
      <section className="bg-slate-950 text-white p-10 rounded-[3.5rem] border border-white/5 shadow-2xl relative overflow-hidden no-print">
         <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-40 -mt-40 blur-[100px]"></div>
         <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="space-y-2">
               <h2 className="text-3xl font-black uppercase tracking-tighter leading-none flex items-center gap-4">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3L17 12"/></svg>
                  Academy HR Command
               </h2>
               <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em]">Specialist Cadre Management & Deployment</p>
            </div>
            {!isFacilitator && (
               <button onClick={() => setShowRoster(true)} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-blue-50 transition-all">Generate Master Roster</button>
            )}
         </div>

         {!isFacilitator && (
           <form onSubmit={handleAddStaff} className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input 
                type="text" 
                value={newStaff.name} 
                onChange={e=>setNewStaff({...newStaff, name: e.target.value})} 
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/20" 
                placeholder="LEGAL IDENTITY..." 
                required 
              />
              <input 
                type="email" 
                value={newStaff.email} 
                onChange={e=>setNewStaff({...newStaff, email: e.target.value})} 
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black outline-none focus:ring-4 focus:ring-blue-500/20" 
                placeholder="STAFF EMAIL..." 
                required 
              />
              <select 
                value={newStaff.subject} 
                onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} 
                className="bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-black uppercase outline-none"
              >
                 <option value="" className="text-slate-900">SELECT SUBJECT...</option>
                 {subjects.map(s => <option key={s} value={s} className="text-slate-900">{s.toUpperCase()}</option>)}
              </select>
              <button type="submit" disabled={isEnrolling} className="bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95 disabled:opacity-50">
                 {isEnrolling ? "PROCESSING..." : "Enrol New Staff"}
              </button>
           </form>
         )}
      </section>

      {/* Specialist Facilitator Cadre Shards */}
      <div className="space-y-6 no-print">
         <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] px-4">Specialist Facilitator Cadre</h3>
         <div className="grid grid-cols-1 gap-12">
            {Object.entries(facilitators || {}).map(([idKey, f], i) => {
              if (!f) return null;
              const safeInvigilations = f.invigilations || Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' }));
              const invigilationCount = safeInvigilations.filter(d => d.dutyDate).length;
              const counts = qCounts[idKey] || { theory: 0, objective: 0 };
              
              return (
                <div key={idKey} className="bg-white rounded-[3.5rem] border border-gray-100 shadow-2xl overflow-hidden group hover:border-blue-500/30 transition-all">
                  <div className="bg-gray-50 px-10 py-8 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl">#{i+1}</div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{f.taughtSubject || "General"} Specialist</span>
                          <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            <EditableField value={f.name} onChange={(v) => handleUpdateStaffMember(idKey, 'name', v.toUpperCase())} className="border-none" />
                          </h4>
                          <p className="text-[10px] font-mono font-bold text-slate-400 uppercase">{f.email}</p>
                          <p className="text-[9px] font-mono font-bold text-blue-400 uppercase tracking-tighter">Legal ID: {f.enrolledId}</p>
                        </div>
                    </div>

                    {/* PAYMENT SLOT COUNTERS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 max-w-2xl">
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Theory Pool</span>
                          <span className="text-lg font-black text-blue-900">{counts.theory}</span>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Obj. Pool</span>
                          <span className="text-lg font-black text-blue-900">{counts.objective}</span>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Invigilations</span>
                          <span className="text-lg font-black text-indigo-600">{invigilationCount}</span>
                       </div>
                       <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-center">
                          <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Marking Exams</span>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${f.marking?.inProgress ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {f.marking?.inProgress ? 'IN PROGRESS' : 'RETURNED'}
                          </span>
                       </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                        <div className="flex gap-2">
                           {!isFacilitator && (
                             <button onClick={() => handleResendPin(f.email)} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-blue-600 transition-all">Resend Code</button>
                           )}
                           <div className="bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-[9px] font-black uppercase border border-emerald-100">Identity Verified</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-black text-slate-400 uppercase block">Hub Role</span>
                          <select 
                             value={f.role || 'FACILITATOR'} 
                             onChange={(e) => handleUpdateStaffMember(idKey, 'role', e.target.value)}
                             className="text-sm font-black text-blue-900 uppercase bg-transparent outline-none border-b border-dashed border-blue-200"
                             disabled={isFacilitator}
                          >
                             <option value="FACILITATOR">FACILITATOR</option>
                             <option value="EXAMINER">EXAMINER</option>
                             <option value="INVIGILATOR">INVIGILATOR</option>
                             <option value="SUPERVISOR">SUPERVISOR</option>
                          </select>
                        </div>
                    </div>
                  </div>

                  {/* Individual Register Slots */}
                  <div className="p-10 bg-white">
                    <div className="flex items-center justify-between mb-8">
                        <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                          <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
                          Invigilation Register (1-9)
                        </h5>
                        <div className="text-[9px] font-bold text-slate-400 uppercase">{invigilationCount}/9 Scheduled</div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-4">
                        {safeInvigilations.map((slot, si) => (
                          <div key={si} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-blue-50/20 transition-colors">
                            <span className="text-[10px] font-black text-slate-300 block border-b border-slate-200 pb-1">{si + 1}.</span>
                            <input 
                              type="date" 
                              value={slot.dutyDate} 
                              onChange={e=>updateDuty(idKey, si, 'dutyDate', e.target.value)}
                              className="w-full bg-transparent text-[8px] font-bold outline-none uppercase text-blue-900" 
                              disabled={isFacilitator}
                            />
                            <input 
                              type="text" 
                              placeholder="TIME" 
                              value={slot.timeSlot} 
                              onChange={e=>updateDuty(idKey, si, 'timeSlot', e.target.value.toUpperCase())}
                              className="w-full bg-transparent text-[8px] font-black border-b border-slate-200 outline-none uppercase placeholder:text-slate-300" 
                              disabled={isFacilitator}
                            />
                            <select 
                              value={slot.subject} 
                              onChange={e=>updateDuty(idKey, si, 'subject', e.target.value)}
                              className="w-full bg-transparent text-[8px] font-black outline-none uppercase text-indigo-600"
                              disabled={isFacilitator}
                            >
                                <option value="">SUBJECT</option>
                                {subjects.map(s => <option key={s} value={s}>{s.substring(0,10)}...</option>)}
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

      {/* MASTER ROSTER MODAL - Print View */}
      {showRoster && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in zoom-in-95 duration-300 overflow-y-auto">
           <div className="bg-white w-full max-w-6xl rounded-[3rem] p-10 md:p-16 shadow-2xl relative">
              <button onClick={() => setShowRoster(false)} className="absolute top-10 right-10 no-print text-gray-400 hover:text-black">
                 <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              
              <div id="roster-print-area">
                <ReportBrandingHeader 
                  settings={settings} 
                  onSettingChange={()=>{}} 
                  reportTitle="OFFICIAL MASTER DUTY ROSTER"
                  subtitle={`GENERATED ON: ${new Date().toLocaleDateString()}`}
                  isLandscape={true}
                  readOnly={true}
                />

                <div className="mt-12 overflow-x-auto">
                   <table className="w-full text-left border-collapse border-2 border-slate-900">
                      <thead>
                         <tr className="bg-slate-900 text-white uppercase text-[9px] font-black tracking-widest">
                            <th className="p-4 border-r border-slate-700">Date</th>
                            <th className="p-4 border-r border-slate-700">Time Slot</th>
                            <th className="p-4 border-r border-slate-700">Discipline</th>
                            <th className="p-4">Assigned Specialist</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                         {masterRoster.length > 0 ? masterRoster.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-colors font-bold text-xs">
                               <td className="p-4 border-r border-slate-100 uppercase">{item.dutyDate}</td>
                               <td className="p-4 border-r border-slate-100 uppercase">{item.timeSlot}</td>
                               <td className="p-4 border-r border-slate-100 uppercase text-blue-900">{item.subject}</td>
                               <td className="p-4 uppercase text-slate-900">{item.staffName}</td>
                            </tr>
                         )) : (
                            <tr><td colSpan={4} className="p-20 text-center text-slate-300 uppercase font-black tracking-widest">No active deployments registered in the institutional matrix</td></tr>
                         )}
                      </tbody>
                   </table>
                </div>

                <div className="mt-12 grid grid-cols-2 gap-20 pt-10 border-t border-slate-100">
                   <div className="text-center border-t-2 border-slate-900 pt-2">
                      <p className="text-[10px] font-black uppercase text-gray-500">Registry Controller Approval</p>
                   </div>
                   <div className="text-center border-t-2 border-slate-900 pt-2">
                      <p className="text-[10px] font-black uppercase text-gray-500">Director's Authorization</p>
                   </div>
                </div>
              </div>

              <div className="mt-10 flex justify-center no-print">
                 <button onClick={() => window.print()} className="bg-blue-900 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all">Download / Print Roster</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default FacilitatorPortal;
