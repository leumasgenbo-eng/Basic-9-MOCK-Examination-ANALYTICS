
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
  const [activeSubTab, setActiveSubTab] = useState<'report' | 'merit' | 'bece' | 'journey' | 'detailed' | 'global'>('report');

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col p-6 md:p-12 print:p-0">
      {/* Dashboard Top Controls */}
      <div className="no-print flex justify-between items-center mb-10 border-b border-gray-200 pb-6">
         <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">My Dashboard</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Access Node Active</p>
         </div>
         <div className="flex gap-3">
            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2">Print</button>
            <button onClick={onLogout} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">Logout</button>
         </div>
      </div>

      {/* Official Branding Header - Matches Sample */}
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-100 mb-10">
         <ReportBrandingHeader 
           settings={settings} 
           onSettingChange={onSettingChange} 
           reportTitle={settings.examTitle}
           subtitle={`AUTHORIZED ACCESS NODE: ${student.name}`}
           isLandscape={true}
           readOnly={true}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12 flex-1">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 text-center space-y-6 shadow-xl">
              <div className="w-32 h-32 bg-blue-900 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl mx-auto shadow-2xl border-8 border-slate-50">
                {student.name.charAt(0)}
              </div>
              <div className="space-y-1">
                 <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{student.name}</h4>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Index: {student.id}</p>
                 <div className="bg-indigo-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl mt-4 inline-block">
                    Global Rank: #{student.rank} / {totalEnrolled}
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-2 no-print">
              {[
                { id: 'report', label: 'My Report Card' },
                { id: 'merit', label: 'My Merit Status' },
                { id: 'bece', label: 'BECE Ledger' },
                { id: 'journey', label: 'Progress Trend' },
                { id: 'detailed', label: 'Detailed Breakdown' },
                { id: 'global', label: 'Global Matrix' }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveSubTab(t.id as any)} className={`text-left px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${activeSubTab === t.id ? 'bg-blue-900 text-white shadow-xl scale-105' : 'bg-white text-gray-400 hover:text-blue-900 border border-gray-100'}`}>
                   {t.label}
                </button>
              ))}
           </div>
        </div>

        {/* Content Portal Area */}
        <div className="lg:col-span-3">
           <div className="animate-in slide-in-from-bottom-6 duration-700">
              {activeSubTab === 'report' && (
                <div className="space-y-8">
                   <div className="bg-blue-900 text-white p-6 rounded-[2rem] text-center font-black uppercase text-[10px] tracking-[0.5em] no-print">Individual Pupil Attainment Report Active</div>
                   <ReportCard student={student} stats={stats} settings={settings} onSettingChange={onSettingChange} classAverageAggregate={classAverageAggregate} totalEnrolled={totalEnrolled} />
                </div>
              )}
              {activeSubTab === 'merit' && <PupilMeritView student={student} settings={settings} />}
              {activeSubTab === 'bece' && <PupilBeceLedger student={student} />}
              {activeSubTab === 'journey' && (
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

      <div className="mt-20 pt-10 border-t border-gray-100 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic no-print">
         <span>Institutional Node: {settings.schoolNumber}</span>
         <span>UNITED BAYLOR ACADEMY — PERSISTENCE LAYER v4.0</span>
      </div>
    </div>
  );
};

export default PupilDashboard;
