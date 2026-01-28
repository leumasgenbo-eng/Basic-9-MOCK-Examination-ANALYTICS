
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
  const isUBA = (settings.schoolName || "").toUpperCase().includes("UNITED BAYLOR ACADEMY");

  return (
    <div className={`text-center relative border-b-[8px] border-double ${isUBA ? 'border-blue-900' : 'border-slate-800'} pb-8 mb-8 w-full ${isLandscape ? 'px-10' : 'px-4'}`}>
      
      {/* Editable Logo Area */}
      <div className="absolute top-0 left-0 w-24 h-24 flex items-center justify-center">
        {settings.schoolLogo ? (
          <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl">U</div>
        )}
      </div>

      <div className="space-y-3">
        {/* Main Identity Particular: Name */}
        <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black ${isUBA ? 'text-blue-950' : 'text-slate-900'} tracking-tighter uppercase leading-tight`}>
          {readOnly ? (
            <span>{settings.schoolName || "UNITED BAYLOR ACADEMY"}</span>
          ) : (
            <EditableField 
              value={settings.schoolName || "UNITED BAYLOR ACADEMY"} 
              onChange={(v) => onSettingChange('schoolName', v)} 
              className="text-center font-black w-full"
            />
          )}
        </h1>

        {/* Particular: Motto */}
        <div className="text-[11px] font-black text-blue-600/60 uppercase tracking-[0.6em] italic">
          {readOnly ? (
            <span>{settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"}</span>
          ) : (
            <EditableField 
              value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} 
              onChange={(v) => onSettingChange('schoolMotto', v)} 
              className="text-center w-full bg-transparent"
            />
          )}
        </div>

        {/* Particular: Address */}
        <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed mt-4">
          {readOnly ? (
            <span>{settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"}</span>
          ) : (
            <EditableField 
              value={settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"} 
              onChange={(v) => onSettingChange('schoolAddress', v)} 
              className="text-center w-full"
            />
          )}
        </p>

        {/* Contact Particulars Strip */}
        <div className="flex justify-center items-center gap-10 text-[10px] font-black text-blue-800 uppercase tracking-widest mt-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">TEL:</span>
            {readOnly ? (
              <span>{settings.schoolContact}</span>
            ) : (
              <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} />
            )}
          </div>
          <div className="w-2 h-2 bg-blue-100 rounded-full"></div>
          <div className="flex items-center gap-2">
             <span className="text-gray-400">EMAIL:</span>
             {readOnly ? (
               <span className="lowercase">{settings.schoolEmail || "info@uba.edu"}</span>
             ) : (
               <EditableField value={settings.schoolEmail || ""} onChange={(v) => onSettingChange('schoolEmail', v)} className="lowercase" />
             )}
          </div>
          <div className="w-2 h-2 bg-blue-100 rounded-full"></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">WEB:</span>
            {readOnly ? (
              <span className="lowercase">{settings.schoolWebsite || "www.uba.edu.gh"}</span>
            ) : (
              <EditableField value={settings.schoolWebsite || ""} onChange={(v) => onSettingChange('schoolWebsite', v)} className="lowercase" />
            )}
          </div>
        </div>

        {/* Dynamic Report Identifier */}
        <div className="mt-10 bg-red-50 py-5 border-y border-red-100 relative overflow-hidden group">
          <h2 className="text-3xl font-black text-red-700 uppercase tracking-tight">
            {readOnly ? <span>{reportTitle}</span> : <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />}
          </h2>
          {subtitle && (
            <p className="text-[10px] font-black text-red-900/40 tracking-[0.6em] uppercase mt-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Performance Context particulars */}
        <div className="flex justify-center items-center gap-12 text-[14px] font-black text-gray-800 uppercase tracking-[0.3em] mt-8">
           <div className="flex items-center gap-4">
              <span className="text-[9px] text-gray-400 uppercase">Term:</span>
              {readOnly ? (
                <span className="bg-blue-900 text-white px-6 py-1.5 rounded-lg shadow-lg">{settings.termInfo}</span>
              ) : (
                <EditableField value={settings.termInfo} onChange={(v) => onSettingChange('termInfo', v)} className="bg-blue-900 text-white px-6 py-1.5 rounded-lg shadow-lg" />
              )}
           </div>
           <div className="flex items-center gap-4 border-x border-gray-200 px-12">
              <span className="text-[9px] text-gray-400 uppercase">Series:</span>
              {readOnly ? (
                <span className="text-blue-600 font-bold">{settings.activeMock}</span>
              ) : (
                <EditableField value={settings.activeMock} onChange={(v) => onSettingChange('activeMock', v)} className="text-blue-600 font-bold" />
              )}
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[9px] text-gray-400 uppercase">Cycle:</span>
              {readOnly ? (
                <span className="italic font-serif">{settings.academicYear}</span>
              ) : (
                <EditableField value={settings.academicYear} onChange={(v) => onSettingChange('academicYear', v)} className="italic font-serif" />
              )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
