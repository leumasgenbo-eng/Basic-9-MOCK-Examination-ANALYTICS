
import React from 'react';
import { ViewMode } from '../types';

interface HomePortalProps {
  onNavigate: (mode: ViewMode) => void;
  schoolName: string;
}

const HomePortal: React.FC<HomePortalProps> = ({ onNavigate, schoolName }) => {
  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in zoom-in-95 duration-700 py-12">
      <div className="text-center space-y-4">
        <div className="inline-block px-5 py-2 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.4em] mb-4 shadow-sm">
          Institutional Command Center
        </div>
        <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter leading-none">
          {schoolName || "UNITED BAYLOR ACADEMY"}
        </h1>
        <p className="text-slate-400 font-bold uppercase text-[11px] tracking-[0.3em]">
          Strategic Academic Performance Management Hub
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Dashboard/Reports Entry */}
        <button 
          onClick={() => onNavigate('reports')}
          className="group relative bg-white p-10 rounded-[3.5rem] border-4 border-slate-100 shadow-xl hover:shadow-2xl hover:border-blue-500 transition-all duration-500 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full group-hover:bg-blue-100 transition-colors duration-500 opacity-50"></div>
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Candidate Reports</h2>
              <p className="text-slate-500 font-medium text-sm mt-2">Access individualized performance audits, scorecards, and pupil-specific analytics.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest border-t border-slate-50 pt-4">
              Open Report Registry <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
          </div>
        </button>

        {/* Broadsheet Entry */}
        <button 
          onClick={() => onNavigate('master')}
          className="group relative bg-slate-900 p-10 rounded-[3.5rem] border-4 border-slate-800 shadow-xl hover:shadow-2xl hover:border-indigo-500 transition-all duration-500 text-left overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-full group-hover:bg-white/10 transition-colors duration-500"></div>
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 bg-indigo-500 rounded-3xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" /></svg>
            </div>
            <div>
              <h2 className="text-3xl font-black text-white uppercase tracking-tight">Master Broad Sheets</h2>
              <p className="text-slate-400 font-medium text-sm mt-2">Comprehensive itemized ledger for subject comparisons, pupil rankings, and institutional records.</p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest border-t border-white/5 pt-4">
              Access Ledger Registry <svg className="w-3 h-3 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </div>
          </div>
        </button>
      </div>

      {/* Secondary Quick-Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button onClick={() => onNavigate('series')} className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
            <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Series Tracker</span>
          </button>
          <button onClick={() => onNavigate('management')} className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
            <div className="w-10 h-10 bg-slate-700 text-white rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Management Desk</span>
          </button>
          <button onClick={() => window.print()} className="flex items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-slate-300 transition-all group">
            <div className="w-10 h-10 bg-green-600 text-white rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            </div>
            <span className="text-[10px] font-black uppercase text-slate-700 tracking-widest">Master Print Protocol</span>
          </button>
      </div>

      <div className="flex justify-center pt-8 border-t border-slate-100">
        <div className="flex items-center gap-3 bg-slate-950 px-6 py-2 rounded-full border border-slate-800 shadow-2xl">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
          <span className="text-[9px] font-black text-white uppercase tracking-[0.4em]">SS-Map Hub System: Operational</span>
        </div>
      </div>
    </div>
  );
};

export default HomePortal;
