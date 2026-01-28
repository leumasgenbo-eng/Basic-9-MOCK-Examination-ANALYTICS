
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SchoolRegistryEntry, RemarkMetric } from '../../types';
import { supabase } from '../../supabaseClient';
import { SUBJECT_LIST } from '../../constants';

// Sub-portals
import RegistryView from './RegistryView';
import ReratingView from './ReratingView';
import AuditLogView from './AuditLogView';
import RemarkAnalyticsView from './RemarkAnalyticsView';
import PupilNetworkRankingView from './PupilNetworkRankingView';
import NetworkRewardsView from './NetworkRewardsView';
import NetworkSigDiffView from './NetworkSigDiffView';
import NetworkAnnualAuditReport from './NetworkAnnualAuditReport';
import RecruitmentHubView from './RecruitmentHubView';
import AdvertisementPortalView from './AdvertisementPortalView';
import MarketingDeskView from './MarketingDeskView';
import SerializationHubView from './SerializationHubView';
import QuestionSerializationPortal from './QuestionSerializationPortal';

export interface SubjectDemandMetric {
  subject: string;
  demandScore: number;
  difficultyRating: number;
  networkMeanPerformance: number;
  maleRemarkShare: number;
  femaleRemarkShare: number;
  topRemark: string;
  remarkCount: number;
}

export interface SystemAuditEntry {
  timestamp: string;
  action: string;
  target: string;
  actor: string;
  details: string;
  year: string;
}

const SuperAdminPortal: React.FC<{ onExit: () => void; onRemoteView: (schoolId: string) => void; }> = ({ onExit, onRemoteView }) => {
  const [registry, setRegistry] = useState<SchoolRegistryEntry[]>([]);
  const [auditTrail, setAuditTrail] = useState<SystemAuditEntry[]>([]);
  const [view, setView] = useState<'registry' | 'recruitment' | 'rankings' | 'serialization' | 'questions' | 'papers' | 'advertisement' | 'marketing' | 'pupils' | 'rewards' | 'sig-diff' | 'remarks' | 'annual-report' | 'audit'>('registry');
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [paperMatrix, setPaperMatrix] = useState<Record<string, Record<string, boolean>>>({});
  const [activeMock, setActiveMock] = useState('MOCK 1');

  const fetchHQData = async () => {
    setIsCloudSyncing(true);
    try {
      const { data, error } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .or('id.like.registry_%,id.eq.audit');

      if (data) {
        const compiledRegistry: SchoolRegistryEntry[] = [];
        data.forEach(row => {
          if (row.id === 'audit') setAuditTrail(row.payload || []);
          else if (row.id.startsWith('registry_')) {
            const shard = Array.isArray(row.payload) ? row.payload : [row.payload];
            compiledRegistry.push(...shard);
          }
        });
        setRegistry(compiledRegistry);
      }
    } catch (err: any) {
      console.error("HQ Sync Error:", err.message);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const fetchPaperStatus = async () => {
    const mockKey = activeMock.replace(/\s+/g, '');
    const { data } = await supabase.from('uba_persistence').select('id').like('id', `serialized_exam_%_${mockKey}_%`);
    if (data) {
      const matrix: Record<string, Record<string, boolean>> = {};
      data.forEach(row => {
         const parts = row.id.split('_');
         const sId = parts[2];
         const sub = parts[4];
         if (!matrix[sId]) matrix[sId] = {};
         matrix[sId][sub] = true;
      });
      setPaperMatrix(matrix);
    }
  };

  useEffect(() => { fetchHQData(); }, []);
  useEffect(() => { if (view === 'papers') fetchPaperStatus(); }, [view, activeMock]);

  const navSectors = [
    {
      title: "Infrastructure",
      tabs: [
        { id: 'registry', label: 'Network Ledger' },
        { id: 'recruitment', label: 'Recruitment Hub' },
        { id: 'papers', label: 'Paper Submission Registry' },
        { id: 'questions', label: 'Propagate Master Bank' },
      ]
    },
    {
      title: "Performance Matrix",
      tabs: [
        { id: 'rankings', label: 'Rerating' },
        { id: 'pupils', label: 'Talent Matrix' },
        { id: 'rewards', label: 'Global Rewards' },
      ]
    },
    {
      title: "System Audit",
      tabs: [
        { id: 'sig-diff', label: 'Sig-Diff' },
        { id: 'annual-report', label: 'Network Audit' },
        { id: 'audit', label: 'Trail' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-4 md:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-slate-800 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-900 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)] border border-white/10 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Master Hub Console</h1>
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] mt-2">
                 {isCloudSyncing ? "SYNCHRONIZING..." : "CLOUD NETWORK ACTIVE"}
              </p>
            </div>
          </div>
          <button onClick={onExit} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-8 py-2.5 rounded-xl font-black text-[10px] uppercase border border-red-500/20 transition-all shadow-lg">Exit Hub</button>
        </header>

        {/* Mega-Navigation */}
        <nav className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-2 backdrop-blur-md overflow-hidden shadow-2xl">
          <div className="flex flex-wrap md:flex-nowrap divide-x divide-slate-800">
            {navSectors.map((sector, sIdx) => (
              <div key={sIdx} className="flex-1 min-w-[200px] p-2 space-y-2">
                <div className="px-3 flex items-center gap-2 mb-1">
                   <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                   <span className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">{sector.title}</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {sector.tabs.map(tab => (
                    <button key={tab.id} onClick={() => setView(tab.id as any)} className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all text-left flex items-center justify-between group ${view === tab.id ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <main className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl min-h-[600px] overflow-hidden relative">
          {view === 'registry' && <RegistryView registry={registry} searchTerm="" setSearchTerm={()=>{}} onRemoteView={onRemoteView} onUpdateRegistry={setRegistry} onLogAction={()=>{}} />}
          {view === 'questions' && <QuestionSerializationPortal registry={registry} />}
          
          {view === 'papers' && (
            <div className="p-10 space-y-10 animate-in fade-in duration-500 h-full flex flex-col">
               <div className="flex justify-between items-center">
                  <div className="space-y-1">
                     <h3 className="text-2xl font-black text-white uppercase tracking-tight">Paper Readiness Matrix</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network-Wide Serialization Monitor</p>
                  </div>
                  <select value={activeMock} onChange={e=>setActiveMock(e.target.value)} className="bg-slate-950 text-white font-black py-3 px-6 rounded-2xl border border-slate-800 text-[10px] uppercase">
                    {['MOCK 1', 'MOCK 2', 'MOCK 3', 'MOCK 4', 'MOCK 5'].map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
               </div>
               
               <div className="flex-1 overflow-auto border border-slate-800 rounded-[2.5rem] bg-slate-950 custom-scrollbar">
                  <table className="w-full text-left border-collapse">
                     <thead className="bg-slate-900 text-[8px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                           <th className="px-8 py-5 min-w-[300px] sticky left-0 bg-slate-900 z-20 shadow-xl">Institutional Node</th>
                           {SUBJECT_LIST.map(s => <th key={s} className="px-4 py-5 text-center min-w-[120px]">{s.substring(0, 10)}</th>)}
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-900">
                        {registry.map(school => (
                          <tr key={school.id} className="hover:bg-blue-900/10 transition-colors">
                             <td className="px-8 py-5 font-black text-white text-xs sticky left-0 bg-slate-950 border-r border-slate-800 shadow-xl">
                                <div className="flex flex-col">
                                   <span className="uppercase">{school.name}</span>
                                   <span className="text-[8px] font-mono text-slate-500 tracking-tighter">{school.id}</span>
                                </div>
                             </td>
                             {SUBJECT_LIST.map(sub => {
                                const subKey = sub.replace(/\s+/g, '');
                                const isSynced = paperMatrix[school.id]?.[subKey];
                                return (
                                  <td key={sub} className="px-4 py-4 text-center">
                                     <div className={`w-6 h-6 rounded-full mx-auto flex items-center justify-center transition-all ${isSynced ? 'bg-emerald-600 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border border-slate-800 opacity-20'}`}>
                                        {isSynced && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white"><polyline points="20 6 9 17 4 12"/></svg>}
                                     </div>
                                  </td>
                                );
                             })}
                          </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}

          {/* Other views as previously defined... */}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminPortal;
