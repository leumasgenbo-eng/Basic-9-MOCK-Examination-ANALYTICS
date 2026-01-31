import React, { useState, useMemo } from 'react';
import { ProcessedStudent, GlobalSettings, ClassStatistics } from '../../types';
import EditableField from '../shared/EditableField';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface ReportCardProps {
  student: ProcessedStudent;
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onStudentUpdate?: (id: number, overallRemark: string) => void;
  classAverageAggregate: number;
  totalEnrolled?: number;
  isFacilitator?: boolean;
}

const ReportCard: React.FC<ReportCardProps> = ({ student, stats, settings, onSettingChange, onStudentUpdate, classAverageAggregate, totalEnrolled, isFacilitator }) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const dynamicAnalysis = useMemo(() => {
    const strengths = student.subjects.filter(s => s.finalCompositeScore >= (stats.subjectMeans[s.subject] || 50) + 5).map(s => s.subject);
    const weaknesses = student.subjects.filter(s => s.finalCompositeScore < (stats.subjectMeans[s.subject] || 50)).map(s => ({ name: s.subject, mean: Math.round(stats.subjectMeans[s.subject]) }));
    
    const regionalLocality = settings.schoolAddress.split(',')[0] || "this locality";

    const strengthText = strengths.length > 0 
        ? `Exhibits mastery in ${strengths.slice(0, 2).join(", ")}, performing above the benchmark in ${regionalLocality}.` 
        : `Maintains a steady performance profile across core subjects.`;
    
    const weaknessText = weaknesses.length > 0
        ? `Remedial focus in ${weaknesses.slice(0, 1).map(w => w.name).join("")} is advised to bridge the gap with the cohort mean.`
        : `Academic output is highly competitive within the regional perimeter.`;

    return { 
      performance: `${strengthText} ${weaknessText}`, 
      recommendation: student.bestSixAggregate <= 15 ? "Outstanding result. Continue consistent study habits." : "Needs more intensive focus on theoretical applications." 
    };
  }, [student, stats, settings.schoolAddress]);

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    // Capture the specific report content starting from the stripe
    const reportId = `capture-area-${student.id}`;
    const element = document.getElementById(reportId);
    if (!element) return setIsGenerating(false);
    
    const opt = { 
      margin: 0, 
      filename: `${student.name.replace(/\s+/g, '_')}_Report.pdf`, 
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { 
        scale: 4, // Ultra-high fidelity capture
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        allowTaint: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794, // Fixed A4 pixel width at 96DPI
      }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (e) { 
        console.error("Screen Capture Fault:", e); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handleShareWhatsApp = () => {
    const phone = (student.parentContact || "").replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const message = `*${settings.schoolName} - ASSESSMENT ALERT*\n\n` +
                    `Results for *${student.name}* (${settings.activeMock}):\n` +
                    `• *Best 6 Aggregate:* ${student.bestSixAggregate}\n` +
                    `• *Class Position:* ${student.rank} of ${totalEnrolled}\n\n` +
                    `_Generated via SS-Map Institutional Hub_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex flex-col items-center mb-20 group">
       {/* 1. INSTITUTIONAL LOGO & ADDRESS - VISIBLE IN UI, IGNORED IN PDF (per request) */}
       <div className="w-[210mm] no-print mb-4 px-4 text-center opacity-60 group-hover:opacity-100 transition-opacity">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.5em] mb-4">Institutional Identity Shard (UI Preview Only)</p>
          <div className="flex flex-col items-center space-y-1">
             <h1 className="text-2xl font-black text-blue-900 uppercase">{settings.schoolName}</h1>
             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{settings.schoolAddress}</p>
          </div>
       </div>

       {/* 2. MAIN CAPTURE CONTAINER - FIXED A4 DIMENSIONS */}
       <div 
         id={`capture-area-${student.id}`} 
         className="bg-white w-[210mm] h-[297mm] shadow-[0_0_50px_rgba(0,0,0,0.1)] print:shadow-none relative flex flex-col p-8 box-border font-sans overflow-hidden border border-gray-100"
       >
          {/* INTERFACE ACTIONS - IGNORED IN CAPTURE */}
          <div data-html2canvas-ignore="true" className="absolute top-4 right-4 no-print flex gap-2 z-[100]">
             <button onClick={handleShareWhatsApp} className="w-10 h-10 bg-green-500 text-white rounded-xl shadow-lg flex items-center justify-center hover:scale-110 active:scale-95 transition-all" title="Share via WhatsApp">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5Z"/></svg>
             </button>
             <button onClick={handleDownloadPDF} disabled={isGenerating} className={`w-10 h-10 rounded-xl shadow-lg flex items-center justify-center transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white hover:scale-110 active:scale-95'}`} title="Screen Capture to PDF">
                {isGenerating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
             </button>
          </div>

          {/* ASSESSMENT STRIPE (START OF PDF) */}
          <div className="shrink-0 mb-6">
            <div className="bg-slate-900 text-white py-6 rounded-[2rem] text-center relative overflow-hidden shadow-2xl border-4 border-white">
               <h2 className="text-2xl font-black uppercase tracking-[0.1em]">{settings.examTitle}</h2>
               <p className="text-[9px] font-black text-blue-400 tracking-[0.5em] uppercase mt-2">INDIVIDUAL PUPIL ATTAINMENT REPORT</p>
            </div>
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-5 gap-3 text-[10px] font-black text-gray-800 uppercase tracking-widest mt-6">
               <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">Active Series</span><span className="font-mono">{settings.activeMock}</span></div>
               <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">Term Shard</span>{settings.termInfo}</div>
               <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">Academic Year</span>{settings.academicYear}</div>
               <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">Authority Title</span>{settings.adminRoleTitle || "Academy Director"}</div>
               <div className="flex flex-col items-center bg-gray-50 p-2 rounded-xl border border-gray-100"><span className="text-[7px] text-blue-500 mb-1">Registry Node</span>{settings.registryRoleTitle || "Examination Registry"}</div>
            </div>
          </div>

          {/* IDENTITY BLOCK */}
          <div className="grid grid-cols-2 gap-4 mb-6 border-2 border-blue-900 p-5 rounded-[2.5rem] bg-blue-50/5 text-[12px] font-bold shrink-0">
             <div className="space-y-2 border-r border-blue-100 pr-5">
               <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[10px]">Pupil:</span><span className="flex-1 uppercase font-black text-blue-950 truncate">{student.name}</span></div>
               <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[10px]">Index:</span><span className="flex-1 font-mono text-blue-800">{student.id.toString().padStart(6, '0')}</span></div>
               <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[10px]">Attendance:</span><span className="font-black text-blue-900">{student.attendance} OF {settings.attendanceTotal}</span></div>
             </div>
             <div className="space-y-2 pl-5">
               <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Best 6 Aggregate:</span><span className="text-4xl font-black text-blue-950 leading-none">{student.bestSixAggregate}</span></div>
               <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Class Position:</span><span className="font-black text-blue-900">{student.rank} OF {totalEnrolled || '---'}</span></div>
               <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Academic Level:</span><span className={`px-4 py-1 rounded text-white text-[10px] font-black uppercase ${student.category === 'Distinction' ? 'bg-green-600' : 'bg-blue-600'}`}>{student.category}</span></div>
             </div>
          </div>

          {/* RESULTS MATRIX */}
          <div className="mb-6 flex-1 overflow-hidden">
            <table className="w-full text-[12px] border-collapse border-2 border-blue-900">
               <thead className="bg-blue-950 text-white uppercase text-[10px] tracking-widest">
                 <tr>
                   <th className="py-3 px-6 text-left">Academic Discipline</th>
                   <th className="py-3 px-1 text-center w-12">Obj</th>
                   <th className="py-3 px-1 text-center w-12">Thy</th>
                   <th className="py-3 px-1 text-center w-12">SBA</th>
                   <th className="py-3 px-1 text-center w-16 bg-blue-900">Total</th>
                   <th className="py-3 px-1 text-center w-12">Grd</th>
                   <th className="py-3 px-6 text-left">Facilitator</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {student.subjects.map(sub => (
                    <tr key={sub.subject} className="even:bg-gray-50/30 font-bold h-9">
                      <td className="px-6 py-1 text-blue-950 uppercase truncate max-w-[180px]">{sub.subject}</td>
                      <td className="py-1 text-center font-mono">{sub.sectionA ?? '-'}</td>
                      <td className="py-1 text-center font-mono">{sub.sectionB ?? '-'}</td>
                      <td className="py-1 text-center font-mono">{Math.round(sub.sbaScore)}</td>
                      <td className="py-1 text-center font-black bg-blue-50/50 text-blue-900">{Math.round(sub.finalCompositeScore)}</td>
                      <td className={`py-1 text-center font-black ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                      <td className="px-6 py-1 text-[10px] font-black text-blue-800 uppercase truncate opacity-60 italic">{sub.facilitator}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>

          {/* REMARKS SECTOR */}
          <div className="grid grid-cols-1 gap-4 mb-6 text-[12px] shrink-0">
             <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-sm relative">
                <span className="font-black text-blue-900 uppercase block text-[9px] mb-2 tracking-[0.3em]">Performance Shard Analysis:</span>
                <p className="italic text-gray-700 leading-relaxed font-bold">"{dynamicAnalysis.performance}"</p>
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-blue-50/30 p-5 rounded-[2rem] border border-blue-100">
                  <span className="font-black text-blue-900 uppercase block text-[9px] mb-2 tracking-[0.3em]">Conduct & Character:</span>
                  <p className="font-black text-blue-800 uppercase italic leading-tight">"{student.conductRemark || 'EXEMPLARY CHARACTER OBSERVED.'}"</p>
               </div>
               <div className="bg-indigo-50/30 p-5 rounded-[2rem] border border-indigo-100">
                  <span className="font-black text-indigo-900 uppercase block text-[9px] mb-2 tracking-[0.3em]">Mastery Guidance:</span>
                  <div className="text-indigo-950 font-black italic leading-tight">
                    <EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none text-[12px]" />
                  </div>
               </div>
             </div>
          </div>

          {/* LOGIC APPENDIX */}
          <div className="mt-auto pt-4 border-t border-gray-100 shrink-0">
             <div className="bg-slate-900 text-white p-5 rounded-[2rem] flex justify-between items-center gap-8">
                <div className="flex-1">
                   <h5 className="text-[9px] font-black uppercase tracking-[0.3em] mb-1">NRT Grading Logic (σ-Spread: {settings.useTDistribution ? 'T-Dist' : 'Normal Z'})</h5>
                   <p className="text-[9px] leading-tight opacity-70 uppercase tracking-widest">Grades derived relative to cohort mean (μ). BSA calculated from 4 Core + 2 best Electives. Lower aggregate signifies proficiency.</p>
                </div>
                <div className="text-[10px] font-mono opacity-30 text-right uppercase">Network Shard<br/>{student.id.toString(16).toUpperCase().padStart(2, '0')}</div>
             </div>
          </div>

          {/* VALIDATION SIGNATURES */}
          <div className="flex justify-between items-end mt-8 pb-2 border-t border-gray-100 pt-5 shrink-0">
            <div className="w-[30%] text-center border-t-2 border-gray-900 pt-2">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">
                 <EditableField value={settings.adminRoleTitle || "Academy Director"} onChange={(v) => onSettingChange('adminRoleTitle', v)} />
               </p>
               <div className="font-black text-blue-900 text-[11px] uppercase truncate">
                  <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center" />
               </div>
            </div>
            <div className="w-[30%] text-center border-t-2 border-gray-900 pt-2">
               <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-1">Resumption Protocol</p>
               <div className="font-black text-red-700 text-[11px] uppercase">
                  <EditableField value={settings.nextTermBegin} onChange={(v) => onSettingChange('nextTermBegin', v)} className="text-center" />
               </div>
            </div>
          </div>
       </div>
    </div>
  );
};

export default ReportCard;