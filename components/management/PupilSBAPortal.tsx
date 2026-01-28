
import React, { useState, useMemo } from 'react';
import { StudentData, GlobalSettings } from '../../types';
import { CORE_SUBJECTS } from '../../constants';
import { supabase } from '../../supabaseClient';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
  onSave: () => void;
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects, onSave }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSbaId, setEditingSbaId] = useState<number | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: 'M',
    guardianName: '',
    contact: ''
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;
    setIsEnrolling(true);

    try {
      const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
      
      // Trigger Sign In with OTP for the pupil/parent email to create auth node and send PIN
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: formData.email.toLowerCase(),
        options: {
          data: { 
            role: 'pupil', 
            hubId: settings.schoolNumber, 
            name: formData.name.toUpperCase(),
            studentId: nextId
          },
          shouldCreateUser: true
        }
      });

      if (otpError) throw otpError;

      const newStudent: StudentData = {
        id: nextId,
        name: formData.name.toUpperCase(),
        email: formData.email.toLowerCase(),
        gender: formData.gender,
        parentName: formData.guardianName.toUpperCase(),
        parentContact: formData.contact,
        attendance: 0,
        scores: {},
        sbaScores: {},
        examSubScores: {},
        mockData: {}
      };
      
      setStudents([...students, newStudent]);
      setFormData({ name: '', email: '', gender: 'M', guardianName: '', contact: '' });
      alert(`CANDIDATE ENROLLED: Access PIN sent to ${formData.email}`);
    } catch (err: any) {
      alert("Auth Gateway Error: " + err.message);
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUpdateSbaScore = (studentId: number, subject: string, score: string) => {
    const val = Math.min(100, Math.max(0, parseInt(score) || 0));
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const nextSba = { ...(s.sbaScores || {}), [subject]: val };
      return { ...s, sbaScores: nextSba };
    }));
  };

  const filtered = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const activeSbaStudent = students.find(s => s.id === editingSbaId);

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      
      {editingSbaId && activeSbaStudent ? (
        <div className="space-y-8 animate-in slide-in-from-right-4">
           <div className="flex items-center justify-between bg-blue-900 text-white p-6 rounded-3xl shadow-xl">
              <div>
                 <h3 className="text-xl font-black uppercase">{activeSbaStudent.name}</h3>
                 <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">SBA Matrix Node: {activeSbaStudent.id}</p>
              </div>
              <button onClick={() => setEditingSbaId(null)} className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase transition-all">Close Editor</button>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map(sub => (
                <div key={sub} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-lg hover:shadow-2xl transition-all group">
                   <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                         <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${CORE_SUBJECTS.includes(sub) ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                            {CORE_SUBJECTS.includes(sub) ? 'CORE' : 'ELECTIVE'}
                         </span>
                         <h4 className="text-[11px] font-black text-gray-900 uppercase">{sub}</h4>
                      </div>
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center font-mono font-black text-blue-900 text-sm">
                         {activeSbaStudent.sbaScores?.[sub] || 0}
                      </div>
                   </div>
                   <input 
                     type="number" 
                     value={activeSbaStudent.sbaScores?.[sub] || ''}
                     onChange={e => handleUpdateSbaScore(activeSbaStudent.id, sub, e.target.value)}
                     className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-2xl font-black text-center outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                     placeholder="0"
                     max="100"
                   />
                   <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${activeSbaStudent.sbaScores?.[sub] || 0}%` }}></div>
                   </div>
                </div>
              ))}
           </div>
           <div className="flex justify-center"><button onClick={onSave} className="bg-blue-900 text-white px-16 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl">Mirror Changes to Cloud</button></div>
        </div>
      ) : (
        <>
          <section className="bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-2xl">
            <h3 className="text-xl font-black text-slate-900 uppercase mb-8">Pupil Enrollment Registry</h3>
            <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <input type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="FULL NAME..." required />
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="PUPIL EMAIL (FOR LOGIN)..." required />
              <select value={formData.gender} onChange={e=>setFormData({...formData, gender: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select>
              <input type="text" value={formData.guardianName} onChange={e=>setFormData({...formData, guardianName: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="GUARDIAN NAME..." />
              <input type="text" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="CONTACT PHONE..." />
              <button type="submit" disabled={isEnrolling} className="bg-blue-900 text-white rounded-2xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all disabled:opacity-50">
                {isEnrolling ? "AUTHORIZING..." : "Enroll Candidate Node"}
              </button>
            </form>
          </section>

          <div className="grid grid-cols-1 gap-4">
             {filtered.map(s => (
                <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-md flex justify-between items-center group hover:border-blue-500 transition-all">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-blue-50 text-blue-900 rounded-2xl flex items-center justify-center font-black text-xl shadow-inner group-hover:bg-blue-900 group-hover:text-white transition-all">{s.name.charAt(0)}</div>
                      <div>
                         <h4 className="text-base font-black text-gray-900 uppercase leading-none">{s.name}</h4>
                         <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest">{s.email}</p>
                      </div>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={async () => {
                         await supabase.auth.signInWithOtp({ email: s.email });
                         alert("PIN REISSUED: Access token dispatched.");
                       }}
                       className="bg-gray-100 text-gray-600 px-6 py-3 rounded-xl font-black text-[10px] uppercase hover:bg-gray-200 transition-all"
                     >
                        Resend PIN
                     </button>
                     <button onClick={() => setEditingSbaId(s.id)} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-600 transition-all">Open Matrix</button>
                   </div>
                </div>
             ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PupilSBAPortal;
