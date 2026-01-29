
import React, { useState, useMemo } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, SchoolRegistryEntry } from '../../types';
import ReportCard from '../reports/ReportCard';
import PupilPerformanceSummary from './PupilPerformanceSummary';
import PupilGlobalMatrix from './PupilGlobalMatrix';
import PupilMeritView from './PupilMeritView';
import PupilBeceLedger from './PupilBeceLedger';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface PupilDashboardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  classAverageAggregate: number;
  totalEnrolled: number;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  globalRegistry: SchoolRegistryEntry[];
  onLogout: () => void;
}

const PupilDashboard: React.FC<PupilDashboardProps> = ({ 
  student, stats, settings, classAverageAggregate, totalEnrolled, onSettingChange, globalRegistry, onLogout 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'report' | 'merit' | 'progress' | 'bece' | 'detailed' | 'global'>('report');

  const globalRankInfo = useMemo(() => {
    const allPupils: { id: number; schoolId: string; agg: number }[] = [];
    globalRegistry.forEach(school => {
      if (!school.fullData?.students) return;
      const activeMock = school.fullData.settings.activeMock;
      school.fullData.students.forEach(s => {
        const history = s.seriesHistory?.[activeMock];
        if (history) allPupils.push({ id: s.id, schoolId: school.id, agg: history.aggregate });
      });
    });
    if (allPupils.length === 0) return { rank: '—', total: 0 };
    allPupils.sort((a, b) => a.agg - b.agg);
    const myIndex = allPupils.findIndex(p => p.id === student.id && p.schoolId === settings.schoolNumber);
    return { rank: myIndex > -1 ? myIndex + 1 : '—', total: allPupils.length };
  }, [globalRegistry, student.id, settings.schoolNumber]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      {/* PUPIL NAV BAR */}
      <nav className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-[100] no-print shadow-sm">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-900 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-lg">UBA</div>
            <div>
               <h1 className="text-sm font-black text-slate-900 uppercase">My Performance Dashboard</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Institutional Access Node Active</p>
            </div>
         </div>
         <div className="flex gap-2">
            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2">
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
               Print
            </button>
            <button onClick={onLogout} className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all shadow-sm">Logout</button>
         </div>
      </nav>

      <div className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full space-y-10">
        {/* BRANDING HEADER WITH PARTICULARS */}
        <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-gray-100">
           <ReportBrandingHeader 
             settings={settings} 
             onSettingChange={onSettingChange} 
             reportTitle={settings.examTitle} 
             subtitle={`AUTHORIZED ACCESS NODE: ${student.name}`} 
             isLandscape={true}
             readOnly={true} 
           />
           
           <div className="flex flex-col xl:flex-row justify-between items-center gap-8 mt-10">
              <div className="flex items-center gap-6 relative">
                  <div className="w-24 h-24 bg-blue-900 text-white rounded-[2rem] flex items-center justify-center font-black text-4xl shadow-2xl border-8 border-blue-50">
                    {student.name.charAt(0)}
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{student.name}</h2>
                    <div className="flex flex-wrap gap-3 items-center">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-4 py-1.5 rounded-full border border-gray-100">Index: {student.id}</span>
                        <div className="flex items-center gap-1.5 bg-indigo-900 text-white px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl">
                          Network Rank: #{globalRankInfo.rank}
                        </div>
                    </div>
                  </div>
              </div>
              <div className="flex bg-gray-100 p-1.5 rounded-3xl border border-gray-200 overflow-x-auto no-scrollbar max-w-full no-print">
                  {[
                    { id: 'report', label: 'My Report Card' },
                    { id: 'merit', label: 'My Merit Status' },
                    { id: 'bece', label: 'BECE Ledger' },
                    { id: 'progress', label: 'Progress Trend' },
                    { id: 'detailed', label: 'Detailed Breakdown' },
                    { id: 'global', label: 'Global Matrix' }
                  ].map(t => (
                    <button key={t.id} onClick={() => setActiveSubTab(t.id as any)} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase whitespace-nowrap transition-all ${activeSubTab === t.id ? 'bg-white text-blue-900 shadow-xl scale-105' : 'text-gray-400 hover:text-blue-900'}`}>
                      {t.label}
                    </button>
                  ))}
              </div>
           </div>
        </div>

        {/* TAB CONTENT AREA */}
        <div className="animate-in slide-in-from-bottom-6 duration-700">
           {activeSubTab === 'report' && (
             <div className="space-y-6">
               <ReportCard student={student} stats={stats} settings={settings} onSettingChange={onSettingChange} classAverageAggregate={classAverageAggregate} totalEnrolled={totalEnrolled} />
             </div>
           )}
           {activeSubTab === 'merit' && <PupilMeritView student={student} settings={settings} />}
           {activeSubTab === 'bece' && <PupilBeceLedger student={student} />}
           {activeSubTab === 'progress' && (
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12">
                <div className="text-center space-y-2"><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Academic Journey Tracking</h3><p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Multi-Series Aggregate Progression</p></div>
                <PupilPerformanceSummary student={student} mockSeriesNames={settings.committedMocks || []} type="aggregate" />
             </div>
           )}
           {activeSubTab === 'detailed' && (
             <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12">
                <div className="text-center space-y-2"><h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Sectional Competency Matrix</h3><p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4em]">Objective vs Theory Partitioning</p></div>
                <PupilPerformanceSummary student={student} mockSeriesNames={settings.committedMocks || []} type="technical" />
             </div>
           )}
           {activeSubTab === 'global' && <PupilGlobalMatrix registry={globalRegistry} student={student} />}
        </div>
      </div>
    </div>
  );
};

export default PupilDashboard;
