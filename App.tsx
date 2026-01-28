
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { calculateClassStatistics, processStudentData, generateFullDemoSuite } from './utils';
import { GlobalSettings, StudentData, StaffAssignment, SchoolRegistryEntry, ProcessedStudent } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

// Portal Components
import MasterSheet from './components/reports/MasterSheet';
import ReportCard from './components/reports/ReportCard';
import SeriesBroadSheet from './components/reports/SeriesBroadSheet';
import ManagementDesk from './components/management/ManagementDesk';
import SuperAdminPortal from './components/hq/SuperAdminPortal';
import LoginPortal from './components/auth/LoginPortal';
import SchoolRegistrationPortal from './components/auth/SchoolRegistrationPortal';
import PupilDashboard from './components/pupil/PupilDashboard';
import HomeDashboard from './components/management/HomeDashboard';
import DataCleanupPortal from './components/management/DataCleanupPortal';

import { SUBJECT_LIST, DEFAULT_THRESHOLDS, DEFAULT_NORMALIZATION, DEFAULT_CATEGORY_THRESHOLDS } from './constants';

const MOCK_SERIES = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);

const DEFAULT_SETTINGS: GlobalSettings = {
  schoolName: "UNITED BAYLOR ACADEMY",
  schoolAddress: "ACCRA DIGITAL CENTRE, GHANA",
  schoolNumber: "UBA-2026-7448", 
  schoolLogo: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AMXDA0YOT8bkgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmhuAAAAsklEQVR42u3XQQqAMAxE0X9P7n8pLhRBaS3idGbgvYVAKX0mSZI0SZIU47X2vPcZay1rrV+S6XUt9ba9621pLXWfP9PkiRJkiRpqgB7/X/f53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le578HAAB//6B+n9VvAAAAAElFTkSuQmCC", 
  examTitle: "2ND MOCK 2025 BROAD SHEET EXAMINATION",
  termInfo: "TERM 2",
  academicYear: "2024/2025",
  nextTermBegin: "2025-05-12",
  attendanceTotal: "60",
  startDate: "10-02-2025",
  endDate: "15-02-2025",
  headTeacherName: "DIRECTOR NAME",
  reportDate: new Date().toLocaleDateString(),
  schoolContact: "+233 24 350 4091",
  schoolEmail: "info@unitedbaylor.edu",
  gradingThresholds: DEFAULT_THRESHOLDS,
  categoryThresholds: DEFAULT_CATEGORY_THRESHOLDS,
  normalizationConfig: DEFAULT_NORMALIZATION,
  sbaConfig: { enabled: true, isLocked: false, sbaWeight: 30, examWeight: 70 },
  isConductLocked: false,
  securityPin: "0000",
  scoreEntryMetadata: { mockSeries: "MOCK 2", entryDate: new Date().toISOString().split('T')[0] },
  committedMocks: MOCK_SERIES,
  activeMock: "MOCK 1",
  resourcePortal: {},
  maxSectionA: 40,
  maxSectionB: 60,
  sortOrder: 'aggregate-asc',
  useTDistribution: true,
  reportTemplate: 'standard',
  adminRoleTitle: "Academy Director",
  registryRoleTitle: "Examination Registry"
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'home' | 'master' | 'reports' | 'management' | 'series' | 'pupil_hub' | 'cleanup'>('home');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFacilitator, setIsFacilitator] = useState(false);
  const [isPupil, setIsPupil] = useState(false);
  const [activeFacilitator, setActiveFacilitator] = useState<{ name: string; subject: string } | null>(null);
  const [activePupil, setActivePupil] = useState<ProcessedStudent | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [postRegistrationData, setPostRegistrationData] = useState<any>(null);
  
  const [globalRegistry, setGlobalRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentData[]>([]); 
  const [facilitators, setFacilitators] = useState<Record<string, StaffAssignment>>({});

  const [globalAd, setGlobalAd] = useState<string | null>(null);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchRegistry = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setNetworkError("Supabase configuration missing.");
      setIsInitializing(false);
      return;
    }
    try {
      const { data } = await supabase.from('uba_persistence').select('payload').like('id', 'registry_%');
      if (data) setGlobalRegistry(data.flatMap(r => r.payload));
    } catch (e) {} finally { setIsInitializing(false); }
  }, []);

  const fetchGlobalAd = useCallback(async () => {
    try {
      const { data } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_advertisements').maybeSingle();
      if (data?.payload?.message) setGlobalAd(data.payload.message);
    } catch (e) {}
  }, []);

  useEffect(() => { 
    fetchRegistry(); 
    fetchGlobalAd();
    const interval = setInterval(fetchGlobalAd, 30000); 
    return () => clearInterval(interval);
  }, [fetchRegistry, fetchGlobalAd]);

  const loadSchoolSession = async (hubId: string) => {
    if (!hubId) return;
    setIsInitializing(true);
    try {
      const { data } = await supabase.from('uba_persistence').select('id, payload').like('id', `${hubId}_%`);
      if (data) {
        data.forEach(row => {
          if (row.id === `${hubId}_settings`) setSettings(row.payload);
          if (row.id === `${hubId}_students`) setStudents(row.payload);
          if (row.id === `${hubId}_facilitators`) setFacilitators(row.payload);
        });
      }
    } catch (e) {} finally { setIsInitializing(false); }
  };

  const { stats, processedStudents, classAvgAggregate } = useMemo(() => {
    const s = calculateClassStatistics(students, settings);
    const staffNames: Record<string, string> = {};
    Object.keys(facilitators).forEach(k => { if (facilitators[k]) staffNames[k] = facilitators[k].name; });
    const processed = processStudentData(s, students, staffNames, settings);
    const avgAgg = processed.reduce((sum, st) => sum + st.bestSixAggregate, 0) / (processed.length || 1);
    return { stats: s, processedStudents: processed, classAvgAggregate: avgAgg };
  }, [students, facilitators, settings]);

  const handleSave = useCallback(async () => {
    const hubId = settings.schoolNumber;
    if (!hubId || !isAuthenticated) return;
    const ts = new Date().toISOString();
    await supabase.from('uba_persistence').upsert([
      { id: `${hubId}_settings`, payload: settings, last_updated: ts },
      { id: `${hubId}_students`, payload: students, last_updated: ts },
      { id: `${hubId}_facilitators`, payload: facilitators, last_updated: ts },
      { id: `registry_${hubId}`, payload: [{ id: hubId, name: settings.schoolName, studentCount: students.length, avgAggregate: classAvgAggregate, status: 'active', lastActivity: ts }], last_updated: ts }
    ]);
  }, [settings, students, facilitators, classAvgAggregate, isAuthenticated]);

  if (isInitializing) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">Syncing Hub Shards...</p>
    </div>
  );

  if (!isAuthenticated && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        {isRegistering ? (
          <SchoolRegistrationPortal settings={settings} onBulkUpdate={(u) => setSettings(p => ({...p, ...u}))} onSave={handleSave} onComplete={(d) => { setPostRegistrationData(d); setIsRegistering(false); }} onResetStudents={() => setStudents([])} onSwitchToLogin={() => setIsRegistering(false)} />
        ) : (
          <LoginPortal settings={settings} globalRegistry={globalRegistry} initialCredentials={postRegistrationData} onLoginSuccess={(id) => { loadSchoolSession(id).then(() => setIsAuthenticated(true)); }} onSuperAdminLogin={() => setIsSuperAdmin(true)} onFacilitatorLogin={(n, s, id) => { loadSchoolSession(id).then(() => { setIsFacilitator(true); setActiveFacilitator({ name: n, subject: s }); setIsAuthenticated(true); }); }} onPupilLogin={(id, hId) => { loadSchoolSession(hId).then(() => { const s = processedStudents.find(p => p.id === id); if(s){ setActivePupil(s); setIsPupil(true); setIsAuthenticated(true); setViewMode('pupil_hub'); } }); }} onSwitchToRegister={() => setIsRegistering(true)} />
        )}
      </div>
    );
  }

  if (isSuperAdmin) return <SuperAdminPortal onExit={() => setIsSuperAdmin(false)} onRemoteView={(id) => { loadSchoolSession(id); setIsSuperAdmin(false); setIsAuthenticated(true); }} />;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
      {globalAd && (
        <div className="no-print bg-blue-950 text-orange-400 py-2 overflow-hidden border-b border-orange-500/20 shadow-inner">
          <div className="whitespace-nowrap flex animate-[marquee_25s_linear_infinite]">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] px-10">[ GLOBAL BROADCAST ] : {globalAd} • {globalAd} • {globalAd}</span>
          </div>
        </div>
      )}
      <div className="no-print bg-blue-900 text-white p-4 sticky top-0 z-50 shadow-md flex flex-wrap justify-between items-center gap-4">
        <div className="flex bg-blue-800 rounded p-1 gap-1 text-[10px] font-black uppercase overflow-x-auto no-scrollbar">
          {!isPupil ? (
            <>
              <button onClick={() => setViewMode('home')} className={`px-4 py-2 rounded transition-all ${viewMode === 'home' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Home</button>
              <button onClick={() => setViewMode('master')} className={`px-4 py-2 rounded transition-all ${viewMode === 'master' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Sheets</button>
              <button onClick={() => setViewMode('series')} className={`px-4 py-2 rounded transition-all ${viewMode === 'series' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Tracker</button>
              <button onClick={() => setViewMode('cleanup')} className={`px-4 py-2 rounded transition-all ${viewMode === 'cleanup' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Data Forge</button>
              <button onClick={() => setViewMode('reports')} className={`px-4 py-2 rounded transition-all ${viewMode === 'reports' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Reports</button>
              <button onClick={() => setViewMode('management')} className={`px-4 py-2 rounded transition-all ${viewMode === 'management' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Mgmt Hub</button>
            </>
          ) : <button onClick={() => setViewMode('pupil_hub')} className="bg-white text-blue-900 px-6 py-2 rounded-xl font-black uppercase shadow-lg">My Performance Node</button>}
        </div>
        <div className="flex gap-2">
           {!isPupil && <button onClick={handleSave} className="bg-yellow-500 text-blue-900 px-5 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Sync Hub</button>}
           <button onClick={() => window.location.reload()} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg active:scale-95 transition-all">Logout</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {(() => {
          if (isPupil && activePupil && viewMode === 'pupil_hub') return <PupilDashboard student={activePupil} stats={stats} settings={settings} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} onSettingChange={(k,v) => setSettings(p=>({...p,[k]:v}))} globalRegistry={globalRegistry} />;
          switch (viewMode) {
            case 'home': return <HomeDashboard students={processedStudents} settings={settings} setViewMode={setViewMode} />;
            case 'master': return <MasterSheet students={processedStudents} stats={stats} settings={settings} onSettingChange={(k,v) => setSettings(p=>({...p,[k]:v}))} facilitators={facilitators} isFacilitator={isFacilitator} />;
            case 'series': return <SeriesBroadSheet students={students} settings={settings} onSettingChange={(k,v) => setSettings(p=>({...p,[k]:v}))} currentProcessed={processedStudents} />;
            case 'cleanup': return <DataCleanupPortal students={students} setStudents={setStudents} settings={settings} onSave={handleSave} subjects={SUBJECT_LIST} />;
            case 'reports': return (
              <div className="space-y-8">
                <input type="text" placeholder="Search pupils..." value={reportSearchTerm} onChange={(e) => setReportSearchTerm(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-gray-100 shadow-sm font-bold no-print outline-none focus:border-blue-300 transition-all" />
                {processedStudents.filter(s => s.name.toLowerCase().includes(reportSearchTerm.toLowerCase())).map(s => <ReportCard key={s.id} student={s} stats={stats} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} isFacilitator={isFacilitator} />)}
              </div>
            );
            case 'management': return <ManagementDesk students={students} setStudents={setStudents} facilitators={facilitators} setFacilitators={setFacilitators} subjects={SUBJECT_LIST} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} onBulkUpdate={(u)=>setSettings(p=>({...p,...u}))} onSave={handleSave} processedSnapshot={processedStudents} onLoadDummyData={()=>{}} onClearData={()=>{}} isFacilitator={isFacilitator} activeFacilitator={activeFacilitator} />;
            default: return <HomeDashboard students={processedStudents} settings={settings} setViewMode={setViewMode} />;
          }
        })()}
      </div>
      <style>{`@keyframes marquee { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
    </div>
  );
};

export default App;
