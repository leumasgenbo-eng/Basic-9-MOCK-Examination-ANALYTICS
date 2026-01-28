
import React, { useState, useMemo } from 'react';
import { StudentData, GlobalSettings } from '../../types';
import { CORE_SUBJECTS } from '../../constants';

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
  const [formData, setFormData] = useState({
    name: '',
    gender: 'M',
    guardianName: '',
    contact: '',
    email: ''
  });
  
  const generateIndividualKey = (prefix: string) => {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
    const newStudent: StudentData = {
      id: nextId,
      name: formData.name.toUpperCase(),
      gender: formData.gender,
      parentName: formData.guardianName.toUpperCase(),
      parentContact: formData.contact,
      parentEmail: formData.email.toLowerCase(),
      passkey: generateIndividualKey('P'),
      attendance: 0,
      scores: {},
      sbaScores: {},
      examSubScores: {},
      mockData: {}
    };
    
    setStudents([...students, newStudent]);
    setFormData({ name: '', gender: 'M', guardianName: '', contact: '', email: '' });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("CRITICAL: Decommission pupil from academy registry? This erases all associated data.")) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setTimeout(onSave, 500);
    }
  };

  const handleUpdateSbaScore = (studentId: number, subject: string, score: string) => {
    const val = Math.min(100, Math.max(0, parseInt(score) || 0));
    setStudents(prev => prev.map(s => {
      if (s.id !== studentId) return s;
      const nextSba = { ...(s.sbaScores || {}), [subject]: val };
      
      // Also update the active mock's SBA record for immediate availability in sheets
      const mockSet = s.mockData?.[settings.activeMock] || { scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, observations: { facilitator: "", invigilator: "", examiner: "" }, attendance: 0, conductRemark: "" };
      const updatedMockSba = { ...(mockSet.sbaScores || {}), [subject]: val };
      
      return { 
        ...s, 
        sbaScores: nextSba,
        mockData: {
          ...(s.mockData || {}),
          [settings.activeMock]: { ...mockSet, sbaScores: updatedMockSba }
        }
      };
    }));
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toString().includes(searchTerm)
  );

  const activeSbaStudent = students.find(s => s.id === editingSbaId);

  // Group subjects for better UI organization
  const coreList = subjects.filter(s => CORE_SUBJECTS.includes(s));
  const electiveList = subjects.filter(s => !CORE_SUBJECTS.includes(s));

  const completionStats = useMemo(() => {
    if (!activeSbaStudent) return { count: 0, percent: 0 };
    const count = Object.keys(activeSbaStudent.sbaScores || {}).length;
    return { count, percent: (count / subjects.length) * 100 };
  }, [activeSbaStudent, subjects]);

  // VIEW: SBA MATRIX FORGE (When editingSbaId is set)
  if (editingSbaId && activeSbaStudent) {
    return (
      <div className="space-y-8 animate-in slide-in-from-right-8 duration-500 pb-20">
         {/* TOP NAVIGATION BAR */}
         <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-4 rounded-3xl border border-white sticky top-4 z-[60] shadow-sm">
            <button onClick={() => setEditingSbaId(null)} className="flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Return to Registry
            </button>
            <div className="flex items-center gap-6">
               <div className="text-right hidden sm:block">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Mock Session</p>
                  <p className="text-sm font-black text-blue-900 uppercase">{settings.activeMock}</p>
               </div>
               <button onClick={() => { onSave(); setEditingSbaId(null); }} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-2xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">
                 Save & Return
               </button>
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* LEFT: PUPIL IDENTITY CARD */}
            <div className="xl:col-span-4 space-y-6">
               <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden h-fit">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full -mr-24 -mt-24 blur-3xl"></div>
                  <div className="relative space-y-8">
                     <div className="flex flex-col items-center text-center space-y-4">
                        <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center font-black text-4xl shadow-xl border-4 border-slate-800">
                           {activeSbaStudent.name.charAt(0)}
                        </div>
                        <div>
                           <h3 className="text-2xl font-black uppercase tracking-tight leading-none">{activeSbaStudent.name}</h3>
                           <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mt-3">Candidate Node: {activeSbaStudent.id}</p>
                        </div>
                     </div>

                     <div className="space-y-4 border-t border-white/5 pt-8">
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                           <span className="text-[8px] font-black text-slate-500 uppercase">Gender Identity</span>
                           <span className="text-xs font-black uppercase text-blue-400">{activeSbaStudent.gender === 'M' ? 'MALE' : 'FEMALE'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                           <span className="text-[8px] font-black text-slate-500 uppercase">Parent Identity</span>
                           <span className="text-xs font-black uppercase truncate max-w-[150px]">{activeSbaStudent.parentName || '---'}</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                           <span className="text-[8px] font-black text-slate-500 uppercase">Gate Passkey</span>
                           <code className="text-xs font-mono font-black text-emerald-400 tracking-widest">{activeSbaStudent.passkey}</code>
                        </div>
                     </div>

                     <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl space-y-4">
                        <div className="flex justify-between items-center">
                           <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest">SBA Completion</span>
                           <span className="text-2xl font-black text-white">{completionStats.count}/{subjects.length}</span>
                        </div>
                        <div className="h-3 bg-blue-900/50 rounded-full overflow-hidden p-0.5 border border-blue-400/20 shadow-inner">
                           <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_15px_rgba(255,255,255,0.5)]" style={{ width: `${completionStats.percent}%` }}></div>
                        </div>
                        <p className="text-[7px] text-blue-100 font-black uppercase tracking-widest text-center">Cloud Synchronization Active</p>
                     </div>
                  </div>
               </div>

               <div className="bg-blue-50 p-8 rounded-[2.5rem] border border-blue-100 flex items-start gap-4 shadow-sm">
                  <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0 border border-blue-100">
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[11px] font-black text-blue-900 uppercase">Matrix Logic Notice</p>
                     <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                       Continuous assessment scores (SBA) contribute 30% to the final institutional grade. These are mirrored to the cloud for all future mock series.
                     </p>
                  </div>
               </div>
            </div>

            {/* RIGHT: SUBJECT GRID MATRIX */}
            <div className="xl:col-span-8 space-y-10">
               {/* CORE DISCIPLINES SECTION */}
               <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4 px-4">
                     <div className="w-1.5 h-6 bg-blue-900 rounded-full"></div>
                     Core Academic Disciplines
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {coreList.map(sub => (
                        <div key={sub} className="bg-white border border-gray-100 p-8 rounded-[2.5rem] shadow-xl group hover:border-blue-300 transition-all flex justify-between items-center relative overflow-hidden">
                           <div className="absolute top-0 left-0 w-1 h-full bg-blue-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="space-y-1">
                              <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest block">{sub}</span>
                              <span className="text-[8px] font-black text-gray-300 uppercase">Core Mastery Module</span>
                           </div>
                           <div className="flex items-center gap-4">
                              <input 
                                type="number" 
                                value={activeSbaStudent.sbaScores?.[sub] || ''}
                                onChange={(e) => handleUpdateSbaScore(activeSbaStudent.id, sub, e.target.value)}
                                placeholder="0"
                                className="w-24 bg-gray-50 border-2 border-gray-100 rounded-2xl p-4 text-3xl font-black text-blue-900 outline-none focus:border-blue-400 transition-all text-center placeholder:text-gray-200"
                                max="100"
                              />
                              <div className="text-center w-10">
                                 <span className="text-[7px] font-black text-gray-400 uppercase block leading-none">Limit</span>
                                 <span className="text-xs font-black text-gray-400">100</span>
                              </div>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* ELECTIVE DISCIPLINES SECTION */}
               <div className="space-y-6">
                  <h4 className="text-sm font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4 px-4">
                     <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
                     Elective Specializations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {electiveList.map(sub => (
                        <div key={sub} className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-xl group hover:border-indigo-300 transition-all flex flex-col space-y-6 relative overflow-hidden">
                           <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-50/50 rounded-bl-full -mr-8 -mt-8"></div>
                           <div className="space-y-1">
                              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block truncate pr-4">{sub}</span>
                              <span className="text-[8px] font-black text-gray-300 uppercase">Specialization Node</span>
                           </div>
                           <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                              <input 
                                type="number" 
                                value={activeSbaStudent.sbaScores?.[sub] || ''}
                                onChange={(e) => handleUpdateSbaScore(activeSbaStudent.id, sub, e.target.value)}
                                placeholder="0"
                                className="w-20 bg-gray-50 border-2 border-gray-100 rounded-2xl p-3 text-2xl font-black text-indigo-900 outline-none focus:border-indigo-400 transition-all text-center placeholder:text-gray-200"
                                max="100"
                              />
                              <div className="h-1 flex-1 mx-4 bg-gray-50 rounded-full overflow-hidden">
                                 <div className="h-full bg-indigo-500 transition-all duration-700 shadow-[0_0_8px_rgba(99,102,241,0.4)]" style={{ width: `${activeSbaStudent.sbaScores?.[sub] || 0}%` }}></div>
                              </div>
                              <span className="text-[10px] font-mono font-black text-slate-300">{activeSbaStudent.sbaScores?.[sub] || 0}%</span>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      {/* Enrollment Protocol Form */}
      <section className="bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative mb-8">
           <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Institutional Enrollment</h3>
           <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Registering new candidate nodes to {settings.schoolName}</p>
        </div>

        <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Full Pupil Name</label>
            <input 
              type="text" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
              placeholder="SURNAME FIRST..." 
              required 
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Gender</label>
            <select 
              value={formData.gender} 
              onChange={e => setFormData({...formData, gender: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-black outline-none"
            >
              <option value="M">MALE</option>
              <option value="F">FEMALE</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guardian Name</label>
            <input 
              type="text" 
              value={formData.guardianName} 
              onChange={e => setFormData({...formData, guardianName: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
              placeholder="FULL NAME..." 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Contact</label>
            <input 
              type="text" 
              value={formData.contact} 
              onChange={e => setFormData({...formData, contact: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
              placeholder="PHONE..." 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Guardian Email</label>
            <input 
              type="email" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
              placeholder="EMAIL@DOMAIN.COM" 
            />
          </div>

          <div className="md:col-span-3 pt-4">
            <button type="submit" className="w-full bg-blue-900 text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95">
              Enroll Pupil into Academy
            </button>
          </div>
        </form>
      </section>

      {/* Database Search Hub */}
      <div className="relative group">
         <div className="absolute inset-y-0 left-8 flex items-center text-slate-300">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
         </div>
         <input 
           type="text" 
           placeholder="Search by name, ID, or index..." 
           value={searchTerm} 
           onChange={e => setSearchTerm(e.target.value)} 
           className="w-full pl-20 pr-10 py-6 border-2 border-gray-100 rounded-[2.5rem] text-sm font-bold bg-white shadow-xl outline-none focus:ring-8 focus:ring-blue-500/5 transition-all" 
         />
      </div>

      {/* Pupil Grid Matrix */}
      <div className="grid grid-cols-1 gap-6">
        {filtered.map((s, idx) => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-[3rem] p-10 shadow-lg hover:shadow-2xl transition-all duration-500 group overflow-hidden relative">
             <div className="absolute top-0 left-0 w-2 h-full bg-blue-900 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             
             <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-10">
                <div className="flex items-center gap-8">
                   <div className="w-20 h-20 bg-blue-50 text-blue-900 flex items-center justify-center rounded-[2rem] font-black text-2xl shadow-inner group-hover:bg-blue-900 group-hover:text-white transition-all duration-500 transform group-hover:rotate-6">
                      {(idx + 1).toString().padStart(2, '0')}
                   </div>
                   <div className="space-y-2">
                      <div className="flex items-center gap-3">
                         <h4 className="text-xl font-black text-gray-900 uppercase leading-none">{s.name}</h4>
                         <span className={`px-3 py-0.5 rounded-full text-[8px] font-black uppercase border ${s.gender === 'M' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-pink-50 text-pink-600 border-pink-100'}`}>
                            {s.gender === 'M' ? 'MALE' : 'FEMALE'}
                         </span>
                      </div>
                      <div className="flex flex-col gap-1">
                         <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Institutional Node Identity:</span>
                         <code className="text-[11px] font-mono font-black text-blue-900 tracking-tighter">INDEX: {settings.schoolNumber}/PUP-{s.id}</code>
                      </div>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 w-full xl:w-auto">
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Parent Name</span>
                      <p className="text-xs font-black text-slate-800 uppercase truncate">{s.parentName || "—"}</p>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Contact Phone</span>
                      <p className="text-xs font-black text-slate-800 font-mono">{s.parentContact || "—"}</p>
                   </div>
                   <div className="space-y-1 text-center">
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">SBA Completion</span>
                      <p className="text-lg font-black text-emerald-600">{Object.keys(s.sbaScores || {}).length} / {subjects.length}</p>
                   </div>
                </div>

                <div className="flex gap-3 w-full xl:w-auto">
                   <button 
                     onClick={() => setEditingSbaId(s.id)}
                     className="flex-1 xl:flex-none bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all"
                   >
                      Open SBA
                   </button>
                   <button 
                     onClick={() => handleDelete(s.id)}
                     className="bg-red-50 text-red-600 px-6 py-3.5 rounded-2xl font-black text-[10px] uppercase hover:bg-red-600 hover:text-white transition-all border border-red-100"
                   >
                      Delete
                   </button>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t border-gray-50 flex flex-wrap gap-10">
                <div className="flex items-center gap-3">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Gate Access Passkey:</span>
                   <code className="bg-slate-100 px-3 py-1 rounded-lg text-[10px] font-mono font-black text-slate-600">{s.passkey}</code>
                </div>
                <div className="flex items-center gap-3">
                   <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cloud Sync:</span>
                   <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-[9px] font-black text-emerald-600 uppercase">Handshake Active</span>
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
         <div className="py-40 text-center opacity-30 flex flex-col items-center gap-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <p className="font-black uppercase text-sm tracking-[0.5em]">No matching candidate profiles detected</p>
         </div>
      )}
    </div>
  );
};

export default PupilSBAPortal;
