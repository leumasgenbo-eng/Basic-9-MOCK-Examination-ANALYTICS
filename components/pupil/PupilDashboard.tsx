
import React, { useState, useMemo } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, SchoolRegistryEntry } from '../../types';
import ReportCard from '../reports/ReportCard';
import PupilPerformanceSummary from './PupilPerformanceSummary';
import PupilGlobalMatrix from './PupilGlobalMatrix';
import PupilMeritView from './PupilMeritView';
import PupilBeceLedger from './PupilBeceLedger';
import EditableField from '../shared/EditableField';

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
    <div className="min-h-screen bg-white font-sans flex flex-col p-6 md:p-12 print:p-0">
      {/* 1. Dashboard Controls */}
      <div className="no-print flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
         <div className="space-y-1">
            <h1 className="text-2xl font-black text-slate-900 uppercase">My Dashboard</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Access Node Active</p>
         </div>
         <div className="flex gap-3">
            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase transition-all flex items-center gap-2">Print</button>
            <button onClick={onLogout} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all active:scale-95">Logout</button>
         </div>
      </div>

      {/* 2. Institutional Branding (Editable Particulars) */}
      <div className="border-b-[8px] border-double border-blue-900 pb-8 mb-10 relative">
        <div className="absolute top-0 left-0 w-24 h-24 flex items-center justify-center">
           {settings.schoolLogo ? <img src={settings.schoolLogo} className="max-w-full max-h-full object-contain" alt="Logo" /> : <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">UBA</div>}
        </div>
        <div className="text-center px-24 space-y-2">
           <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] mb-1">HUB ID: {settings.schoolNumber || "UBA-2026-7448"}</div>
           <h2 className="text-4xl font-black text-blue-950 uppercase tracking-tighter leading-none">
              <EditableField value={settings.schoolName || "UNITED BAYLOR ACADEMY"} onChange={(v) => onSettingChange('schoolName', v)} className="text-center w-full border-none" />
           </h2>
           <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em]">
              <EditableField value={settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"} onChange={(v) => onSettingChange('schoolAddress', v)} className="text-center w-full border-none" />
           </p>
           <div className="flex justify-center gap-8 text-[10px] font-black text-blue-900 uppercase tracking-widest pt-4 border-t border-gray-100 mt-4">
              <div className="flex gap-2"><span className="text-gray-400">TEL:</span><EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} className="border-none" /></div>
              <div className="flex gap-2"><span className="text-gray-400">EMAIL:</span><EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} className="border-none lowercase font-mono" /></div>
           </div>
        </div>
      </div>

      {/* 3. Session Info Header */}
      <div className="bg-blue-50/50 py-8 border-y-2 border-blue-900/10 mb-8 text-center relative group overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(30,58,138,0.02),transparent)] pointer-events-none"></div>
        <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tight">
           <EditableField value={settings.examTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full border-none" />
        </h3>
        <p className="text-[10px] font-black text-blue-950/40 tracking-[0.5em] uppercase mt-2">
           AUTHORIZED ACCESS NODE: {student.name}
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12 flex-1">
        {/* Profile Sidebar */}
        <div className="xl:col-span-1 space-y-10">
           <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 text-center space-y-6">
              <div className="w-32 h-32 bg-blue-900 text-white rounded-[2.5rem] flex items-center justify-center font-black text-5xl mx-auto shadow-2xl border-8 border-white">
                {student.name.charAt(0)}
              </div>
              <div className="space-y-1">
                 <h4 className="text-xl font-black text-slate-900 uppercase tracking-tight">{student.name}</h4>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Index: {student.id}</p>
              </div>
              <div className="bg-indigo-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                 Global Rank: #{globalRankInfo.rank} / {globalRankInfo.total}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase text-gray-500 pt-6 border-t border-gray-200">
                 <div className="text-left">TERM: <span className="text-blue-600">{settings.termInfo}</span></div>
                 <div className="text-left">SERIES: <span className="text-blue-600">{settings.activeMock}</span></div>
                 <div className="text-left md:col-span-2">YEAR: <span className="text-blue-600">{settings.academicYear}</span></div>
              </div>
           </div>

           <div className="flex flex-col gap-2 no-print">
              {[
                { id: 'report', label: 'My Report Card' },
                { id: 'merit', label: 'My Merit Status' },
                { id: 'bece', label: 'BECE Ledger' },
                { id: 'progress', label: 'Progress Trend' },
                { id: 'detailed', label: 'Detailed Breakdown' },
                { id: 'global', label: 'Global Matrix' }
              ].map(t => (
                <button key={t.id} onClick={() => setActiveSubTab(t.id as any)} className={`text-left px-8 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${activeSubTab === t.id ? 'bg-blue-900 text-white shadow-xl scale-105' : 'bg-gray-50 text-gray-400 hover:text-blue-900 hover:bg-gray-100'}`}>
                   {t.label}
                </button>
              ))}
           </div>
        </div>

        {/* Content Area */}
        <div className="xl:col-span-3">
           <div className="animate-in slide-in-from-bottom-6 duration-700">
              {activeSubTab === 'report' && (
                <div className="space-y-12">
                   <div className="bg-blue-900 text-white p-6 rounded-[2rem] text-center font-black uppercase text-[10px] tracking-[0.5em] no-print">Candidate Attainment Visualization Active</div>
                   <ReportCard student={student} stats={stats} settings={settings} onSettingChange={onSettingChange} classAverageAggregate={classAverageAggregate} totalEnrolled={totalEnrolled} />
                </div>
              )}
              {activeSubTab === 'merit' && <PupilMeritView student={student} settings={settings} />}
              {activeSubTab === 'bece' && <PupilBeceLedger student={student} />}
              {activeSubTab === 'progress' && <PupilPerformanceSummary student={student} mockSeriesNames={settings.committedMocks || []} type="aggregate" />}
              {activeSubTab === 'detailed' && <PupilPerformanceSummary student={student} mockSeriesNames={settings.committedMocks || []} type="technical" />}
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
