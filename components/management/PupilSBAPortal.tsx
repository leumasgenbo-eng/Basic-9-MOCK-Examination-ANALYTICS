
import React, { useState } from 'react';
import { StudentData, GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
  onSave: () => void;
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects, onSave }) => {
  const [formData, setFormData] = useState({ name: '', email: '', gender: 'M', guardianName: '', contact: '' });
  const [isEnrolling, setIsEnrolling] = useState(false);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setIsEnrolling(true);

    try {
      const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
      const targetEmail = formData.email.toLowerCase().trim();
      const targetName = formData.name.toUpperCase().trim();

      // 1. STORAGE PERSISTENCE: Mirror pupil identity for recall
      await supabase.from('uba_identities').upsert({
         email: targetEmail,
         full_name: targetName,
         node_id: nextId.toString(),
         hub_id: settings.schoolNumber,
         role: 'pupil'
      });
      
      // 2. TRIGGER AUTH OTP
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          data: { role: 'pupil', hubId: settings.schoolNumber, name: targetName, studentId: nextId },
          shouldCreateUser: true
        }
      });

      if (otpError) throw otpError;

      const newStudent: StudentData = {
        id: nextId, name: targetName, email: targetEmail, gender: formData.gender,
        parentName: formData.guardianName.toUpperCase(), parentContact: formData.contact,
        attendance: 0, scores: {}, sbaScores: {}, examSubScores: {}, mockData: {}
      };
      
      setStudents([...students, newStudent]);
      setFormData({ name: '', email: '', gender: 'M', guardianName: '', contact: '' });
      alert(`CANDIDATE ENROLLED: ID ${nextId} synchronised with storage.`);
    } catch (err: any) {
      alert("Candidate Storage Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl">
        <h3 className="text-xl font-black text-slate-900 uppercase mb-8">Candidate Ingestion Ledger</h3>
        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="FULL LEGAL NAME..." required />
          <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="PARTICIPANT EMAIL..." required />
          <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
          <button type="submit" disabled={isEnrolling} className="bg-blue-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all">
            {isEnrolling ? "MIRRORING..." : "Ingest Candidate Particulars"}
          </button>
        </form>
      </section>

      <div className="grid grid-cols-1 gap-4">
         {students.map(s => (
            <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex justify-between items-center">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner">{s.name.charAt(0)}</div>
                  <div>
                     <h4 className="text-base font-black text-gray-900 uppercase leading-none">{s.name}</h4>
                     <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">ID: {s.id} • {s.email}</p>
                  </div>
               </div>
               <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Participant Synced</span>
            </div>
         ))}
      </div>
    </div>
  );
};

export default PupilSBAPortal;
