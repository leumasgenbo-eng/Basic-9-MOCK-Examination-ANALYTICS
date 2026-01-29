
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
    <div className={`text-center relative border-b-[8px] border-double ${isUBA ? 'border-blue-900' : 'border-slate-800'} pb-8 mb-8 w-full ${isLandscape ? 'px-10' : 'px-4'} animate-in fade-in duration-1000`}>
      
      {/* Academy Seal / Logo Area */}
      <div className="absolute top-0 left-0 w-24 h-24 flex flex-col items-center justify-center group/logo no-print">
        {settings.schoolLogo ? (
          <img src={settings.schoolLogo} alt="Academy Seal" className="max-w-full max-h-full object-contain shadow-xl rounded-2xl" />
        ) : (
          <div className="w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-2xl">
            {settings.schoolName?.charAt(0) || 'U'}
          </div>
        )}
        {!readOnly && (
          <span className="text-[6px] font-black text-blue-500 uppercase mt-1 opacity-0 group-hover/logo:opacity-100 transition-opacity">Editable Seal</span>
        )}
      </div>

      {/* Print-only Logo (Ensures logo shows up in exports) */}
      <div className="hidden print:block absolute top-0 left-0 w-20 h-20">
         {settings.schoolLogo && <img src={settings.schoolLogo} className="w-full h-full object-contain" alt="Logo" />}
      </div>

      <div className="space-y-3">
        {/* Institutional Identity */}
        <div className="inline-block w-full max-w-4xl">
          <h1 className={`${isLandscape ? 'text-5xl' : 'text-4xl'} font-black ${isUBA ? 'text-blue-950' : 'text-slate-900'} tracking-tighter uppercase leading-tight`}>
            {readOnly ? (
              <span>{settings.schoolName || "UNITED BAYLOR ACADEMY"}</span>
            ) : (
              <EditableField 
                value={settings.schoolName || "UNITED BAYLOR ACADEMY"} 
                onChange={(v) => onSettingChange('schoolName', v.toUpperCase())} 
                className="text-center font-black w-full text-blue-950 border-none"
                placeholder="ACADEMY NAME"
              />
            )}
          </h1>
        </div>

        {/* Vision / Motto Statement */}
        <div className="inline-block w-full max-w-2xl">
          <div className="text-[11px] font-black text-blue-600/70 uppercase tracking-[0.6em] italic">
            {readOnly ? (
              <span>{settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"}</span>
            ) : (
              <EditableField 
                value={settings.schoolMotto || "EXCELLENCE IN KNOWLEDGE AND CHARACTER"} 
                onChange={(v) => onSettingChange('schoolMotto', v.toUpperCase())} 
                className="text-center w-full bg-transparent border-none"
                placeholder="SCHOOL MOTTO / VISION"
              />
            )}
          </div>
        </div>

        {/* Physical Locality Particulars */}
        <div className="mt-4 inline-block w-full max-w-3xl">
          <p className="text-[12px] font-black text-gray-500 uppercase tracking-[0.4em] leading-relaxed">
            {readOnly ? (
              <span>{settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"}</span>
            ) : (
              <EditableField 
                value={settings.schoolAddress || "ACCRA DIGITAL CENTRE, GHANA"} 
                onChange={(v) => onSettingChange('schoolAddress', v.toUpperCase())} 
                className="text-center w-full text-gray-500 border-none"
                placeholder="PHYSICAL LOCATION"
              />
            )}
          </p>
        </div>

        {/* Communication Nodes (Tel, Email, Web) */}
        <div className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4 text-[10px] font-black text-blue-800 uppercase tracking-widest mt-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">TEL:</span>
            {readOnly ? (
              <span>{settings.schoolContact}</span>
            ) : (
              <EditableField 
                value={settings.schoolContact || "+233 00 000 0000"} 
                onChange={(v) => onSettingChange('schoolContact', v)} 
                placeholder="+233..." 
                className="border-none" 
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-gray-400">EMAIL:</span>
            {readOnly ? (
              <span className="lowercase font-mono">{settings.schoolEmail || settings.registrantEmail}</span>
            ) : (
              <EditableField 
                value={settings.schoolEmail || settings.registrantEmail || "info@uba.edu"} 
                onChange={(v) => onSettingChange('schoolEmail', v.toLowerCase())} 
                placeholder="MAIL..." 
                className="lowercase border-none font-mono" 
              />
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">WEB:</span>
            {readOnly ? (
              <span className="lowercase font-mono">{settings.schoolWebsite || "www.uba.edu.gh"}</span>
            ) : (
              <EditableField 
                value={settings.schoolWebsite || "www.uba.edu.gh"} 
                onChange={(v) => onSettingChange('schoolWebsite', v.toLowerCase())} 
                placeholder="SITE..." 
                className="lowercase border-none font-mono" 
              />
            )}
          </div>
        </div>

        {/* Assessment Identification Strip */}
        <div className="mt-10 bg-blue-50/50 py-6 border-y-2 border-blue-900/10 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent,rgba(30,58,138,0.02),transparent)] pointer-events-none"></div>
          <h2 className="text-3xl font-black text-blue-900 uppercase tracking-tight relative">
            {readOnly ? (
              <span>{reportTitle}</span>
            ) : (
              <EditableField value={reportTitle} onChange={(v) => onSettingChange('examTitle', v.toUpperCase())} className="text-center w-full border-none" />
            )}
          </h2>
          {subtitle && (
            <p className="text-[10px] font-black text-blue-950/40 tracking-[0.6em] uppercase mt-2">
              {subtitle}
            </p>
          )}
        </div>

        {/* Handshake Metadata Strip */}
        <div className="flex justify-center items-center gap-12 text-[13px] font-black text-gray-800 uppercase tracking-[0.3em] mt-8">
           <div className="flex flex-col items-center">
              <span className="text-[7px] text-blue-400 mb-1 tracking-widest">TERM CYCLE</span>
              <div className="flex items-center gap-4">
                 {readOnly ? (
                   <span className="bg-blue-900 text-white px-6 py-1.5 rounded-lg shadow-lg">{settings.termInfo}</span>
                 ) : (
                   <EditableField value={settings.termInfo} onChange={(v) => onSettingChange('termInfo', v.toUpperCase())} className="bg-blue-900 text-white px-6 py-1.5 rounded-lg shadow-lg border-none" />
                 )}
              </div>
           </div>
           
           <div className="h-10 w-px bg-gray-200"></div>

           <div className="flex flex-col items-center">
              <span className="text-[7px] text-blue-400 mb-1 tracking-widest">SESSION NODE</span>
              <div className="flex items-center gap-4">
                 {readOnly ? (
                   <span className="text-blue-600 font-black">{settings.activeMock}</span>
                 ) : (
                   <EditableField value={settings.activeMock} onChange={(v) => onSettingChange('activeMock', v.toUpperCase())} className="text-blue-600 font-black border-none" />
                 )}
              </div>
           </div>

           <div className="h-10 w-px bg-gray-200"></div>

           <div className="flex flex-col items-center">
              <span className="text-[7px] text-blue-400 mb-1 tracking-widest">ACADEMIC PERIOD</span>
              <div className="flex items-center gap-4">
                 {readOnly ? (
                   <span className="italic font-serif">{settings.academicYear}</span>
                 ) : (
                   <EditableField value={settings.academicYear} onChange={(v) => onSettingChange('academicYear', v)} className="italic font-serif border-none" />
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ReportBrandingHeader;
