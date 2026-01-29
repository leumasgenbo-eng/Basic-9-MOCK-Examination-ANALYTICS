
import React, { useState } from 'react';
import { StudentData, GlobalSettings, MockScoreSet } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
  onSave: () => void;
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects, onSave }) => {
  const [formData, setFormData] = useState({ 
    name: '', 
    email: '', 
    gender: 'M', 
    guardianName: '', 
    parentContact: '', 
    parentEmail: '' 
  });
  
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [sbaEntryId, setSbaEntryId] = useState<number | null>(null);

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setIsEnrolling(true);

    try {
      const targetEmail = formData.email.toLowerCase().trim();
      const targetName = formData.name.toUpperCase().trim();
      const studentId = editingId || (students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101);

      // 1. STORAGE PERSISTENCE: Mirror pupil identity for recall
      await supabase.from('uba_identities').upsert({
         email: targetEmail,
         full_name: targetName,
         node_id: studentId.toString(),
         hub_id: settings.schoolNumber,
         role: 'pupil'
      });
      
      if (!editingId) {
        // TRIGGER AUTH OTP for NEW pupils only
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: {
            data: { role: 'pupil', hubId: settings.schoolNumber, name: targetName, studentId: studentId },
            shouldCreateUser: true
          }
        });
        if (otpError) throw otpError;
      }

      const updatedStudent: StudentData = {
        id: studentId, 
        name: targetName, 
        email: targetEmail, 
        gender: formData.gender,
        parentName: formData.guardianName.toUpperCase(), 
        parentContact: formData.parentContact,
        parentEmail: formData.parentEmail.toLowerCase().trim(),
        attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
      };
      
      if (editingId) {
        setStudents(prev => prev.map(s => s.id === editingId ? { ...s, ...updatedStudent, mockData: s.mockData } : s));
        alert("CANDIDATE UPDATED: Identity shards refreshed.");
      } else {
        setStudents(prev => [...prev, updatedStudent]);
        alert(`CANDIDATE ENROLLED: ID ${studentId} synchronised with storage.`);
      }

      setFormData({ name: '', email: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
    } catch (err: any) {
      alert("Candidate Storage Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleDeletePupil = async (id: number, name: string) => {
    if (!window.confirm(`CRITICAL: Permanent deletion of ${name} (ID: ${id})? This erases all associated score history across all mock series.`)) return;
    
    try {
      const student = students.find(s => s.id === id);
      if (student) {
        await supabase.from('uba_identities').delete().eq('email', student.email);
      }
      setStudents(prev => prev.filter(s => s.id !== id));
      alert("CANDIDATE PURGED: Storage node decommissioned.");
    } catch (err) {
      alert("Deletion Fault.");
    }
  };

  const handleEditClick = (s: StudentData) => {
    setEditingId(s.id);
    setFormData({
      name: s.name,
      email: s.email,
      gender: s.gender,
      guardianName: s.parentName || '',
      parentContact: s.parentContact || '',
      parentEmail: s.parentEmail || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSbaScore = (studentId: number, subject: string, score: string) => {
    const numeric = parseInt(score) || 0;
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { 
        scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, 
        observations: { facilitator: "", invigilator: "", examiner: "" }, 
        attendance: 0, conductRemark: "" 
      };
      return {
        ...s,
        mockData: {
          ...(s.mockData || {}),
          [settings.activeMock]: {
            ...mockSet,
            sbaScores: { ...(mockSet.sbaScores || {}), [subject]: numeric }
          }
        }
      };
    }));
  };

  const openMail = (to: string, type: 'PUPIL' | 'PARENT', studentName: string) => {
    if (!to) return alert("No email address provided.");
    const subject = `Official Communication: ${settings.schoolName}`;
    const body = `Dear ${type === 'PUPIL' ? studentName : 'Parent/Guardian'},\n\nWe are writing to update you on your current status at ${settings.schoolName} for the ${settings.activeMock} series.\n\nInstitutional Administration.`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 font-sans">
      
      {/* 1. Ingestion / Edit Form */}
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative mb-10 space-y-2">
           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
             {editingId ? `Modify Candidate Profile: ${editingId}` : 'Candidate Ingestion Ledger'}
           </h3>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">Persistence Handshake Ready</p>
        </div>
        
        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Full Legal Name</label>
             <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="NAME..." required />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Participant Email</label>
             <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="USER@SMA.APP" required />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Biological Sex</label>
             <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Guardian Name</label>
             <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="PARENT NAME..." />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Guardian Contact</label>
             <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="PHONE..." />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-4">Guardian Email</label>
             <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="PARENT@EMAIL.COM" />
          </div>

          <div className="md:col-span-2 lg:col-span-3 flex gap-3 pt-4">
             <button type="submit" disabled={isEnrolling} className={`flex-1 ${editingId ? 'bg-indigo-600' : 'bg-blue-900'} text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all disabled:opacity-50`}>
                {isEnrolling ? "MIRRORING..." : editingId ? "Save Modifications" : "Ingest Candidate Particulars"}
             </button>
             {editingId && (
               <button type="button" onClick={() => { setEditingId(null); setFormData({name:'', email:'', gender:'M', guardianName:'', parentContact:'', parentEmail:''}); }} className="bg-slate-200 text-slate-500 px-10 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-300 transition-colors">Cancel</button>
             )}
          </div>
        </form>
      </section>

      {/* 2. Candidate Directory Matrix */}
      <div className="grid grid-cols-1 gap-6">
         {students.map(s => {
            const isSbaOpen = sbaEntryId === s.id;
            const mockSet = s.mockData?.[settings.activeMock];
            
            return (
              <div key={s.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                 <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6 flex-1 min-w-0">
                       <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white shrink-0">{s.name.charAt(0)}</div>
                       <div className="space-y-1 min-w-0 overflow-hidden">
                          <h4 className="text-lg font-black text-slate-900 uppercase leading-none truncate">{s.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">INDEX: {s.id} — {s.email}</p>
                          <div className="flex gap-4 pt-1">
                             <span className="text-[8px] font-black text-blue-500 uppercase bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">SEX: {s.gender}</span>
                             <span className="text-[8px] font-black text-slate-400 uppercase">Guardian: {s.parentName || 'N/A'}</span>
                          </div>
                       </div>
                    </div>

                    <div className="flex flex-wrap justify-center md:justify-end gap-3 w-full md:w-auto">
                       {/* SBA Action */}
                       <button 
                         onClick={() => setSbaEntryId(isSbaOpen ? null : s.id)}
                         className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all shadow-sm flex items-center gap-2 ${isSbaOpen ? 'bg-indigo-900 text-white shadow-indigo-200' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}
                       >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          SBA Scores
                       </button>

                       {/* Edit Action */}
                       <button onClick={() => handleEditClick(s)} className="bg-gray-50 hover:bg-gray-100 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200 transition-all">Edit</button>

                       {/* Mail Pupil */}
                       <button onClick={() => openMail(s.email, 'PUPIL', s.name)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                          Mail
                       </button>

                       {/* Mail Parent */}
                       <button onClick={() => openMail(s.parentEmail || '', 'PARENT', s.name)} className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all flex items-center gap-2">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                          Parent
                       </button>

                       {/* Delete Action */}
                       <button onClick={() => handleDeletePupil(s.id, s.name)} className="bg-red-50 hover:bg-red-600 text-red-500 hover:text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all">Delete</button>
                    </div>
                 </div>

                 {/* Inline SBA Entry Dashboard */}
                 {isSbaOpen && (
                   <div className="bg-slate-900 p-8 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                      <div className="flex justify-between items-center mb-6">
                        <div className="space-y-1">
                           <h5 className="text-white font-black text-sm uppercase tracking-widest">Continuous Assessment Ledger (SBA)</h5>
                           <p className="text-[9px] text-blue-400 uppercase tracking-widest">Active Series: {settings.activeMock} • Mandatory Requirement</p>
                        </div>
                        <button onClick={() => setSbaEntryId(null)} className="text-slate-500 hover:text-white"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                         {subjects.map(sub => (
                           <div key={sub} className="bg-white/5 border border-white/10 p-4 rounded-2xl group/sub hover:bg-white/10 transition-colors">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-2 truncate group-hover/sub:text-blue-400">{sub}</label>
                              <div className="flex items-center gap-2">
                                 <input 
                                   type="number" 
                                   value={mockSet?.sbaScores?.[sub] || 0}
                                   onChange={e => handleUpdateSbaScore(s.id, sub, e.target.value)}
                                   className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white w-full outline-none focus:ring-2 focus:ring-blue-500/30"
                                   max={100}
                                   min={0}
                                 />
                                 <span className="text-[8px] font-black text-slate-600">/100</span>
                              </div>
                           </div>
                         ))}
                      </div>
                      
                      <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
                         <button onClick={() => { onSave(); setSbaEntryId(null); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Save SBA Values</button>
                      </div>
                   </div>
                 )}
              </div>
            );
         })}

         {students.length === 0 && (
            <div className="bg-white p-20 rounded-[4rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-center opacity-40">
               <svg className="text-gray-300 mb-6" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
               <p className="font-black text-sm uppercase tracking-[0.5em]">Candidate Shard Vacant</p>
            </div>
         )}
      </div>

      {/* Global Sync Notice */}
      <div className="max-w-4xl mx-auto bg-blue-50/50 p-8 rounded-[3.5rem] border border-blue-100 flex items-center gap-6 shadow-inner">
         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-900 shadow-sm border border-blue-100 shrink-0">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
         </div>
         <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest leading-relaxed">
            Identity modifications and deletions are mirrored to the Supabase uba_identities shard. Purging a candidate removes all longitudinal analytical history. Proceed with caution.
         </p>
      </div>

    </div>
  );
};

export default PupilSBAPortal;
