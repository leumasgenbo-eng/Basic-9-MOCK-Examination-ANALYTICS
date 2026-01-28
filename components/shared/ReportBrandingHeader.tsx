
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
  const commonInputClass = readOnly ? "border-none hover:bg-transparent focus:bg-transparent cursor-default" : "";

  return (
    <div className={`text-center relative border-b-[8px] border-double border-blue-900 pb-8 mb-8 w-full ${isLandscape ? 'px-6' : 'px-4'}`}>
      {settings.schoolLogo && (
        <div className="absolute top-0 left-0 w-24 h-24 print:w-20 print:h-20 flex items-center justify-center">
          <img src={settings.schoolLogo} alt="Academy Logo" className="max-w-full max-h-full object-contain" />
        </div>
      )}
      
      <div className="absolute top-0 right-0 no-print flex flex-col items-end gap-1">
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 shadow-sm">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black text-blue-900 uppercase tracking-widest">
            HUB ID: {readOnly ? (
              <span className="font-mono ml-1">{settings.schoolNumber}</span>
            ) : (
              <EditableField value={settings.schoolNumber} onChange={(v) => onSettingChange('schoolNumber', v)} className="border-none ml-1 bg-transparent font-mono" />
            )}
          </span>
        </div>
      </div>

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

        <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed">
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

        <div className="flex justify-center items-center gap-6 text-[10px] font-black text-blue-800 uppercase tracking-widest mt-1">
          <div className="flex items-center gap-1.5">
            <span>TEL:</span>
            {readOnly ? (
              <span>{settings.schoolContact}</span>
            ) : (
              <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} placeholder="PHONE CONTACT..." />
            )}
          </div>
          <div className="w-1.5 h-1.5 bg-blue-100 rounded-full"></div>
          <div className="flex items-center gap-1.5">
            <span>EMAIL:</span>
            {readOnly ? (
              <span className="lowercase">{settings.schoolEmail}</span>
            ) : (
              <EditableField value={settings.schoolEmail} onChange={(v) => onSettingChange('schoolEmail', v)} placeholder="OFFICIAL EMAIL..." className="lowercase" />
            )}
          </div>
        </div>

        <div className="mt-6 bg-red-50 py-3.5 border-y border-red-100 shadow-sm relative overflow-hidden group">
          <h2 className="text-2xl font-black text-red-700 uppercase tracking-tight">
            {readOnly ? (
              <span>{reportTitle}</span>
            ) : (
              <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v)} className="text-center w-full" />
            )}
          </h2>
          {subtitle && (
            <p className="text-[10px] font-black text-red-900 tracking-[0.5em] uppercase mt-2 opacity-80">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex justify-center items-center gap-10 text-[12px] font-black text-gray-800 uppercase tracking-widest mt-6">
          <div className="flex items-center gap-3">
             {readOnly ? (
               <span className="bg-blue-900 text-white px-5 py-1 rounded shadow-lg">{settings.termInfo}</span>
             ) : (
               <EditableField value={settings.termInfo} onChange={(v) => onSettingChange('termInfo', v)} className="bg-blue-900 text-white px-5 py-1 rounded shadow-lg" />
             )}
          </div>
          <div className="flex items-center gap-2 border-x border-gray-200 px-8">
             <span className="text-[9px] text-gray-400 uppercase">Series ID:</span>
             {readOnly ? (
               <span>{settings.activeMock}</span>
             ) : (
               <EditableField value={settings.activeMock} onChange={(v) => onSettingChange('activeMock', v)} />
             )}
          </div>
          <div className="flex items-center gap-2">
             <span className="text-[9px] text-gray-400 uppercase">Year:</span>
             {readOnly ? (
               <span className="italic">{settings.academicYear}</span>
             ) : (
               <EditableField value={settings.academicYear} onChange={(v) => onSettingChange('academicYear', v)} className="italic" />
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
