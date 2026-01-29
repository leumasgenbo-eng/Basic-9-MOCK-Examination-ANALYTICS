
import React from 'react';
import { GlobalSettings } from '../../types';
import EditableField from './EditableField';

interface ReportBrandingHeaderProps {
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  reportTitle: string;
  subtitle?: string;
  isLandscape?: boolean;
  readOnly?: boolean;
}

const ReportBrandingHeader: React.FC<ReportBrandingHeaderProps> = ({ 
  settings, 
  onSettingChange, 
  reportTitle, 
  subtitle, 
  isLandscape = false, 
  readOnly = false 
}) => {
  return (
    <div className={`text-center relative border-b-[8px] border-double border-blue-900 pb-8 mb-8 w-full ${isLandscape ? 'px-10' : 'px-4'} animate-in fade-in duration-1000`}>
      
      {/* Institutional Seal */}
      <div className="absolute top-0 left-0 w-24 h-24 flex items-center justify-center no-print">
        {settings.schoolLogo ? (
          <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-2xl border-4 border-white/20">UBA</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.4em] mb-1">NETWORK NODE ID: {settings.schoolNumber || "UBA-HUB-SYNC"}</div>
        
        <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black text-blue-950 tracking-tighter uppercase leading-tight`}>
          {readOnly ? (
            <span>{settings.schoolName || "UNITED BAYLOR ACADEMY"}</span>
          ) : (
            <EditableField 
              value={settings.schoolName || "UNITED BAYLOR ACADEMY"} 
              onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} 
              className="text-center font-black w-full text-blue-950 border-none"
            />
          )}
        </h1>

        <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed">
          {readOnly ? (
            <span>{settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"}</span>
          ) : (
            <EditableField 
              value={settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"} 
              onChange={(v) => onSettingChange('schoolAddress', v.toUpperCase())} 
              className="text-center w-full text-gray-500 border-none"
            />
          )}
        </p>

        <div className="flex justify-center gap-10 text-[10px] font-black text-blue-900 uppercase tracking-widest pt-4 border-t border-gray-100 mt-4">
          <div className="flex gap-2">
            <span className="text-gray-400">CONTACT:</span>
            {readOnly ? <span>{settings.schoolContact || "+233 24 350 4091"}</span> : <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} className="border-none" />}
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400">DOMAIN:</span>
            {readOnly ? <span className="lowercase font-mono text-blue-500">{settings.schoolWebsite || "www.unitedbaylor.edu"}</span> : <EditableField value={settings.schoolWebsite || ""} onChange={(v) => onSettingChange('schoolWebsite', v)} className="border-none lowercase font-mono" />}
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400">EMAIL:</span>
            {readOnly ? <span className="lowercase font-mono">{settings.schoolEmail || "info@unitedbaylor.edu"}</span> : <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} className="border-none lowercase font-mono" />}
          </div>
        </div>

        {/* Dynamic Assessment Node */}
        <div className="mt-8 bg-blue-50/50 py-7 border-y-2 border-blue-900/10 relative overflow-hidden group">
          <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tight relative">
            {readOnly ? <span>{reportTitle}</span> : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full border-none" />}
          </h2>
          {subtitle && <p className="text-[10px] font-black text-blue-950/40 tracking-[0.5em] uppercase mt-2">{subtitle}</p>}
        </div>

        {/* Shard Metadata */}
        <div className="flex justify-center items-center gap-14 text-[12px] font-black text-gray-800 uppercase tracking-[0.3em] mt-6">
           <div className="flex flex-col items-center"><span className="text-[7px] text-blue-400 mb-1">TERM</span><span className="bg-blue-900 text-white px-5 py-1.5 rounded-xl">{settings.termInfo}</span></div>
           <div className="flex flex-col items-center"><span className="text-[7px] text-blue-400 mb-1">SESSION</span><span className="text-blue-600">{settings.activeMock}</span></div>
           <div className="flex flex-col items-center"><span className="text-[7px] text-blue-400 mb-1">PERIOD</span><span className="italic">{settings.academicYear}</span></div>
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
