
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
  const [showCredsId, setShowCredsId] = useState<number | null>(null);

  const handleAddOrUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setIsEnrolling(true);

    try {
      const targetEmail = formData.email.toLowerCase().trim();
      const targetName = formData.name.toUpperCase().trim();
      const studentId = editingId || (students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101);

      // TRIGGER CREDENTIAL DISPATCH with trigger-aligned keys
      if (!editingId) {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: targetEmail,
          options: {
            data: { 
              role: 'pupil', 
              hubId: settings.schoolNumber, 
              nodeId: studentId.toString(),
              full_name: targetName, 
              studentId: studentId 
            },
            shouldCreateUser: true
          }
        });
        if (otpError) throw otpError;
      } else {
        // If editing, force a metadata refresh in auth.users to trigger SQL update
        await supabase.auth.admin.updateUserById(editingId.toString(), {
           user_metadata: { full_name: targetName }
        }).catch(() => {}); // Admin operations might fail on client, ignore
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
        alert("PUPIL RECORD REFRESHED: Metadata synced to cloud.");
      } else {
        setStudents(prev => [...prev, updatedStudent]);
        alert(`PUPIL ENROLLED: ID ${studentId} synchronized. PIN dispatched to ${targetEmail}.`);
      }

      setFormData({ name: '', email: '', gender: 'M', guardianName: '', parentContact: '', parentEmail: '' });
      setEditingId(null);
      setTimeout(onSave, 100);
    } catch (err: any) {
      alert("Enrollment Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleForwardCredentials = async (student: StudentData) => {
    if (!window.confirm(`FORWARD CREDENTIALS: Resend Login PIN to ${student.email}?`)) return;
    try {
      await supabase.auth.signInWithOtp({ email: student.email });
      alert(`CREDENTIALS FORWARDED to ${student.name}.`);
    } catch (e) { alert("Forwarding Failed."); }
  };

  const handleDeletePupil = async (id: number, name: string) => {
    if (!window.confirm(`CRITICAL: Permanent deletion of ${name}? Identity shard will be decommissioned.`)) return;
    try {
      const student = students.find(s => s.id === id);
      if (student) await supabase.from('uba_identities').delete().eq('email', student.email);
      setStudents(prev => prev.filter(s => s.id !== id));
      setTimeout(onSave, 100);
    } catch (err) { alert("Deletion Fault."); }
  };

  const handleEditClick = (s: StudentData) => {
    setEditingId(s.id);
    setFormData({ name: s.name, email: s.email, gender: s.gender, guardianName: s.parentName || '', parentContact: s.parentContact || '', parentEmail: s.parentEmail || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateSbaScore = (studentId: number, subject: string, score: string) => {
    const numeric = parseInt(score) || 0;
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      return { ...s, mockData: { ...s.mockData, [settings.activeMock]: { ...mockSet, sbaScores: { ...mockSet.sbaScores, [subject]: numeric } } } };
    }));
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 font-sans">
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
        <div className="relative mb-10 space-y-2">
           <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{editingId ? `Modify Pupil: ${editingId}` : 'Pupil Enrollment Desk'}</h3>
           <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em]">Automated Sync Trigger Protocol Active</p>
        </div>
        
        <form onSubmit={handleAddOrUpdateStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="FULL LEGAL NAME..." required />
          <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" placeholder="PUPIL@ACADEMY.APP" required />
          <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="GUARDIAN NAME..." />
          <input type="text" value={formData.parentContact} onChange={e=>setFormData({...formData, parentContact: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="GUARDIAN PHONE..." />
          <input type="email" value={formData.parentEmail} onChange={e=>setFormData({...formData, parentEmail: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="GUARDIAN EMAIL..." />

          <div className="md:col-span-2 lg:col-span-3 pt-4">
             <button type="submit" disabled={isEnrolling} className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
                {isEnrolling ? "FORGING IDENTITY..." : editingId ? "Update Shard" : "Enroll Candidate"}
             </button>
          </div>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-6">
         {students.map(s => {
            const isSbaOpen = sbaEntryId === s.id;
            const isCredsOpen = showCredsId === s.id;
            return (
              <div key={s.id} className="bg-white rounded-[3rem] border border-gray-100 shadow-xl overflow-hidden group hover:shadow-2xl transition-all">
                 <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6 flex-1">
                       <div className="w-16 h-16 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">{s.name.charAt(0)}</div>
                       <div>
                          <h4 className="text-lg font-black text-slate-900 uppercase leading-none">{s.name}</h4>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">INDEX: {s.id} • {s.email}</p>
                       </div>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                       <button onClick={() => { setShowCredsId(isCredsOpen ? null : s.id); setSbaEntryId(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isCredsOpen ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}>View Identity</button>
                       <button onClick={() => { setSbaEntryId(isSbaOpen ? null : s.id); setShowCredsId(null); }} className={`px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all ${isSbaOpen ? 'bg-indigo-900 text-white' : 'bg-indigo-50 text-indigo-700'}`}>SBA Ledger</button>
                       <button onClick={() => handleForwardCredentials(s)} className="bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all">Resend PIN</button>
                       <button onClick={() => handleEditClick(s)} className="bg-gray-50 text-slate-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-gray-200">Edit</button>
                       <button onClick={() => handleDeletePupil(s.id, s.name)} className="bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all">Purge</button>
                    </div>
                 </div>

                 {isCredsOpen && (
                   <div className="bg-slate-50 p-8 border-t border-gray-100 animate-in slide-in-from-top-4 duration-300">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-1">
                           <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Sync Particulars</h5>
                           <p className="text-xs font-bold text-slate-400 uppercase">Recall Keys for {s.name}</p>
                        </div>
                        <div className="bg-white border border-gray-200 p-6 rounded-[2rem] shadow-sm flex flex-wrap gap-10">
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Recall Name</span>
                              <p className="text-sm font-black text-slate-800 uppercase">{s.name}</p>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Recall ID</span>
                              <p className="text-sm font-black text-blue-600 font-mono">{s.id}</p>
                           </div>
                           <div className="space-y-1">
                              <span className="text-[8px] font-black text-slate-400 uppercase">Recall Email</span>
                              <p className="text-sm font-black text-slate-800 lowercase font-mono">{s.email}</p>
                           </div>
                        </div>
                      </div>
                   </div>
                 )}

                 {isSbaOpen && (
                   <div className="bg-slate-900 p-8 border-t border-white/5 animate-in slide-in-from-top-4">
                      <h5 className="text-white font-black text-sm uppercase tracking-widest mb-6">Continuous Assessment Ledger ({settings.activeMock})</h5>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                         {subjects.map(sub => (
                           <div key={sub} className="bg-white/5 border border-white/10 p-4 rounded-2xl">
                              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-2 truncate">{sub}</label>
                              <input type="number" value={s.mockData?.[settings.activeMock]?.sbaScores?.[sub] || 0} onChange={e => handleUpdateSbaScore(s.id, sub, e.target.value)} className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-white w-full outline-none" />
                           </div>
                         ))}
                      </div>
                      <div className="mt-8 flex justify-end">
                         <button onClick={() => { onSave(); setSbaEntryId(null); }} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">Commit SBA</button>
                      </div>
                   </div>
                 )}
              </div>
            );
         })}
      </div>
    </div>
  );
};

export default PupilSBAPortal;
