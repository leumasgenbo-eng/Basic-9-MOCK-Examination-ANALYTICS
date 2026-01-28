import React, { useState, useMemo } from 'react';
import { StaffAssignment, StaffRole, InvigilationSlot, GlobalSettings } from '../../types';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ subjects, facilitators, setFacilitators, settings, isFacilitator, activeFacilitator }) => {
  const roles: StaffRole[] = ['FACILITATOR', 'INVIGILATOR', 'EXAMINER', 'SUPERVISOR', 'OFFICER'];
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('INVIGILATOR');
  const [newStaffTaughtSubject, setNewStaffTaughtSubject] = useState('');

  const generateIndividualKey = (prefix: string) => {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
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

  const renderStaffCard = (key: string, isSubjectBound: boolean, index: number) => {
    const staff = facilitators[key];
    if (!staff) return null;

    const institutionalId = `${settings.schoolNumber}/${staff.enrolledId}`;

    return (
      <div key={key} className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden hover:border-blue-200 transition-all group">
        <div className={`px-6 py-4 flex justify-between items-center ${isSubjectBound ? 'bg-blue-900' : 'bg-slate-900'}`}>
          <span className="text-[9px] font-black text-white uppercase tracking-widest">{isSubjectBound ? key : staff.role}</span>
          <div className="bg-white/10 px-3 py-1 rounded-full text-[8px] font-black text-white uppercase">ID: {staff.enrolledId}</div>
        </div>
        <div className="p-8 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-gray-200">
                 <span className="text-[8px] font-black text-gray-400 uppercase block mb-1">Gate Identity</span>
                 <code className="text-xs font-mono font-black text-blue-900">{institutionalId}</code>
              </div>
              <div className="bg-indigo-50 p-4 rounded-2xl border border-dashed border-indigo-200">
                 <span className="text-[8px] font-black text-indigo-400 uppercase block mb-1">Passkey</span>
                 <code className="text-xs font-mono font-black text-indigo-900">{staff.passkey}</code>
              </div>
           </div>
           <div>
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-1">Legal Name</label>
              <p className="text-sm font-black text-gray-900 uppercase">{staff.name}</p>
           </div>
        </div>
      </div>
    );
  };

  const visibleSubjects = isFacilitator && activeFacilitator 
    ? subjects.filter(s => s === activeFacilitator.subject)
    : subjects;

  const floatingStaffKeys = Object.keys(facilitators).filter(key => !subjects.includes(key));

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-2xl flex justify-between items-center">
         <div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Staff Deployment Hub</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Generating unique access nodes for {settings.schoolName}</p>
         </div>
         {!isFacilitator && (
           <button onClick={() => setShowEnrollment(!showEnrollment)} className="bg-blue-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase shadow-xl hover:bg-black transition-all">
              Add New Staff Node
           </button>
         )}
      </div>

      {showEnrollment && (
        <form onSubmit={handleManualEnroll} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-100 grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-top-4">
           <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Name</label><input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
           <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Role</label><select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as StaffRole)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none">{roles.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
           <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Subject</label><select value={newStaffTaughtSubject} onChange={e => setNewStaffTaughtSubject(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"><option value="">SUPPORT/ADMIN</option>{subjects.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
           <div className="flex items-end"><button type="submit" className="w-full bg-blue-900 text-white h-[48px] rounded-xl font-black text-[10px] uppercase">Enroll Node</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {visibleSubjects.map((sub, i) => renderStaffCard(sub, true, i))}
         {floatingStaffKeys.map((k, i) => renderStaffCard(k, false, i))}
      </div>
    </div>
  );
};

export default FacilitatorPortal;