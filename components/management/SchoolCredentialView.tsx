
import React from 'react';
import { GlobalSettings } from '../../types';

interface SchoolCredentialViewProps {
  settings: GlobalSettings;
  studentCount: number;
}

const SchoolCredentialView: React.FC<SchoolCredentialViewProps> = ({ settings, studentCount }) => {
  const handleDownloadPack = () => {
    const text = `UNITED BAYLOR ACADEMY NETWORK - INSTITUTIONAL ACCESS PACK\n` +
                 `==============================================================\n\n` +
                 `1. INSTITUTION NAME:     ${settings.schoolName}\n` +
                 `2. ENROLLMENT ID (KEY):  ${settings.schoolNumber}\n` +
                 `3. REGISTRANT IDENTITY:  ${settings.registrantName}\n` +
                 `4. MASTER ACCESS KEY:    ${settings.accessCode}\n` +
                 `5. FACILITATOR PASSKEY:  ${settings.staffAccessCode}\n` +
                 `6. PUPIL PASSKEY:        ${settings.pupilAccessCode}\n\n` +
                 `--------------------------------------------------------------\n` +
                 `PARTICULARS:\n` +
                 `Location:   ${settings.schoolAddress}\n` +
                 `Contact:    ${settings.schoolContact}\n` +
                 `Email:      ${settings.schoolEmail || settings.registrantEmail}\n` +
                 `Census:     ${studentCount} Enrolled Candidates\n\n` +
                 `Handshake Security PIN: ${settings.securityPin}\n\n` +
                 `* IMPORTANT: Store this file in a secure vault.`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Credential_Pack_${settings.schoolNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-950 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
        <div className="bg-blue-900 px-10 py-6 flex justify-between items-center border-b border-blue-800">
           <div className="space-y-1">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Institutional Credential Ledger</h3>
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.4em]">Official Hub Shard Identity</p>
           </div>
           <button 
             onClick={handleDownloadPack}
             className="bg-white text-blue-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
           >
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Download Access Pack
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-slate-500 text-[8px] font-black uppercase tracking-widest border-b border-slate-800">
              <tr>
                <th className="px-10 py-6">State</th>
                <th className="px-8 py-6">Institution Identity</th>
                <th className="px-8 py-6">Enrollment Key</th>
                <th className="px-8 py-6 text-center">Pupil Census</th>
                <th className="px-8 py-6">Registration Email</th>
                <th className="px-8 py-6">Contact No.</th>
                <th className="px-10 py-6 text-right">Access Terminal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              <tr className="hover:bg-white/5 transition-colors group">
                <td className="px-10 py-8">
                   <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">NODE ONLINE</span>
                   </div>
                </td>
                <td className="px-8 py-8">
                   <div className="space-y-1">
                      <p className="text-sm font-black text-white uppercase group-hover:text-blue-400 transition-colors leading-none">{settings.schoolName}</p>
                      <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Authorized Site</span>
                   </div>
                </td>
                <td className="px-8 py-8">
                   <code className="text-xs font-mono font-black text-blue-500 bg-blue-500/10 px-4 py-2 rounded-xl border border-blue-500/20 tracking-tighter">
                      {settings.schoolNumber}
                   </code>
                </td>
                <td className="px-8 py-8 text-center">
                   <div className="inline-flex flex-col items-center">
                      <span className="text-xl font-black text-white font-mono">{studentCount}</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase">Registered</span>
                   </div>
                </td>
                <td className="px-8 py-8">
                   <span className="text-[10px] text-slate-400 font-bold lowercase font-mono italic">
                      {settings.registrantEmail || settings.schoolEmail}
                   </span>
                </td>
                <td className="px-8 py-8">
                   <span className="text-[10px] text-slate-300 font-black font-mono">
                      {settings.schoolContact}
                   </span>
                </td>
                <td className="px-10 py-8 text-right">
                   <div className="flex flex-col items-end gap-1">
                      <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-lg text-[9px] font-black uppercase border border-indigo-500/20">
                         HANDSHAKE ACTIVE
                      </span>
                      <span className="text-[7px] text-slate-700 font-mono">NODE_REF: 4744-SYNC</span>
                   </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-10 border-t border-slate-800 bg-slate-900/30">
           <div className="flex items-start gap-6 max-w-4xl">
              <div className="w-12 h-12 bg-blue-600/10 text-blue-500 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-inner">
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div className="space-y-2">
                 <h4 className="text-xs font-black text-slate-300 uppercase">Security Information</h4>
                 <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest">
                    The Enrollment Key serves as your global network UID. The Access Pack (Downloaded above) contains the Master Key, Staff keys, and Pupil keys. Keep these credentials confidential to prevent unauthorized shard modification.
                 </p>
              </div>
           </div>
        </div>
      </div>

      <div className="flex justify-center opacity-30">
         <p className="text-[9px] font-black text-slate-400 uppercase tracking-[2em]">SS-MAP NETWORK CREDENTIAL LEDGER</p>
      </div>
    </div>
  );
};

export default SchoolCredentialView;
