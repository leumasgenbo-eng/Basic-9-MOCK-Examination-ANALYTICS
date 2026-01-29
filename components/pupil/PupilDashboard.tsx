
import React, { useState } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, SchoolRegistryEntry } from '../../types';
import ReportCard from '../reports/ReportCard';
import PupilPerformanceSummary from './PupilPerformanceSummary';
import PupilGlobalMatrix from './PupilGlobalMatrix';
import PupilMeritView from './PupilMeritView';
import PupilBeceLedger from './PupilBeceLedger';
import PupilAcademicJourney from './PupilAcademicJourney';
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

  const navItems = [
    { id: 'report', label: 'My Report Card' },
    { id: 'merit', label: 'Personal Merit Dashboard' },
    { id: 'bece', label: 'BECE Ledger' },
    { id: 'journey', label: 'Academic Journey' },
    { id: 'detailed', label: 'Detailed Breakdown' },
    { id: 'global', label: 'My Global Matrix' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col p-4 md:p-12 print:p-0">
      {/* 1. Portal Controls */}
      <div className="no-print flex justify-between items-center mb-10 border-b border-gray-200 pb-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">My Dashboard</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.4em]">Candidate Node • Authorized Access: {student.name}</p>
         </div>
         <div className="flex gap-3">
            <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all hover:bg-black active:scale-95">Print Node Data</button>
            <button onClick={onLogout} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">Logout</button>
         </div>
      </div>

      {/* 2. Institutional Branding Header */}
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-100 mb-10">
         <ReportBrandingHeader 
           settings={settings} 
           onSettingChange={onSettingChange} 
           reportTitle={settings.examTitle}
           subtitle={`CANDIDATE ATTAINMENT PROFILE: ${student.name}`}
           isLandscape={true}
           readOnly={true}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
        {/* Sub-Portal Navigation Side-rail */}
        <div className="lg:col-span-3 space-y-6 no-print">
           <div className="bg-blue-900 p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl">
              <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center font-black text-4xl mx-auto border border-white/20">
                {student.name.charAt(0)}
              </div>
              <div className="text-center space-y-1">
                 <h4 className="text-sm font-black uppercase tracking-widest">{student.name}</h4>
                 <p className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">Index: {student.id}</p>
              </div>
           </div>

           <div className="flex flex-col gap-2">
              {navItems.map(t => (
                <button 
                   key={t.id} 
                   onClick={() => setActiveSubTab(t.id as any)} 
                   className={`text-left px-8 py-5 rounded-2xl text-[10px] font-black uppercase transition-all border ${activeSubTab === t.id ? 'bg-blue-900 text-white border-blue-900 shadow-xl scale-[1.03]' : 'bg-white text-gray-400 border-gray-100 hover:text-blue-900 hover:bg-blue-50'}`}
                >
                   {t.label}
                </button>
              ))}
           </div>
        </div>

        {/* Dynamic Sub-Portal Matrix Area */}
        <div className="lg:col-span-9">
           <div className="animate-in slide-in-from-bottom-8 duration-700">
              {activeSubTab === 'report' && (
                <div className="space-y-8">
                   <div className="bg-slate-900 text-white p-6 rounded-[2rem] text-center font-black uppercase text-[10px] tracking-[0.6em] no-print">Individual Mock Series Report Portal</div>
                   <ReportCard student={student} stats={stats} settings={settings} onSettingChange={onSettingChange} classAverageAggregate={classAverageAggregate} totalEnrolled={totalEnrolled} />
                </div>
              )}
              {activeSubTab === 'merit' && <PupilMeritView student={student} settings={settings} />}
              {activeSubTab === 'bece' && <PupilBeceLedger student={student} />}
              {activeSubTab === 'journey' && <PupilAcademicJourney student={student} mockSeriesNames={settings.committedMocks || []} />}
              {activeSubTab === 'detailed' && <PupilPerformanceSummary student={student} mockSeriesNames={settings.committedMocks || []} type="technical" />}
              {activeSubTab === 'global' && <PupilGlobalMatrix registry={globalRegistry} student={student} />}
           </div>
        </div>
      </div>

      {/* Persistence Layer Validation */}
      <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic no-print">
         <span>Institutional Node Verified: {settings.schoolNumber}</span>
         <span>SS-map ACADEMY — SHARD AUTHENTICATOR v4.0.1</span>
      </div>
    </div>
  );
};

export default PupilDashboard;
