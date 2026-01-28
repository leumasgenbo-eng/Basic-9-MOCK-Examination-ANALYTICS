import React, { useState } from 'react';
import { StudentData, GlobalSettings } from '../../types';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects }) => {
  const [searchTerm, setSearchTerm] = useState('');
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
    setFormData({
      name: '',
      gender: 'M',
      guardianName: '',
      contact: '',
      email: ''
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("CRITICAL: Decommission pupil from academy registry? This erases all associated data.")) {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.id.toString().includes(searchTerm)
  );

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
                   <div className="space-y-1">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Email Address</span>
                      <p className="text-xs font-bold text-blue-600 lowercase truncate">{s.parentEmail || "—"}</p>
                   </div>
                </div>

                <div className="flex gap-3 w-full xl:w-auto">
                   <button className="flex-1 xl:flex-none bg-blue-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-black transition-all">
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