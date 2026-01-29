
import React, { useMemo } from 'react';
import { ProcessedStudent, GlobalSettings, ExamSubScore } from '../../types';

interface PupilMeritViewProps {
  student: ProcessedStudent;
  settings: GlobalSettings;
}

const PupilMeritView: React.FC<PupilMeritViewProps> = ({ student, settings }) => {
  const meritStats = useMemo(() => {
    const history = student.seriesHistory || {};
    const currentMock = history[settings.activeMock];
    const mockNames = settings.committedMocks || [];
    const prevMockName = mockNames[mockNames.indexOf(settings.activeMock) - 1];
    const prevMock = prevMockName ? history[prevMockName] : null;

    let growthRate = 1.0;
    const avgGrade = currentMock ? currentMock.aggregate / 10 : 9;

    if (currentMock && prevMock && currentMock.subScores && prevMock.subScores) {
      // Fix: Cast Object.values results to ExamSubScore[] to resolve 'unknown' property access and arithmetic errors in reduce
      const currTotal = (Object.values(currentMock.subScores) as ExamSubScore[]).reduce((a, b) => a + (b.sectionA + b.sectionB), 0);
      const prevTotal = (Object.values(prevMock.subScores) as ExamSubScore[]).reduce((a, b) => a + (b.sectionA + b.sectionB), 0);
      // Fix: currTotal and prevTotal are now typed as numbers, allowing arithmetic comparison and division
      growthRate = prevTotal > 0 ? currTotal / prevTotal : 1.0;
    }

    const rewardIndex = (avgGrade > 0 ? (10 / avgGrade) : 1) * growthRate;

    return { 
      rewardIndex, 
      growthRate, 
      rank: currentMock?.rank || '—',
      aggregate: currentMock?.aggregate || '—'
    };
  }, [student, settings]);

  return (
    <div className="bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 space-y-12 animate-in fade-in duration-700">
      <div className="text-center space-y-2 border-b border-gray-50 pb-8">
         <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Personal Merit Dashboard</h3>
         <p className="text-[11px] font-bold text-blue-600 uppercase tracking-[0.5em]">Heuristic Multiplier Analysis — {settings.activeMock}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Reward Index Card */}
        <div className="bg-blue-950 text-white p-10 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col justify-between group h-full">
           <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/10 rounded-full -mr-20 -mt-20 blur-2xl"></div>
           <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Merit Reward Index</span>
           <p className="text-6xl font-black mt-6 font-mono tracking-tighter">{(meritStats.rewardIndex * 1.6667).toFixed(3)}</p>
           <div className="mt-10 pt-4 border-t border-white/10 text-[9px] font-black uppercase tracking-widest text-blue-200 italic">
              "Consistency × Aggregate Proficiency"
           </div>
        </div>

        {/* Growth Card */}
        <div className="bg-slate-50 border border-gray-100 p-10 rounded-[3rem] space-y-6 flex flex-col justify-center">
           <div className="space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Temporal Growth</span>
              <p className={`text-5xl font-black ${meritStats.growthRate >= 1 ? 'text-emerald-600' : 'text-red-500'}`}>
                 x{meritStats.growthRate.toFixed(2)}
              </p>
           </div>
           <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${Math.min(100, meritStats.growthRate * 50)}%` }}></div>
           </div>
           <p className="text-[10px] text-gray-500 leading-relaxed font-bold uppercase tracking-widest">
              Ratio of current total performance against previous series baseline.
           </p>
        </div>

        {/* Rank Card */}
        <div className="bg-slate-50 border border-gray-100 p-10 rounded-[3rem] flex flex-col justify-center items-center text-center space-y-3">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Institutional Rank</span>
           <p className="text-7xl font-black text-slate-900 leading-none">#{meritStats.rank}</p>
           <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em] bg-blue-100 px-4 py-1.5 rounded-full mt-4">Official Series Rank</span>
        </div>
      </div>

      <div className="bg-slate-950 p-12 rounded-[4rem] text-white relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 rounded-full -mr-48 -mt-48"></div>
         <div className="flex items-center gap-4 mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
            <h4 className="text-sm font-black text-blue-400 uppercase tracking-[0.4em]">Merit Interpretation</h4>
         </div>
         <p className="text-base font-medium leading-relaxed italic text-slate-300">
           The Reward Index quantifies your <span className="text-white font-black">"Academic Gravity"</span> within the cohort. A rising index indicates you are effectively converting effort into results while maintaining a high growth velocity relative to established standards.
         </p>
      </div>
    </div>
  );
};

export default PupilMeritView;