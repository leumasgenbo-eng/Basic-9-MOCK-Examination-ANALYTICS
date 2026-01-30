
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
  loggedInUser?: { name: string; nodeId: string } | null;
}

const PupilDashboard: React.FC<PupilDashboardProps> = ({ 
  student, stats, settings, classAverageAggregate, totalEnrolled, onSettingChange, globalRegistry, onLogout, loggedInUser 
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'report' | 'merit' | 'bece' | 'journey' | 'detailed' | 'global'>('report');

  const navItems = [
    { id: 'report', label: 'My Report Card' },
    { id: 'merit', label: 'My Merit Status' },
    { id: 'bece', label: 'BECE Ledger' },
    { id: 'journey', label: 'Progress Trend' },
    { id: 'detailed', label: 'Detailed Breakdown' },
    { id: 'global', label: 'Global Matrix' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col p-4 md:p-12 print:p-0">
      {/* Handshake Identity Bar */}
      <div className="no-print w-full bg-slate-900 text-white rounded-3xl mb-8 p-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl border border-white/5">
         <div className="flex items-center gap-5">
            <div className="relative">
               <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.6)]"></div>
               <div className="w-3 h-3 bg-emerald-500 rounded-full absolute inset-0"></div>
            </div>
            <div className="space-y-0.5">
               <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em]">Active Handshake Identity Shard</p>
               <h2 className="text-sm font-black uppercase text-white">{student.name}</h2>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="text-right hidden md:block">
               <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest">System Node ID</p>
               <p className="text-[10px] font-mono font-black text-blue-300">{student.id.toString().padStart(6, '0')}</p>
            </div>
            <div className="h-8 w-px bg-white/10 hidden md:block"></div>
            <button onClick={onLogout} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-5 py-2 rounded-xl font-black text-[9px] uppercase border border-red-500/20 transition-all">Revoke Session</button>
         </div>
      </div>

      {/* 1. Portal Controls */}
      <div className="no-print flex justify-between items-center mb-10 border-b border-gray-200 pb-6">
         <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Candidate Dashboard</h1>
            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.4em]">Multi-Tenant Performance Matrix Active</p>
         </div>
         <button onClick={() => window.print()} className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all hover:bg-black active:scale-95">Print Node Data</button>
      </div>

      {/* 2. Institutional Branding Header - readOnly set to false to allow editing school particulars */}
      <div className="bg-white rounded-[3rem] p-10 shadow-2xl border border-gray-100 mb-10">
         <ReportBrandingHeader 
           settings={settings} 
           onSettingChange={onSettingChange} 
           reportTitle={settings.examTitle}
           subtitle={`CANDIDATE ATTAINMENT PROFILE: ${student.name}`}
           isLandscape={true}
           readOnly={false}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
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

      <div className="mt-16 pt-8 border-t border-gray-200 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest italic no-print">
         <span>Institutional Node Verified: {settings.schoolNumber}</span>
         <span>UNITED BAYLOR ACADEMY — SHARD AUTHENTICATOR v4.0.1</span>
      </div>
    </div>
  );
};

export default PupilDashboard;
