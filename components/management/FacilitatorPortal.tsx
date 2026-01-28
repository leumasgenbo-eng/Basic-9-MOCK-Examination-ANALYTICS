
import React, { useState } from 'react';
import { StaffAssignment, StaffRole, GlobalSettings } from '../../types';

interface FacilitatorPortalProps {
  subjects: string[];
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  settings: GlobalSettings;
  // Fix: Added missing props for component integration
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const FacilitatorPortal: React.FC<FacilitatorPortalProps> = ({ subjects, facilitators, setFacilitators, settings, isFacilitator, activeFacilitator }) => {
  const [newStaff, setNewStaff] = useState({ name: '', email: '', role: 'FACILITATOR' as StaffRole, subject: '' });

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaff.name || !newStaff.email) return;

    const enrolledId = `FAC-${Math.floor(100 + Math.random() * 900)}`;
    const staff: StaffAssignment = {
      name: newStaff.name.toUpperCase(),
      email: newStaff.email.toLowerCase(),
      role: newStaff.role,
      taughtSubject: newStaff.subject,
      enrolledId,
      invigilations: [],
      marking: { dateTaken: '', dateReturned: '', inProgress: false }
    };

    const key = newStaff.subject || `FLOAT_${Date.now()}`;
    setFacilitators(prev => ({ ...prev, [key]: staff }));
    setNewStaff({ name: '', email: '', role: 'FACILITATOR', subject: '' });
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl">
         <h3 className="text-xl font-black text-slate-900 uppercase mb-8">Faculty Deployment Hub</h3>
         <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <input type="text" value={newStaff.name} onChange={e=>setNewStaff({...newStaff, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="STAFF NAME..." required />
            <input type="email" value={newStaff.email} onChange={e=>setNewStaff({...newStaff, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="FACILITATOR EMAIL..." required />
            <select value={newStaff.subject} onChange={e=>setNewStaff({...newStaff, subject: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none">
               <option value="">SELECT SUBJECT...</option>
               {subjects.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
            </select>
            <button type="submit" className="bg-blue-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Enroll Faculty Node</button>
         </form>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         {Object.entries(facilitators).map(([key, f]) => (
            <div key={key} className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-xl flex justify-between items-center group">
               <div className="space-y-2">
                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">{f.taughtSubject || f.role}</span>
                  <h4 className="text-lg font-black text-gray-900 uppercase leading-none">{f.name}</h4>
                  <p className="text-[10px] font-bold text-gray-400 font-mono">{f.email}</p>
               </div>
               <div className="flex flex-col items-end gap-3">
                  <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[8px] font-black uppercase border border-emerald-100">PIN Access Ready</div>
                  <button className="text-[8px] font-black text-blue-600 uppercase underline decoration-blue-200 hover:decoration-blue-600 transition-all">Invite via PIN</button>
               </div>
            </div>
         ))}
      </div>
    </div>
  );
};

export default FacilitatorPortal;
