import React, { useState } from 'react';
import { StudentData, GlobalSettings, MockScoreSet } from '../../types';

interface DataCleanupPortalProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  settings: GlobalSettings;
  onSave: () => void;
  subjects: string[];
}

const DataCleanupPortal: React.FC<DataCleanupPortalProps> = ({ students, setStudents, settings, onSave, subjects }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMock, setSelectedMock] = useState(settings.activeMock);
  const [targetSubject, setTargetSubject] = useState(subjects[0]);

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDeletePupil = (id: number, name: string) => {
    if (window.confirm(`PERMANENT ACTION: Completely remove ${name} from all academy records across all mock series? This cannot be undone.`)) {
      setStudents(prev => prev.filter(s => s.id !== id));
      setTimeout(onSave, 500);
    }
  };

  const handleClearMockForPupil = (id: number, name: string) => {
    if (window.confirm(`CLEAR SERIES: Wipe all scores and history for ${name} in ${selectedMock}? Identity will be preserved.`)) {
      setStudents(prev => prev.map(s => {
        if (s.id !== id) return s;
        const nextMockData = { ...(s.mockData || {}) };
        delete nextMockData[selectedMock];
        const nextSeriesHistory = { ...(s.seriesHistory || {}) };
        delete nextSeriesHistory[selectedMock];
        return { ...s, mockData: nextMockData, seriesHistory: nextSeriesHistory };
      }));
      setTimeout(onSave, 500);
    }
  };

  const handleClearSubjectForPupil = (id: number, name: string) => {
    if (window.confirm(`NULL SUBJECT: Reset ${targetSubject} results to zero for ${name} in ${selectedMock}?`)) {
      setStudents(prev => prev.map(s => {
        if (s.id !== id) return s;
        const mockSet: MockScoreSet = s.mockData?.[selectedMock] || { 
          scores: {}, sbaScores: {}, examSubScores: {}, facilitatorRemarks: {}, 
          observations: { facilitator: "", invigilator: "", examiner: "" }, 
          attendance: 0, conductRemark: "" 
        };
        
        const nextExamSubScores = { ...(mockSet.examSubScores || {}) };
        nextExamSubScores[targetSubject] = { sectionA: 0, sectionB: 0 };
        
        const nextScores = { ...(mockSet.scores || {}) };
        nextScores[targetSubject] = 0;

        const nextSbaScores = { ...(mockSet.sbaScores || {}) };
        nextSbaScores[targetSubject] = 0;

        return {
          ...s,
          mockData: {
            ...(s.mockData || {}),
            [selectedMock]: {
              ...mockSet,
              examSubScores: nextExamSubScores,
              scores: nextScores,
              sbaScores: nextSbaScores
            }
          }
        };
      }));
      setTimeout(onSave, 500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
      
      {/* Precision Forge Header */}
      <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative flex flex-col md:flex-row justify-between items-center gap-8">
           <div className="space-y-2 text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start">
                 <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                 <h2 className="text-3xl font-black uppercase tracking-tight">Administrative Data Forge</h2>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">High-Precision Record Maintenance Node</p>
           </div>
           <div className="flex flex-wrap justify-center gap-3">
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Target Series</label>
                 <select 
                    value={selectedMock} 
                    onChange={(e) => setSelectedMock(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-red-500/20"
                 >
                    {Array.from({ length: 10 }, (_, i) => `MOCK ${i+1}`).map(m => <option key={m} value={m} className="text-gray-900">{m}</option>)}
                 </select>
              </div>
              <div className="flex flex-col gap-1">
                 <label className="text-[8px] font-black text-slate-500 uppercase ml-2">Precision Subject</label>
                 <select 
                    value={targetSubject} 
                    onChange={(e) => setTargetSubject(e.target.value)}
                    className="bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-xs font-black outline-none focus:ring-4 focus:ring-red-500/20"
                 >
                    {subjects.map(s => <option key={s} value={s} className="text-gray-900">{s}</option>)}
                 </select>
              </div>
           </div>
        </div>
      </div>

      {/* Audit Search Bar */}
      <div className="relative">
         <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
         </div>
         <input 
           type="text" 
           placeholder="Locate candidate for record modification..." 
           value={searchTerm} 
           onChange={(e) => setSearchTerm(e.target.value)}
           className="w-full bg-white border-2 border-gray-100 rounded-[2rem] pl-16 pr-8 py-5 text-sm font-bold shadow-lg outline-none focus:ring-8 focus:ring-red-500/5 focus:border-red-200 transition-all"
         />
      </div>

      {/* Forge Matrix */}
      <div className="bg-white rounded-[3rem] border border-gray-100 shadow-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-gray-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
            <tr>
              <th className="px-10 py-6">Candidate Node</th>
              <th className="px-6 py-6 text-center">Data Snapshot</th>
              <th className="px-10 py-6 text-right">Forge Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredStudents.map(s => {
              const hasMock = !!s.mockData?.[selectedMock];
              const hasSubject = hasMock && (s.mockData[selectedMock].scores[targetSubject] !== undefined);
              
              return (
                <tr key={s.id} className="hover:bg-red-50/20 transition-colors group">
                  <td className="px-10 py-8">
                     <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-400 shadow-inner group-hover:bg-slate-900 group-hover:text-white transition-colors duration-500">
                          {s.id.toString().slice(-2)}
                        </div>
                        <div className="space-y-1">
                           <span className="text-sm font-black text-slate-900 uppercase leading-none block">{s.name}</span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Index: {s.id.toString().padStart(6, '0')}</span>
                        </div>
                     </div>
                  </td>
                  <td className="px-6 py-8">
                     <div className="flex flex-wrap justify-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${hasMock ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                           {selectedMock}: {hasMock ? 'LOADED' : 'VACANT'}
                        </span>
                        {hasMock && (
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase border ${hasSubject ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-100 text-gray-400 border-gray-200'}`}>
                             {targetSubject}: {hasSubject ? 'SYNCED' : 'EMPTY'}
                          </span>
                        )}
                     </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                     <div className="flex justify-end gap-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleClearSubjectForPupil(s.id, s.name)}
                          disabled={!hasSubject}
                          className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:border-red-500 hover:text-red-600 transition-all disabled:opacity-20"
                        >
                          Wipe {targetSubject.substring(0, 3)}
                        </button>
                        <button 
                          onClick={() => handleClearMockForPupil(s.id, s.name)}
                          disabled={!hasMock}
                          className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:border-red-500 hover:text-red-600 transition-all disabled:opacity-20"
                        >
                          Clear {selectedMock}
                        </button>
                        <button 
                          onClick={() => handleDeletePupil(s.id, s.name)}
                          className="bg-red-50 text-red-600 border-2 border-red-100 px-4 py-2 rounded-xl text-[9px] font-black uppercase hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
                        >
                          Purge Candidate
                        </button>
                     </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredStudents.length === 0 && (
           <div className="py-40 text-center opacity-20">
              <p className="font-black uppercase text-xs tracking-[0.5em]">No matching candidate profiles found</p>
           </div>
        )}
      </div>

      {/* Maintenance Compliance Footer */}
      <div className="bg-slate-100 rounded-[3rem] p-10 flex items-start gap-6 border-2 border-dashed border-slate-200">
         <div className="w-12 h-12 bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
         </div>
         <div className="space-y-2">
            <h4 className="text-xs font-black text-slate-900 uppercase">Operational Safety Protocol</h4>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
               Deletions executed in the Data Forge are pushed to the cloud registry immediately. Deleted scores cannot be recovered via standard interface protocols. Ensure local backups are exported before bulk purge operations.
            </p>
         </div>
      </div>

    </div>
  );
};

export default DataCleanupPortal;