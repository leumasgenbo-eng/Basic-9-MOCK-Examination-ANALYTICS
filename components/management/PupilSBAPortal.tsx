import React, { useState, useRef } from 'react';
import { StudentData, GlobalSettings, MockScoreSet } from '../../types';

interface PupilSBAPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  subjects: string[];
}

const PupilSBAPortal: React.FC<PupilSBAPortalProps> = ({ students, setStudents, settings, subjects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState('M');
  
  const generateIndividualKey = (prefix: string) => {
    return `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    
    const nextId = students.length > 0 ? Math.max(...students.map(s => s.id)) + 1 : 101;
    const newStudent: StudentData = {
      id: nextId,
      name: newName.toUpperCase(),
      gender: newGender,
      parentContact: '',
      passkey: generateIndividualKey('P'),
      attendance: 0,
      scores: {},
      sbaScores: {},
      examSubScores: {},
      mockData: {}
    };
    setStudents([...students, newStudent]);
    setNewName('');
  };

  const filtered = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <form onSubmit={handleAddStudent} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
        <div className="md:col-span-2 space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Candidate Full Name</label><input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Gender</label><select value={newGender} onChange={e => setNewGender(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-xs font-black outline-none"><option value="M">MALE</option><option value="F">FEMALE</option></select></div>
        <button type="submit" className="bg-blue-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg">Enroll Candidate</button>
      </form>

      <div className="relative group">
         <div className="absolute inset-y-0 left-6 flex items-center text-slate-300"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
         <input type="text" placeholder="Search pupils..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-16 pr-8 py-5 border border-gray-100 rounded-3xl text-sm font-bold bg-white shadow-sm outline-none focus:ring-8 focus:ring-blue-500/5 transition-all" />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filtered.map(s => (
          <div key={s.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-2xl transition-all duration-500 group">
             <div className="flex flex-col xl:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-blue-50 text-blue-900 flex items-center justify-center rounded-2xl font-black text-xl shadow-inner group-hover:bg-blue-900 group-hover:text-white transition-colors">
                      {s.id.toString().slice(-2)}
                   </div>
                   <div className="space-y-1">
                      <h4 className="text-lg font-black text-gray-900 uppercase leading-none">{s.name}</h4>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Regional ID Node</p>
                   </div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                   <div className="bg-slate-50 border border-dashed border-slate-200 p-4 rounded-2xl flex flex-col items-center">
                      <span className="text-[8px] font-black text-slate-500 uppercase block mb-1">Hub UID</span>
                      <code className="text-xs font-mono font-black text-blue-900">{settings.schoolNumber}/PUP-{s.id}</code>
                   </div>
                   <div className="bg-emerald-50 border border-dashed border-emerald-200 p-4 rounded-2xl flex flex-col items-center">
                      <span className="text-[8px] font-black text-emerald-500 uppercase block mb-1">Passkey</span>
                      <code className="text-xs font-mono font-black text-emerald-900">{s.passkey}</code>
                   </div>
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PupilSBAPortal;