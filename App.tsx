
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { calculateClassStatistics, processStudentData } from './utils';
import { GlobalSettings, StudentData, StaffAssignment, SchoolRegistryEntry, ProcessedStudent } from './types';
import { supabase } from './supabaseClient';

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

import { SUBJECT_LIST, DEFAULT_THRESHOLDS, DEFAULT_NORMALIZATION, DEFAULT_CATEGORY_THRESHOLDS } from './constants';

const DEFAULT_SETTINGS: GlobalSettings = {
  schoolName: "UNITED BAYLOR ACADEMY",
  schoolMotto: "EXCELLENCE IN KNOWLEDGE AND CHARACTER",
  schoolWebsite: "www.unitedbaylor.edu",
  schoolAddress: "ACCRA DIGITAL CENTRE, GHANA",
  schoolNumber: "", 
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
  committedMocks: ["MOCK 1", "MOCK 2"],
  activeMock: "MOCK 1",
  resourcePortal: {},
  maxSectionA: 40,
  maxSectionB: 60,
  sortOrder: 'aggregate-asc',
  useTDistribution: true,
  reportTemplate: 'standard',
  adminRoleTitle: "Academy Director",
  registryRoleTitle: "Examination Registry",
  accessCode: "",
  staffAccessCode: "",
  pupilAccessCode: "",
  enrollmentDate: ""
};

const App: React.FC = () => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [viewMode, setViewMode] = useState<'home' | 'master' | 'reports' | 'management' | 'series'>('home');
  const [reportSearchTerm, setReportSearchTerm] = useState('');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false); 
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isFacilitator, setIsFacilitator] = useState(false);
  const [isPupil, setIsPupil] = useState(false);
  const [activeFacilitator, setActiveFacilitator] = useState<{ name: string; subject: string } | null>(null);
  const [activePupil, setActivePupil] = useState<ProcessedStudent | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [globalRegistry, setGlobalRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [students, setStudents] = useState<StudentData[]>([]); 
  const [facilitators, setFacilitators] = useState<Record<string, StaffAssignment>>({});

  const loadSchoolSession = useCallback(async (hubId: string) => {
    if (!hubId) return null;
    const { data } = await supabase.from('uba_persistence').select('id, payload').eq('hub_id', hubId);
    if (data && data.length > 0) {
      let s = { ...DEFAULT_SETTINGS }, st: StudentData[] = [], f: Record<string, StaffAssignment> = {};
      data.forEach(row => {
        if (row.id === `${hubId}_settings`) s = row.payload;
        if (row.id === `${hubId}_students`) st = row.payload;
        if (row.id === `${hubId}_facilitators`) f = row.payload;
      });
      setSettings(s); setStudents(st); setFacilitators(f);
      return { settings: s, students: st, facilitators: f };
    }
    return null;
  }, []);

  const resolvePupilPortal = useCallback((studentId: number, studentList: StudentData[], currentSettings: GlobalSettings) => {
    const statsObj = calculateClassStatistics(studentList, currentSettings);
    const processed = processStudentData(statsObj, studentList, {}, currentSettings);
    const pupil = processed.find(p => p.id === studentId);
    if (pupil) { setActivePupil(pupil); setIsPupil(true); }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const { data: regData } = await supabase.from('uba_persistence').select('payload').like('id', 'registry_%');
      if (regData) setGlobalRegistry(regData.flatMap(r => r.payload || []));

      if (session) {
        const metadata = session.user.user_metadata || {};
        const hubId = metadata.hubId;
        const role = metadata.role;
        const result = await loadSchoolSession(hubId);
        setIsAuthenticated(true);
        if (role === 'facilitator') {
          setIsFacilitator(true);
          setActiveFacilitator({ name: metadata.name || "STAFF", subject: metadata.subject || "GENERAL" });
        } else if (role === 'pupil' && result) {
          resolvePupilPortal(metadata.studentId, result.students, result.settings);
        } else if (session.user.email === 'leumasgenbo4@gmail.com') {
          setIsSuperAdmin(true);
        }
      }
      setIsInitializing(false);
    };
    checkSession();
  }, [loadSchoolSession, resolvePupilPortal]);

  const { stats, processedStudents, classAvgAggregate } = useMemo(() => {
    const s = calculateClassStatistics(students, settings);
    const staffNames: Record<string, string> = {};
    Object.keys(facilitators || {}).forEach(k => { if (facilitators[k].name && facilitators[k].taughtSubject) staffNames[facilitators[k].taughtSubject!] = facilitators[k].name; });
    const processed = processStudentData(s, students, staffNames, settings);
    const avgAgg = processed.reduce((sum, st) => sum + (st.bestSixAggregate || 0), 0) / (processed.length || 1);
    return { stats: s, processedStudents: processed, classAvgAggregate: avgAgg };
  }, [students, facilitators, settings]);

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };

  if (isInitializing) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Shard Handshake...</p></div>;

  if (!isAuthenticated && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        {isRegistering ? (
          <SchoolRegistrationPortal settings={settings} onBulkUpdate={(u) => setSettings(p => ({...p, ...u}))} onSave={()=>{}} onComplete={() => setIsAuthenticated(true)} onResetStudents={() => setStudents([])} onSwitchToLogin={() => setIsRegistering(false)} />
        ) : (
          <LoginPortal onLoginSuccess={(id) => { loadSchoolSession(id).then(() => setIsAuthenticated(true)); }} onSuperAdminLogin={() => setIsSuperAdmin(true)} onFacilitatorLogin={(n, s, id) => { loadSchoolSession(id).then(() => { setIsFacilitator(true); setActiveFacilitator({ name: n, subject: s }); setIsAuthenticated(true); setViewMode('home'); }); }} onPupilLogin={(id, hId) => { loadSchoolSession(hId).then((result) => { setIsAuthenticated(true); if (result) resolvePupilPortal(id, result.students, result.settings); }); }} onSwitchToRegister={() => setIsRegistering(true)} />
        )}
      </div>
    );
  }

  if (isSuperAdmin) return <SuperAdminPortal onExit={handleLogout} onRemoteView={(id) => { loadSchoolSession(id); setIsSuperAdmin(false); setIsAuthenticated(true); }} />;

  // PUPIL VIEW: COMPLETELY DECOUPLED FROM ADMIN SHELL
  if (isPupil && activePupil) {
    return <PupilDashboard student={activePupil} stats={stats} settings={settings} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} onSettingChange={(k,v) => setSettings(p=>({...p,[k]:v}))} globalRegistry={globalRegistry} onLogout={handleLogout} />;
  }

  // ADMIN / FACILITATOR SHELL
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="no-print bg-blue-900 text-white p-4 sticky top-0 z-50 shadow-md flex justify-between items-center">
        <div className="flex bg-blue-800 rounded p-1 gap-1 text-[10px] font-black uppercase overflow-x-auto no-scrollbar">
          <button onClick={() => setViewMode('home')} className={`px-4 py-2 rounded transition-all ${viewMode === 'home' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Home</button>
          <button onClick={() => setViewMode('master')} className={`px-4 py-2 rounded transition-all ${viewMode === 'master' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Sheets</button>
          <button onClick={() => setViewMode('reports')} className={`px-4 py-2 rounded transition-all ${viewMode === 'reports' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Reports</button>
          <button onClick={() => setViewMode('series')} className={`px-4 py-2 rounded transition-all ${viewMode === 'series' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Tracker</button>
          <button onClick={() => setViewMode('management')} className={`px-4 py-2 rounded transition-all ${viewMode === 'management' ? 'bg-white text-blue-900 shadow-lg' : 'hover:bg-blue-700'}`}>Mgmt Hub</button>
        </div>
        <button onClick={handleLogout} className="bg-red-600 text-white px-5 py-2 rounded-xl font-black text-[10px] uppercase active:scale-95 transition-all">Logout</button>
      </div>
      <div className="flex-1 overflow-auto p-4 md:p-8">
        {viewMode === 'home' && <HomeDashboard students={processedStudents} settings={settings} setViewMode={setViewMode} />}
        {viewMode === 'master' && <MasterSheet students={processedStudents} stats={stats} settings={settings} onSettingChange={(k,v) => setSettings(p=>({...p,[k]:v}))} facilitators={facilitators} isFacilitator={isFacilitator} />}
        {viewMode === 'series' && <SeriesBroadSheet students={students} settings={settings} onSettingChange={(k,v) => setSettings(p=>({...p,[k]:v}))} currentProcessed={processedStudents.map(ps => ({ id: ps.id, bestSixAggregate: ps.bestSixAggregate, rank: ps.rank, totalScore: ps.totalScore, category: ps.category }))} />}
        {viewMode === 'reports' && (
          <div className="space-y-8">
            <input type="text" placeholder="Search pupils..." value={reportSearchTerm} onChange={(e) => setReportSearchTerm(e.target.value)} className="w-full p-5 rounded-2xl border-2 border-gray-100 shadow-sm font-bold no-print outline-none focus:border-blue-300 transition-all" />
            {processedStudents.filter(s => (s.name || "").toLowerCase().includes(reportSearchTerm.toLowerCase())).map(s => <ReportCard key={s.id} student={s} stats={stats} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} classAverageAggregate={classAvgAggregate} totalEnrolled={processedStudents.length} isFacilitator={isFacilitator} />)}
          </div>
        )}
        {viewMode === 'management' && <ManagementDesk students={students} setStudents={setStudents} facilitators={facilitators} setFacilitators={setFacilitators} subjects={SUBJECT_LIST} settings={settings} onSettingChange={(k,v)=>setSettings(p=>({...p,[k]:v}))} onBulkUpdate={(u)=>setSettings(p=>({...p,...u}))} onSave={()=>{}} processedSnapshot={processedStudents} onLoadDummyData={()=>{}} onClearData={()=>{}} isFacilitator={isFacilitator} activeFacilitator={activeFacilitator} />}
      </div>
    </div>
  );
};

export default App;
