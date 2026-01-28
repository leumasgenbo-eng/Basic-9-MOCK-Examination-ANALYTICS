
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SchoolRegistryEntry, RemarkMetric } from '../../types';
import { supabase } from '../../supabaseClient';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'registry' | 'recruitment' | 'rankings' | 'serialization' | 'questions' | 'advertisement' | 'marketing' | 'pupils' | 'rewards' | 'sig-diff' | 'remarks' | 'annual-report' | 'audit'>('registry');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // 1. COMPOSITE REGISTRY DISCOVERY (SHARDED MODE)
  const fetchHQData = async () => {
    setIsCloudSyncing(true);
    try {
      const { data, error } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .or('id.like.registry_%,id.eq.audit');

      if (error) throw error;

      if (data) {
        const compiledRegistry: SchoolRegistryEntry[] = [];
        data.forEach(row => {
          if (row.id === 'audit') {
            setAuditTrail(row.payload || []);
          } else if (row.id.startsWith('registry_')) {
            if (Array.isArray(row.payload)) {
              compiledRegistry.push(...row.payload);
            } else {
              compiledRegistry.push(row.payload);
            }
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

  useEffect(() => {
    fetchHQData();
  }, []);

  const handleUpdateRegistry = async (next: SchoolRegistryEntry[]) => {
    setRegistry(next);
  };

  const logAction = async (action: string, target: string, details: string) => {
    const newEntry: SystemAuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      target,
      actor: "SYSTEM_SUPERADMIN",
      details,
      year: new Date().getFullYear().toString()
    };
    const nextAudit = [newEntry, ...auditTrail];
    setAuditTrail(nextAudit);
    await supabase.from('uba_persistence').upsert({ id: 'audit', payload: nextAudit, last_updated: new Date().toISOString() });
  };

  const handleMasterBackup = () => {
    const backupData = {
      type: "SSMAP_MASTER_SNAPSHOT",
      timestamp: new Date().toISOString(),
      registry,
      auditTrail
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SSMAP_MASTER_BACKUP_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    logAction("MASTER_BACKUP", "GLOBAL_SYSTEM", "Full network state exported to JSON.");
  };

  const handleMasterRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.type !== "SSMAP_MASTER_SNAPSHOT") throw new Error("Invalid format.");
        if (window.confirm(`RESTORE PROTOCOL: Overwrite current network with ${json.registry.length} nodes?`)) {
          for (const school of json.registry) {
             await supabase.from('uba_persistence').upsert({ 
               id: `registry_${school.id}`, 
               payload: [school], 
               last_updated: new Date().toISOString() 
             });
          }
          setRegistry(json.registry);
          setAuditTrail(json.auditTrail || []);
          await supabase.from('uba_persistence').upsert({ id: 'audit', payload: json.auditTrail || [], last_updated: new Date().toISOString() });
          logAction("MASTER_RESTORE", "GLOBAL_SYSTEM", `System restored from backup dated ${json.timestamp}`);
          alert("Cloud Network Restored.");
        }
      } catch (err) { alert("Restore Error: File corrupted."); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const schoolRankings = useMemo(() => {
    const processed = registry.map(school => {
      const history = school.performanceHistory || [];
      const latest = history[history.length - 1];
      return { id: school.id, name: school.name, compositeAvg: latest?.avgComposite || 0, aggregateAvg: latest?.avgAggregate || 0, objectiveAvg: latest?.avgObjective || 0, theoryAvg: latest?.avgTheory || 0 };
    });
    const calculateStats = (vals: number[]) => {
      if (vals.length === 0) return { mean: 0, std: 1 };
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const std = Math.sqrt(vals.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / vals.length) || 1;
      return { mean, std };
    };
    const cStats = calculateStats(processed.map(p => p.compositeAvg));
    const aStats = calculateStats(processed.map(p => p.aggregateAvg));
    return processed.map(p => {
      const zC = (p.compositeAvg - cStats.mean) / cStats.std;
      const zA = -(p.aggregateAvg - aStats.mean) / aStats.std;
      return { ...p, strengthIndex: (zC + zA) / 2 + 5 };
    }).sort((a, b) => b.strengthIndex - a.strengthIndex);
  }, [registry]);

  const subjectDemands = useMemo(() => {
    const map: Record<string, SubjectDemandMetric> = {};
    registry.forEach(school => {
      const tel = school.remarkTelemetry;
      if (!tel || !tel.subjectRemarks) return;
      (Object.entries(tel.subjectRemarks) as [string, RemarkMetric[]][]).forEach(([subject, metrics]) => {
        if (!map[subject]) map[subject] = { subject, demandScore: 0, difficultyRating: 0, networkMeanPerformance: 68.5, maleRemarkShare: 0, femaleRemarkShare: 0, topRemark: metrics[0]?.text || "No findings.", remarkCount: 0 };
        let subMales = 0, subFemales = 0;
        metrics.forEach(m => { map[subject].remarkCount += m.count; subMales += m.maleCount; subFemales += m.femaleCount; });
        const total = subMales + subFemales || 1;
        map[subject].maleRemarkShare = (subMales / total) * 100;
        map[subject].femaleRemarkShare = (subFemales / total) * 100;
        map[subject].demandScore = Math.min(100, map[subject].remarkCount * 1.5);
        map[subject].difficultyRating = Math.min(10, Math.ceil(map[subject].remarkCount / 10));
      });
    });
    return Object.values(map);
  }, [registry]);

  const navSectors = [
    {
      title: "Infrastructure",
      tabs: [
        { id: 'registry', label: 'Network Ledger' },
        { id: 'recruitment', label: 'Recruitment Hub' },
        { id: 'serialization', label: 'Serialization Hub' },
        { id: 'questions', label: 'Propagate Master Bank' },
      ]
    },
    {
      title: "Communication",
      tabs: [
        { id: 'advertisement', label: 'Advertisement' },
        { id: 'marketing', label: 'Marketing Desk' },
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
        { id: 'remarks', label: 'Demand' },
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
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter text-white leading-none">Master Hub</h1>
              <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] mt-2">
                 {isCloudSyncing ? "SYNCHRONIZING..." : "CLOUD NETWORK ACTIVE"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex gap-2">
               <button onClick={handleMasterBackup} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase shadow-lg transition-all flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Backup
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase border border-slate-700 transition-all">Restore</button>
               <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleMasterRestore} />
               <button onClick={onExit} className="bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white px-6 py-2.5 rounded-xl font-black text-[9px] uppercase border border-red-500/20 transition-all">Exit</button>
            </div>
          </div>
        </header>

        {/* Categorized Mega-Navigation */}
        <nav className="bg-slate-900/50 border border-slate-800 rounded-[2rem] p-2 backdrop-blur-md overflow-hidden">
          <div className="flex flex-wrap md:flex-nowrap divide-x divide-slate-800">
            {navSectors.map((sector, sIdx) => (
              <div key={sIdx} className="flex-1 min-w-[200px] p-2 space-y-2">
                <div className="px-3 flex items-center gap-2 mb-1">
                   <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                   <span className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">{sector.title}</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {sector.tabs.map(tab => (
                    <button 
                      key={tab.id} 
                      onClick={() => setView(tab.id as any)} 
                      className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase transition-all text-left flex items-center justify-between group ${view === tab.id ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                      {tab.label}
                      {view === tab.id && <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <main className="bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl min-h-[600px] overflow-hidden relative">
          {view === 'registry' && (
            <RegistryView registry={registry} searchTerm={searchTerm} setSearchTerm={setSearchTerm} onRemoteView={onRemoteView} onUpdateRegistry={handleUpdateRegistry} onLogAction={logAction} />
          )}
          {view === 'recruitment' && <RecruitmentHubView registry={registry} onLogAction={logAction} />}
          {view === 'rankings' && <ReratingView schoolRankings={schoolRankings} />}
          {view === 'serialization' && <SerializationHubView registry={registry} onLogAction={logAction} />}
          {view === 'questions' && <QuestionSerializationPortal registry={registry} />}
          {view === 'advertisement' && <AdvertisementPortalView onLogAction={logAction} />}
          {view === 'marketing' && <MarketingDeskView />}
          {view === 'remarks' && <RemarkAnalyticsView subjectDemands={subjectDemands} />}
          {view === 'pupils' && <PupilNetworkRankingView registry={registry} onRemoteView={onRemoteView} />}
          {view === 'rewards' && <NetworkRewardsView registry={registry} />}
          {view === 'sig-diff' && <NetworkSigDiffView registry={registry} />}
          {view === 'annual-report' && <NetworkAnnualAuditReport registry={registry} />}
          {view === 'audit' && <AuditLogView auditTrail={auditTrail} />}
        </main>
      </div>
    </div>
  );
};

export default SuperAdminPortal;
