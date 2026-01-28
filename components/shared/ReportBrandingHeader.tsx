
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

const ReportBrandingHeader: React.FC<ReportBrandingHeaderProps> = ({ settings, onSettingChange, reportTitle, subtitle, isLandscape = false, readOnly = false }) => {
  return (
    <div className={`text-center relative border-b-[8px] border-double border-blue-900 pb-8 mb-8 w-full ${isLandscape ? 'px-10' : 'px-4'}`}>
      {settings.schoolLogo && (
        <div className="absolute top-0 left-0 w-24 h-24 print:w-20 print:h-20 flex items-center justify-center">
          <img src={settings.schoolLogo} alt="Academy Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}
      
      <div className="space-y-2">
        <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black text-blue-950 tracking-tighter uppercase leading-tight`}>
          {readOnly ? (
            <span>{settings.schoolName || "UNITED BAYLOR ACADEMY"}</span>
          ) : (
            <EditableField 
              value={settings.schoolName || "UNITED BAYLOR ACADEMY"} 
              onChange={(v) => onSettingChange('schoolName', v)} 
              className="text-center font-black w-full"
              placeholder="OFFICIAL ACADEMY NAME"
            />
          )}
        </h1>

        <div className="text-[11px] font-black text-blue-600/60 uppercase tracking-[0.6em] italic">
          {readOnly ? (
            <span>{settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"}</span>
          ) : (
            <EditableField 
              value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} 
              onChange={(v) => onSettingChange('schoolMotto', v)} 
              className="text-center w-full bg-transparent"
              placeholder="SCHOOL MOTTO"
            />
          )}
        </div>

        <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed mt-4">
          {readOnly ? (
            <span>{settings.schoolAddress}</span>
          ) : (
            <EditableField 
              value={settings.schoolAddress} 
              onChange={(v) => onSettingChange('schoolAddress', v)} 
              className="text-center w-full"
              placeholder="LOCALITY / POSTAL ADDRESS"
            />
          )}
        </p>

        <div className="flex justify-center items-center gap-10 text-[10px] font-black text-blue-800 uppercase tracking-widest mt-3">
          <div className="flex items-center gap-2">
            <span>TEL:</span>
            {readOnly ? (
              <span>{settings.schoolContact}</span>
            ) : (
              <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} placeholder="PHONE CONTACT..." />
            )}
          </div>
          <div className="w-2 h-2 bg-blue-100 rounded-full"></div>
          <div className="flex items-center gap-2">
             <span>EMAIL:</span>
             {readOnly ? (
               <span className="lowercase">{settings.schoolEmail}</span>
             ) : (
               <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} placeholder="OFFICIAL EMAIL..." className="lowercase" />
             )}
          </div>
          <div className="w-2 h-2 bg-blue-100 rounded-full"></div>
          <div className="flex items-center gap-2">
            <span>WEB:</span>
            {readOnly ? (
              <span className="lowercase">{settings.schoolWebsite || 'www.unitedbaylor.edu'}</span>
            ) : (
              <EditableField value={settings.schoolWebsite || ''} onChange={(v) => onSettingChange('schoolWebsite', v)} placeholder="OFFICIAL WEBSITE..." className="lowercase" />
            )}
          </div>
        </div>

        <div className="mt-10 bg-red-50 py-4 border-y border-red-100 relative overflow-hidden group">
          <h2 className="text-3xl font-black text-red-700 uppercase tracking-tight">
            {readOnly ? (
              <span>{reportTitle}</span>
            ) : (
              <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />
            )}
          </h2>
          {subtitle && (
            <p className="text-[10px] font-black text-red-900 tracking-[0.6em] uppercase mt-2 opacity-60">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex justify-center items-center gap-12 text-[14px] font-black text-gray-800 uppercase tracking-[0.3em] mt-8">
           <div className="flex items-center gap-4">
              <span className="text-[9px] text-gray-400 uppercase">Term:</span>
              {readOnly ? (
                <span className="bg-blue-900 text-white px-6 py-1.5 rounded shadow-lg">{settings.termInfo}</span>
              ) : (
                <EditableField value={settings.termInfo} onChange={(v) => onSettingChange('termInfo', v)} className="bg-blue-900 text-white px-6 py-1.5 rounded shadow-lg" />
              )}
           </div>
           <div className="flex items-center gap-4 border-x border-gray-200 px-12">
              <span className="text-[9px] text-gray-400 uppercase">Series ID:</span>
              {readOnly ? (
                <span>{settings.activeMock}</span>
              ) : (
                <EditableField value={settings.activeMock} onChange={(v) => onSettingChange('activeMock', v)} />
              )}
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[9px] text-gray-400 uppercase">Cycle:</span>
              {readOnly ? (
                <span className="italic">{settings.academicYear}</span>
              ) : (
                <EditableField value={settings.academicYear} onChange={(v) => onSettingChange('academicYear', v)} className="italic" />
              )}
           </div>
        </div>
      </div>
      
      {!readOnly && (
        <div className="absolute top-0 right-0 no-print">
           <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-[9px] font-black uppercase tracking-widest">Master Admin Mode: All Fields Editable</span>
           </div>
        </div>
      )}
    </div>
  );
};

export default ReportBrandingHeader;
