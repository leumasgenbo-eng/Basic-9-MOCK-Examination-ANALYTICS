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
  const renderEditable = (value: string, key: keyof GlobalSettings, className: string = "", placeholder: string = "", isUpperCase: boolean = false) => {
    if (readOnly) return <span className={className}>{value}</span>;
    return (
      <EditableField 
        value={value || ""} 
        onChange={(v) => onSettingChange(key, isUpperCase ? v.toUpperCase() : v)} 
        className={className} 
        placeholder={placeholder}
      />
    );
  };

  return (
    <div className={`text-center relative w-full ${isLandscape ? 'px-10' : 'px-4'} font-sans animate-in fade-in duration-700`}>
      
      {/* 1. EXCLUDED FROM PDF: Institutional Top Branding */}
      <div data-html2canvas-ignore="true" className="border-b-[4px] border-double border-blue-900 pb-6 mb-6">
        <div className="text-[9px] font-black text-blue-600 uppercase tracking-[0.5em] mb-4 flex justify-center items-center gap-2">
          <span>INSTITUTIONAL HUB ID:</span>
          {renderEditable(settings.schoolNumber || "SSMAP-HUB-NODE", 'schoolNumber', "border-none font-mono bg-blue-50/50 px-2 rounded")}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-center gap-8 mb-4">
          <div className="w-24 h-24 flex items-center justify-center shrink-0">
            {settings.schoolLogo ? (
              <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain shadow-sm" />
            ) : (
              <div className="w-20 h-20 bg-blue-950 text-white rounded-[2rem] flex items-center justify-center font-black text-3xl shadow-xl">
                {settings.schoolName?.split(' ').map(n => n[0]).join('').substring(0, 3).toUpperCase() || "UBA"}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1">
            <h1 className="text-4xl font-black text-blue-950 tracking-tighter uppercase leading-none">
              {renderEditable(settings.schoolName || "UNITED BAYLOR ACADEMY", 'schoolName', "text-center font-black w-full text-blue-950 border-none", "UNITED BAYLOR ACADEMY", true)}
            </h1>
            <div className="text-[11px] font-black text-blue-900/60 uppercase tracking-[0.3em] italic">
              {renderEditable(settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER", 'schoolMotto', "text-center w-full border-none", "ACADEMY MOTTO...", true)}
            </div>
            <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.3em] pt-1">
              {renderEditable(settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA", 'schoolAddress', "text-center w-full text-gray-500 border-none", "ACADEMY ADDRESS...", true)}
            </p>
          </div>
        </div>

        <div className="flex justify-center flex-wrap gap-x-8 gap-y-2 text-[9px] font-black text-blue-900 uppercase tracking-[0.2em] pt-4 border-t border-gray-100">
          <div className="flex gap-1"><span className="text-gray-400">TEL:</span>{renderEditable(settings.schoolContact, 'schoolContact', "border-none")}</div>
          <div className="flex gap-1"><span className="text-gray-400">WEB:</span>{renderEditable(settings.schoolWebsite, 'schoolWebsite', "border-none lowercase font-mono")}</div>
          <div className="flex gap-1"><span className="text-gray-400">EMAIL:</span>{renderEditable(settings.schoolEmail, 'schoolEmail', "border-none lowercase font-mono")}</div>
        </div>
      </div>

      {/* 2. INCLUDED IN PDF: Assessment Series Branding Stripe (START CAPTURE AREA) */}
      <div className="bg-slate-900 text-white py-6 rounded-[2rem] relative overflow-hidden group shadow-2xl border-4 border-white mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-[3000ms]"></div>
        <h2 className="text-2xl font-black uppercase tracking-[0.1em] relative">
          {renderEditable(reportTitle, 'examTitle', "text-center w-full border-none bg-transparent text-white", "", true)}
        </h2>
        {subtitle && <p className="text-[9px] font-black text-blue-400 tracking-[0.5em] uppercase mt-2">{subtitle}</p>}
      </div>
      
      {/* Session Metadata Shards - Capture Boundary Area */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-[10px] font-black text-gray-800 uppercase tracking-[0.2em] mb-6 px-4">
         <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
           <span className="text-[7px] text-blue-500 mb-1 tracking-widest">Active Series</span>
           <span className="text-blue-900 font-mono">{settings.activeMock}</span>
         </div>
         <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
           <span className="text-[7px] text-blue-500 mb-1 tracking-widest">Term Shard</span>
           <span className="text-blue-900">{renderEditable(settings.termInfo, 'termInfo', "border-none text-center", "", true)}</span>
         </div>
         <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
           <span className="text-[7px] text-blue-500 mb-1 tracking-widest">Academic Year</span>
           <span className="text-blue-900">{renderEditable(settings.academicYear, 'academicYear', "border-none text-center", "", true)}</span>
         </div>
         <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
           <span className="text-[7px] text-blue-500 mb-1 tracking-widest">Authority Title</span>
           <span className="text-blue-900">{renderEditable(settings.adminRoleTitle || "Academy Director", 'adminRoleTitle', "border-none text-center", "", true)}</span>
         </div>
         <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100">
           <span className="text-[7px] text-blue-500 mb-1 tracking-widest">Registry Node</span>
           <span className="text-blue-900">{renderEditable(settings.registryRoleTitle || "Examination Registry", 'registryRoleTitle', "border-none text-center", "", true)}</span>
         </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;