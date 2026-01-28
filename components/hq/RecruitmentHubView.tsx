import React, { useState, useMemo } from 'react';
import { SchoolRegistryEntry, StaffAssignment } from '../../types';

interface RecruitmentHubViewProps {
  registry: SchoolRegistryEntry[];
  onLogAction: (action: string, target: string, details: string) => void;
}

type ExternalRole = 'EXAMINER' | 'INVIGILATOR' | 'CHIEF INVIGILATOR' | 'CHIEF EXAMINER';

interface ContractRecord {
  staffId: string;
  schoolId: string;
  name: string;
  role: ExternalRole;
  status: 'PENDING' | 'APPROVED' | 'ACTIVE';
  date: string;
}

const RecruitmentHubView: React.FC<RecruitmentHubViewProps> = ({ registry, onLogAction }) => {
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Extract all staff from registry
  const allStaff = useMemo(() => {
    const list: { staff: StaffAssignment, schoolName: string, schoolId: string }[] = [];
    registry.forEach(school => {
      if (school.fullData?.facilitators) {
        Object.values(school.fullData.facilitators).forEach((staff) => {
          list.push({ staff: staff as StaffAssignment, schoolName: school.name, schoolId: school.id });
        });
      }
    });
    return list;
  }, [registry]);

  const filteredStaff = allStaff.filter(s => 
    s.staff.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.schoolName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEnlist = (staff: StaffAssignment, schoolId: string, role: ExternalRole) => {
    const staffId = `${schoolId}/${staff.enrolledId}`;
    if (contracts.some(c => c.staffId === staffId && c.role === role)) {
      alert("Staff already enlisted for this external role.");
      return;
    }

    const newContract: ContractRecord = {
      staffId,
      schoolId,
      name: staff.name,
      role,
      status: 'PENDING',
      date: new Date().toLocaleDateString()
    };

    setContracts([...contracts, newContract]);
    onLogAction("CONTRACT_ENLISTMENT", staffId, `Enlisted as ${role} for external support examine work.`);
  };

  const handleApprove = (staffId: string, role: string) => {
    setContracts(prev => prev.map(c => 
      (c.staffId === staffId && c.role === role) ? { ...c, status: 'APPROVED' } : c
    ));
    onLogAction("CONTRACT_APPROVAL", staffId, `Approved external ${role} contract.`);
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col">
      <div className="p-8 border-b border-slate-800 bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-2">
           <h2 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
              Recruitment Hub
           </h2>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">External Support Examine Work Rerating</p>
        </div>
        <div className="relative w-full md:w-96">
           <input 
             type="text" 
             placeholder="Search network facilitators..." 
             value={searchTerm} 
             onChange={(e) => setSearchTerm(e.target.value)} 
             className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-6 pr-6 py-4 text-xs font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/20 transition-all"
           />
        </div>
      </div>

      <div className="flex-1 overflow-x-auto">
        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Staff Discovery List */}
          <div className="space-y-4">
             <h3 className="text-xs font-black uppercase text-blue-400 tracking-widest px-2">Network Faculty Discovery</h3>
             <div className="bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden max-h-[500px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black sticky top-0">
                      <tr>
                         <th className="px-6 py-4">Identity</th>
                         <th className="px-6 py-4">Institution</th>
                         <th className="px-6 py-4 text-right">Award Contract</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-900">
                      {filteredStaff.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                           <td className="px-6 py-5">
                              <div className="flex flex-col">
                                 <span className="font-black text-white text-xs uppercase">{s.staff.name}</span>
                                 <span className="text-[8px] text-slate-500 font-mono">{s.staff.role} / {s.staff.enrolledId}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className="text-[10px] font-black text-slate-400 uppercase">{s.schoolName}</span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2">
                                 {['EXAMINER', 'INVIGILATOR'].map((r) => (
                                   <button 
                                     key={r}
                                     onClick={() => handleEnlist(s.staff, s.schoolId, r as ExternalRole)}
                                     className="bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all"
                                   >
                                     {r}
                                   </button>
                                 ))}
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>

          {/* External Contracts Ledger */}
          <div className="space-y-4">
             <h3 className="text-xs font-black uppercase text-emerald-400 tracking-widest px-2">Active Recruits Ledger</h3>
             <div className="bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden max-h-[500px] overflow-y-auto no-scrollbar">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-slate-900 text-slate-500 uppercase text-[8px] font-black sticky top-0">
                      <tr>
                         <th className="px-6 py-4">Recruit</th>
                         <th className="px-6 py-4">Designation</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Gate</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-900">
                      {contracts.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-900/50 transition-colors">
                           <td className="px-6 py-5">
                              <div className="flex flex-col">
                                 <span className="font-black text-white text-xs uppercase">{c.name}</span>
                                 <span className="text-[8px] text-slate-500 font-mono">{c.staffId}</span>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[8px] font-black uppercase">{c.role}</span>
                           </td>
                           <td className="px-6 py-5">
                              <span className={`text-[8px] font-black uppercase ${c.status === 'APPROVED' ? 'text-emerald-500' : 'text-yellow-500 animate-pulse'}`}>{c.status}</span>
                           </td>
                           <td className="px-6 py-5 text-right">
                              {c.status === 'PENDING' && (
                                <button 
                                  onClick={() => handleApprove(c.staffId, c.role)}
                                  className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[8px] font-black uppercase shadow-lg active:scale-95 transition-all"
                                >
                                  Approve Contract
                                </button>
                              )}
                           </td>
                        </tr>
                      ))}
                      {contracts.length === 0 && (
                        <tr>
                           <td colSpan={4} className="py-20 text-center text-slate-700 font-black uppercase text-[10px] tracking-widest italic">Awaiting Recruit Enlistment</td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      </div>

      {/* Synchronization Notice for Recruits */}
      <div className="p-8 bg-slate-950/80 backdrop-blur-md border-t border-slate-800">
         <div className="max-w-4xl mx-auto flex items-start gap-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </div>
            <div className="space-y-2">
               <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest">Network Synchronization Notice</h4>
               <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">
                  Staff invigilation registers are encrypted and mirrored across all network nodes. Data entry on one device will automatically propagate to the Master Timetable and Duty Roster on any other authorized institutional terminal.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default RecruitmentHubView;