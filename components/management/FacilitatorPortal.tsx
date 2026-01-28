import React, { useState, useMemo } from 'react';
import { StaffAssignment, StaffRole, InvigilationSlot, GlobalSettings } from '../../types';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';
import EditableField from '../shared/EditableField';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  onSettingChange?: (key: keyof GlobalSettings, value: any) => void;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ 
  subjects, facilitators, setFacilitators, settings, onSettingChange, isFacilitator, activeFacilitator 
}) => {
  const roles: StaffRole[] = ['FACILITATOR', 'INVIGILATOR', 'EXAMINER', 'SUPERVISOR', 'OFFICER'];
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [reportView, setReportView] = useState<'none' | 'duty-roster' | 'master-timetable'>('none');
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('INVIGILATOR');
  const [newStaffTaughtSubject, setNewStaffTaughtSubject] = useState('');

  const generateIndividualKey = (prefix: string) => `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

  const updateStaff = (key: string, updates: Partial<StaffAssignment>) => {
    setFacilitators(prev => {
      const existing = prev[key];
      if (!existing) return prev;
      return { ...prev, [key]: { ...existing, ...updates } };
    });
  };

  const handleManualEnroll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;

    const staffCount = Object.keys(facilitators).length;
    const enrolledId = `FAC-${(staffCount + 1).toString().padStart(2, '0')}`;
    const targetKey = newStaffTaughtSubject || `STAFF_${Date.now()}`;

    const newStaff: StaffAssignment = { 
      name: newStaffName.toUpperCase(), 
      role: newStaffRole,
      enrolledId,
      taughtSubject: newStaffTaughtSubject || 'N/A',
      passkey: generateIndividualKey('S'),
      invigilations: Array.from({ length: 9 }, () => ({ dutyDate: '', timeSlot: '', subject: '' })),
      marking: { dateTaken: '', dateReturned: '', inProgress: false }
    };

    setFacilitators(prev => ({ ...prev, [targetKey]: newStaff }));
    setNewStaffName('');
    setShowEnrollment(false);
  };

  // AGGREGATION 1: Individual Duty Roster (Chronological list of all person-duties)
  const dutyRoster = useMemo(() => {
    const list: any[] = [];
    (Object.values(facilitators) as StaffAssignment[]).forEach(staff => {
      staff.invigilations.forEach(slot => {
        if (slot.dutyDate && slot.subject) {
          list.push({ 
            ...slot, 
            staffName: staff.name, 
            staffId: `${settings.schoolNumber}/${staff.enrolledId}`, 
            role: staff.role 
          });
        }
      });
    });
    return list.sort((a, b) => a.dutyDate.localeCompare(b.dutyDate) || a.timeSlot.localeCompare(b.timeSlot));
  }, [facilitators, settings.schoolNumber]);

  // AGGREGATION 2: Master Timetable (Grouped by Date/Time/Subject)
  const masterTimetable = useMemo(() => {
    const slotsMap: Record<string, { date: string, time: string, subject: string, personnel: string[] }> = {};
    
    (Object.values(facilitators) as StaffAssignment[]).forEach(staff => {
      staff.invigilations.forEach(slot => {
        if (slot.dutyDate && slot.subject) {
          const key = `${slot.dutyDate}_${slot.timeSlot}_${slot.subject}`;
          if (!slotsMap[key]) {
            slotsMap[key] = { 
              date: slot.dutyDate, 
              time: slot.timeSlot, 
              subject: slot.subject, 
              personnel: [staff.name] 
            };
          } else if (!slotsMap[key].personnel.includes(staff.name)) {
            slotsMap[key].personnel.push(staff.name);
          }
        }
      });
    });

    return Object.values(slotsMap).sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  }, [facilitators]);

  const visibleSubjects = isFacilitator && activeFacilitator 
    ? subjects.filter(s => s === activeFacilitator.subject)
    : subjects;

  const floatingStaffKeys = Object.keys(facilitators).filter(key => !subjects.includes(key));

  const renderStaffCard = (key: string, isSubjectBound: boolean, index: number) => {
    const staff = facilitators[key];
    if (!staff) return null;
    const institutionalId = `${settings.schoolNumber}/${staff.enrolledId}`;
    const assignedCount = staff.invigilations.filter(i => i.subject).length;

    return (
      <div key={key} className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden hover:border-blue-200 transition-all group">
        <div className={`px-6 py-4 flex justify-between items-center ${isSubjectBound ? 'bg-blue-900' : 'bg-slate-900'}`}>
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white uppercase tracking-widest leading-none">{isSubjectBound ? key : staff.role}</span>
            <span className="text-[8px] text-white/50 font-bold uppercase tracking-widest mt-1">Subject Specialist</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${assignedCount > 0 ? 'bg-white text-blue-900' : 'bg-white/10 text-white'}`}>
            {assignedCount}/9 DUTIES
          </div>
        </div>
        <div className="p-8 space-y-6">
           <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Enrolled Institutional ID</label>
              <code className="text-xs font-mono font-black text-blue-900 bg-blue-50 px-4 py-2 rounded-xl block border border-blue-100">{institutionalId}</code>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Legal Identity</label>
                <input 
                  type="text" 
                  value={staff.name} 
                  onChange={e => updateStaff(key, { name: e.target.value.toUpperCase() })} 
                  className="w-full border-b-2 border-gray-100 focus:border-blue-600 outline-none font-black text-slate-800 text-sm py-1 transition-all uppercase bg-transparent"
                  placeholder="ENTER NAME..." 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Hub Role</label>
                <select 
                   value={staff.role} 
                   onChange={e => updateStaff(key, { role: e.target.value as StaffRole })}
                   className="w-full border-b-2 border-gray-100 focus:border-blue-600 outline-none font-black text-slate-500 text-xs py-1 transition-all uppercase bg-transparent"
                >
                   {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
           </div>

           <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center border-b border-gray-50 pb-1">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Invigilation Register (1-9)</span>
                 <span className="text-[8px] font-black text-indigo-400">SYNCED TO CLOUD HUB</span>
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                 {staff.invigilations.map((inv, idx) => (
                   <div key={idx} className={`p-3 rounded-2xl border transition-all flex flex-wrap md:flex-nowrap items-center gap-2 ${inv.subject ? 'bg-blue-50/50 border-blue-100 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                     <span className="text-[10px] font-black text-gray-300 w-4">{idx + 1}.</span>
                     <input 
                       type="date" 
                       value={inv.dutyDate} 
                       onChange={e => {
                         const next = [...staff.invigilations];
                         next[idx].dutyDate = e.target.value;
                         updateStaff(key, { invigilations: next });
                       }}
                       className="bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none flex-1 min-w-[120px]"
                     />
                     <input 
                       type="text" 
                       placeholder="TIME" 
                       value={inv.timeSlot}
                       onChange={e => {
                         const next = [...staff.invigilations];
                         next[idx].timeSlot = e.target.value;
                         updateStaff(key, { invigilations: next });
                       }}
                       className="bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none w-20"
                     />
                     <select 
                       value={inv.subject}
                       onChange={e => {
                         const next = [...staff.invigilations];
                         next[idx].subject = e.target.value;
                         updateStaff(key, { invigilations: next });
                       }}
                       className="bg-white border border-gray-200 rounded-xl px-2 py-1.5 text-[10px] font-bold outline-none flex-1 min-w-[140px]"
                     >
                       <option value="">SELECT SUBJECT...</option>
                       {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                   </div>
                 ))}
              </div>
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* PERSISTENT REPORT VIEW MODAL */}
      {reportView !== 'none' && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[100] overflow-y-auto p-4 md:p-10 flex justify-center items-start">
           <div className="bg-white w-full max-w-[210mm] min-h-[297mm] p-12 shadow-[0_0_100px_rgba(0,0,0,0.8)] relative animate-in zoom-in-95 duration-500 flex flex-col rounded-sm border-t-8 border-blue-900">
              <div className="no-print absolute top-6 -right-16 flex flex-col gap-4">
                 <button onClick={() => setReportView('none')} className="bg-white text-black w-14 h-14 rounded-full flex items-center justify-center shadow-2xl font-black hover:bg-red-500 hover:text-white transition-all text-xl">✕</button>
                 <button onClick={() => window.print()} className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:bg-blue-700 transition-all">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                 </button>
              </div>
              
              <ReportBrandingHeader 
                settings={settings} 
                onSettingChange={onSettingChange || (() => {})} 
                reportTitle={reportView === 'duty-roster' ? "STAFF INVIGILATION DUTY ROSTER" : "MASTER EXAMINATION TIMETABLE"} 
                subtitle={`ACADEMIC SESSION: ${settings.activeMock}`}
              />

              <div className="flex-1 mt-6">
                 {reportView === 'duty-roster' ? (
                   <table className="w-full border-collapse text-[11px]">
                      <thead>
                         <tr className="bg-blue-900 text-white uppercase text-[8px] tracking-[0.2em]">
                            <th className="p-4 border border-blue-800 text-left w-32">Date</th>
                            <th className="p-4 border border-blue-800 text-center w-24">Time</th>
                            <th className="p-4 border border-blue-800 text-left">Subject Discipline</th>
                            <th className="p-4 border border-blue-800 text-left">Assigned Facilitator</th>
                            <th className="p-4 border border-blue-800 text-center w-24">Role</th>
                         </tr>
                      </thead>
                      <tbody>
                         {dutyRoster.map((duty, idx) => (
                            <tr key={idx} className="even:bg-gray-50 border-b border-gray-100 font-bold text-slate-800">
                               <td className="p-4 uppercase text-blue-900 font-black">{new Date(duty.dutyDate).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}</td>
                               <td className="p-4 text-center text-slate-500 font-mono">{duty.timeSlot || 'TBA'}</td>
                               <td className="p-4 uppercase text-slate-900">{duty.subject}</td>
                               <td className="p-4 uppercase font-black">
                                  <div className="flex flex-col">
                                     <span>{duty.staffName}</span>
                                     <span className="text-[7px] text-gray-400 font-mono tracking-tighter">{duty.staffId}</span>
                                  </div>
                               </td>
                               <td className="p-4 text-center"><span className="bg-blue-100 text-blue-900 px-3 py-1 rounded-full text-[8px] uppercase font-black">{duty.role}</span></td>
                            </tr>
                         ))}
                         {dutyRoster.length === 0 && (
                            <tr><td colSpan={5} className="p-32 text-center text-slate-300 uppercase font-black italic tracking-[0.3em]">No duty assignments have been synchronized in this session.</td></tr>
                         )}
                      </tbody>
                   </table>
                 ) : (
                   <table className="w-full border-collapse text-[11px]">
                      <thead>
                         <tr className="bg-indigo-900 text-white uppercase text-[8px] tracking-[0.2em]">
                            <th className="p-5 border border-indigo-800 text-left w-40">Examination Date</th>
                            <th className="p-5 border border-indigo-800 text-center w-28">Time Slot</th>
                            <th className="p-5 border border-indigo-800 text-left">Subject discipline</th>
                            <th className="p-5 border border-indigo-800 text-left">Invigilation Cadre (Personnel)</th>
                         </tr>
                      </thead>
                      <tbody>
                         {masterTimetable.map((slot, idx) => (
                            <tr key={idx} className="even:bg-gray-50 border-b border-gray-100 font-bold text-slate-800">
                               <td className="p-5 uppercase text-indigo-900 font-black">{new Date(slot.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</td>
                               <td className="p-5 text-center text-slate-400 font-mono">{slot.time || 'TBA'}</td>
                               <td className="p-5 uppercase text-slate-950 text-base tracking-tight">{slot.subject}</td>
                               <td className="p-5">
                                  <div className="flex flex-wrap gap-1.5">
                                     {slot.personnel.map((name, ni) => (
                                       <span key={ni} className="bg-indigo-950 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm">{name}</span>
                                     ))}
                                  </div>
                               </td>
                            </tr>
                         ))}
                         {masterTimetable.length === 0 && (
                            <tr><td colSpan={4} className="p-32 text-center text-slate-300 uppercase font-black italic tracking-[0.3em]">Institutional master schedule is currently vacant.</td></tr>
                         )}
                      </tbody>
                   </table>
                 )}
              </div>

              <div className="mt-20 pt-10 border-t-4 border-double border-gray-200 grid grid-cols-2 gap-24">
                 <div className="text-center space-y-1">
                    <div className="border-t-2 border-black pt-3 font-black uppercase text-[10px]">
                       <EditableField value={settings.registryRoleTitle || "EXAMINATION CONTROLLER"} onChange={(v) => onSettingChange?.('registryRoleTitle', v)} className="text-center w-full" />
                    </div>
                    <p className="text-[8px] text-gray-400 italic font-bold">Authenticated deployment sequence</p>
                 </div>
                 <div className="text-center space-y-1">
                    <div className="border-t-2 border-black pt-3 font-black uppercase text-[10px]">
                       <EditableField value={settings.adminRoleTitle || "ACADEMY DIRECTOR"} onChange={(v) => onSettingChange?.('adminRoleTitle', v)} className="text-center w-full" />
                    </div>
                    <p className="text-[8px] text-gray-400 italic font-bold">Institutional Approval (Master Seal Required)</p>
                 </div>
              </div>

              <div className="mt-16 text-center border-t border-gray-100 pt-6 opacity-20">
                 <p className="text-[9px] font-black text-slate-950 uppercase tracking-[2em]">SS-MAP NETWORK MASTER SCHEDULE</p>
              </div>
           </div>
        </div>
      )}

      {/* Main Staff Hub Layout */}
      <section className="bg-white rounded-[3rem] border border-gray-200 p-8 shadow-2xl flex flex-col lg:flex-row justify-between items-center gap-8 relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-bl-full -mr-32 -mt-32 opacity-50 group-hover:scale-110 transition-transform duration-1000"></div>
         <div className="relative space-y-2 text-center lg:text-left">
            <h3 className="text-[12px] font-black text-blue-900 uppercase tracking-[0.5em]">Human Resource Command</h3>
            <p className="text-3xl font-black text-slate-800 uppercase tracking-tighter">Staff Deployment Hub</p>
            <p className="text-[11px] text-gray-400 font-bold uppercase italic max-w-lg">Central synchronization of invigilation duties and generation of unified examination schedules.</p>
         </div>
         <div className="relative flex flex-wrap justify-center gap-4">
            {!isFacilitator && (
              <>
                <button 
                  onClick={() => setReportView('master-timetable')}
                  className="bg-indigo-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 flex items-center gap-3 border border-indigo-800"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Generate Master Timetable
                </button>
                <button 
                  onClick={() => setReportView('duty-roster')}
                  className="bg-slate-800 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 flex items-center gap-3 border border-slate-700"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  Unified Duty Roster
                </button>
                <button 
                  onClick={() => setShowEnrollment(!showEnrollment)}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-2xl transition-all active:scale-95 flex items-center gap-3 shadow-blue-500/20"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add Node
                </button>
              </>
            )}
         </div>
      </section>

      {showEnrollment && !isFacilitator && (
        <form onSubmit={handleManualEnroll} className="bg-white p-10 rounded-[3rem] shadow-2xl border border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-8 animate-in slide-in-from-top-4 duration-500">
           <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Legal Name</label><input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" required placeholder="ENTER NAME..." /></div>
           <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hub Role</label><select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as StaffRole)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black outline-none">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
           <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subject Specialist</label><select value={newStaffTaughtSubject} onChange={e => setNewStaffTaughtSubject(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-xs font-black outline-none"><option value="">N/A (SUPPORT)</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
           <div className="flex items-end"><button type="submit" className="w-full bg-blue-900 text-white h-[60px] rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-black transition-all active:scale-95 tracking-widest">Enroll Staff Node</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
         {visibleSubjects.map((sub, i) => renderStaffCard(sub, true, i))}
         {floatingStaffKeys.map((k, i) => renderStaffCard(k, false, i))}
      </div>

      <div className="p-10 bg-slate-50 rounded-[3rem] border border-slate-100 flex items-start gap-6">
         <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase">Synchronization Notice</h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
               Staff invigilation registers are encrypted and mirrored across all network nodes. Data entry on one device will automatically propagate to the Master Timetable and Duty Roster on any other authorized institutional terminal.
            </p>
         </div>
      </div>
    </div>
  );
};

export default FacilitatorPortal;