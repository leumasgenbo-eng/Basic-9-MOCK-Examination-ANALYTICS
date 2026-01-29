
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
    <div className={`text-center relative border-b-[8px] border-double border-blue-900 pb-8 mb-8 w-full ${isLandscape ? 'px-10' : 'px-4'} animate-in fade-in duration-1000 font-sans`}>
      
      {/* Academy Institutional Seal */}
      <div className="absolute top-0 left-0 w-24 h-24 flex items-center justify-center no-print">
        {settings.schoolLogo ? (
          <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-2xl border-4 border-white/20">SSM</div>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] mb-1">HUB IDENTITY: {settings.schoolNumber || "SSM-HUB-SYNC"}</div>
        
        <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black text-blue-950 tracking-tighter uppercase leading-tight`}>
          {readOnly ? (
            <span>{settings.schoolName || "SS-map ACADEMY"}</span>
          ) : (
            <EditableField 
              value={settings.schoolName || "SS-map ACADEMY"} 
              onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} 
              className="text-center font-black w-full text-blue-950 border-none"
            />
          )}
        </h1>

        <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed">
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

        <div className="flex justify-center gap-10 text-[10px] font-black text-blue-900 uppercase tracking-[0.2em] pt-5 border-t border-gray-100 mt-5">
          <div className="flex gap-2">
            <span className="text-gray-400">TEL:</span>
            {readOnly ? <span>{settings.schoolContact || "+233 24 350 4091"}</span> : <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} className="border-none" />}
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400">DOMAIN:</span>
            {readOnly ? <span className="lowercase font-mono text-blue-500">{settings.schoolWebsite || "www.ssmap.app"}</span> : <EditableField value={settings.schoolWebsite || ""} onChange={(v) => onSettingChange('schoolWebsite', v)} className="border-none lowercase font-mono" />}
          </div>
          <div className="flex gap-2">
            <span className="text-gray-400">EMAIL:</span>
            {readOnly ? <span className="lowercase font-mono">{settings.schoolEmail || "info@ssmap.app"}</span> : <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} className="border-none lowercase font-mono" />}
          </div>
        </div>

        {/* Dynamic Series Assessment Stripe */}
        <div className="mt-8 bg-blue-50/50 py-8 border-y-2 border-blue-900/10 relative overflow-hidden group">
          <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tight relative">
            {readOnly ? <span>{reportTitle}</span> : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full border-none" />}
          </h2>
          {subtitle && <p className="text-[11px] font-black text-blue-950/40 tracking-[0.6em] uppercase mt-2">{subtitle}</p>}
        </div>

        {/* Shard Metadata Node */}
        <div className="flex justify-center items-center gap-16 text-[13px] font-black text-gray-800 uppercase tracking-[0.3em] mt-6">
           <div className="flex flex-col items-center"><span className="text-[8px] text-blue-400 mb-1">TERM NODE</span><span className="bg-blue-900 text-white px-5 py-1.5 rounded-xl shadow-lg">{settings.termInfo}</span></div>
           <div className="flex flex-col items-center"><span className="text-[8px] text-blue-400 mb-1">SERIES ID</span><span className="text-blue-600 underline decoration-double underline-offset-4">{settings.activeMock}</span></div>
           <div className="flex flex-col items-center"><span className="text-[8px] text-blue-400 mb-1">PERIOD</span><span className="italic">{settings.academicYear}</span></div>
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
