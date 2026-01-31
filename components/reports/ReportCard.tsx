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
    // Targeting the strict A4 capture area
    const captureId = `capture-area-${student.id}`;
    const element = document.getElementById(captureId);
    if (!element) return setIsGenerating(false);
    
    const opt = { 
      margin: 0, 
      filename: `${student.name.replace(/\s+/g, '_')}_Report.pdf`, 
      image: { type: 'jpeg', quality: 1.0 }, 
      html2canvas: { 
        scale: 4, 
        useCORS: true, 
        logging: false, 
        letterRendering: true,
        allowTaint: false,
        scrollY: 0,
        scrollX: 0,
        windowWidth: 794 // Strict A4 Width at 96DPI
      }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(element).save();
    } catch (e) { 
        console.error("PDF Engine Fault:", e); 
    } finally { 
        setIsGenerating(false); 
    }
  };

  const handlePrintDirect = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center mb-24 group">
       {/* 1. VISUAL PREVIEW: Full Institutional Header (UI ONLY) */}
       <div className="w-[210mm] no-print mb-6 px-10 text-center animate-in fade-in duration-1000">
          <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mb-4 opacity-40 group-hover:opacity-100 transition-opacity">Preview Shard (Excluded from Capture)</p>
          <div className="flex flex-col items-center space-y-2 border-b-2 border-dashed border-gray-200 pb-6">
             <h1 className="text-3xl font-black text-blue-950 uppercase tracking-tighter leading-none">{settings.schoolName}</h1>
             <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest italic leading-relaxed max-w-lg">{settings.schoolMotto}</p>
             <div className="flex gap-4 text-[9px] font-black text-gray-500 uppercase">
                <span>{settings.schoolAddress}</span>
                <span className="text-gray-300">|</span>
                <span>{settings.schoolContact}</span>
             </div>
          </div>
       </div>

       {/* 2. OFFICIAL A4 CONTAINER - Captured from Stripe down to Signatures */}
       <div 
         id={`capture-area-${student.id}`} 
         className="bg-white w-[210mm] h-[297mm] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] print:shadow-none relative flex flex-col p-10 box-border font-sans overflow-hidden border border-gray-100 print:border-none print:m-0 print:p-10"
       >
          {/* CONTROL OVERLAY - HIDDEN FOR PRINT/PDF */}
          <div data-html2canvas-ignore="true" className="absolute top-6 right-6 no-print flex gap-3 z-[100] opacity-0 group-hover:opacity-100 transition-opacity">
             <button 
               onClick={handlePrintDirect} 
               className="w-12 h-12 bg-blue-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
               title="Direct Print Preview"
             >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
             </button>
             <button 
               onClick={handleDownloadPDF} 
               disabled={isGenerating} 
               className={`w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all ${isGenerating ? 'bg-gray-400' : 'bg-red-600 text-white hover:scale-110 active:scale-95'}`}
               title="Save PDF Shard"
             >
                {isGenerating ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>}
             </button>
          </div>

          {/* ASSESSMENT STRIPE (START OF OFFICIAL CAPTURE) */}
          <div className="shrink-0">
            <div className="bg-slate-900 text-white py-8 rounded-[2.5rem] text-center relative overflow-hidden shadow-2xl border-4 border-white mb-6">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50"></div>
               <h2 className="text-3xl font-black uppercase tracking-[0.15em] leading-none mb-2">{settings.examTitle}</h2>
               <p className="text-[10px] font-black text-blue-400 tracking-[0.6em] uppercase">INDIVIDUAL PUPIL ATTAINMENT REPORT</p>
            </div>
            
            <div className="grid grid-cols-5 gap-4 text-[11px] font-black text-gray-800 uppercase tracking-widest mb-8 px-2">
               <div className="flex flex-col items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  <span className="text-[7px] text-blue-500 mb-1">Active Series</span>
                  <span className="font-mono text-blue-900">{settings.activeMock}</span>
               </div>
               <div className="flex flex-col items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  <span className="text-[7px] text-blue-500 mb-1">Term Shard</span>
                  <span className="text-blue-900">{settings.termInfo}</span>
               </div>
               <div className="flex flex-col items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  <span className="text-[7px] text-blue-500 mb-1">Academic Year</span>
                  <span className="text-blue-900">{settings.academicYear}</span>
               </div>
               <div className="flex flex-col items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  <span className="text-[7px] text-blue-500 mb-1">Authority Title</span>
                  <span className="text-blue-900 truncate w-full text-center px-1">{settings.adminRoleTitle || "Academy Director"}</span>
               </div>
               <div className="flex flex-col items-center bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  <span className="text-[7px] text-blue-500 mb-1">Registry Node</span>
                  <span className="text-blue-900 truncate w-full text-center px-1">{settings.registryRoleTitle || "Examination Registry"}</span>
               </div>
            </div>
          </div>

          {/* IDENTITY CLUSTER */}
          <div className="grid grid-cols-2 gap-8 mb-8 border-2 border-blue-900 p-6 rounded-[3rem] bg-blue-50/5 text-[14px] font-bold shrink-0">
             <div className="space-y-3 border-r-2 border-blue-100 pr-8">
               <div className="flex items-center"><span className="text-gray-400 w-28 uppercase text-[10px]">Pupil:</span><span className="flex-1 uppercase font-black text-blue-950 truncate">{student.name}</span></div>
               <div className="flex items-center"><span className="text-gray-400 w-28 uppercase text-[10px]">Index:</span><span className="flex-1 font-mono text-blue-800">{student.id.toString().padStart(6, '0')}</span></div>
               <div className="flex items-center"><span className="text-gray-400 w-28 uppercase text-[10px]">Attendance:</span><span className="font-black text-blue-900">{student.attendance} OF {settings.attendanceTotal}</span></div>
             </div>
             <div className="space-y-3 pl-4">
               <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Best 6 Aggregate:</span><span className="text-4xl font-black text-blue-950 leading-none">{student.bestSixAggregate}</span></div>
               <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Class Position:</span><span className="font-black text-blue-900">{student.rank} OF {totalEnrolled || '---'}</span></div>
               <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Academic Level:</span><span className={`px-5 py-1 rounded-xl text-white text-[11px] font-black uppercase ${student.category === 'Distinction' ? 'bg-green-600' : 'bg-blue-600'}`}>{student.category}</span></div>
             </div>
          </div>

          {/* ACADEMIC MATRIX */}
          <div className="mb-8 flex-1 overflow-hidden">
            <table className="w-full text-[13px] border-collapse border-2 border-blue-900">
               <thead className="bg-blue-950 text-white uppercase text-[10px] font-black tracking-widest">
                 <tr>
                   <th className="py-4 px-6 text-left">Academic Discipline</th>
                   <th className="py-4 px-1 text-center w-12">Obj</th>
                   <th className="py-4 px-1 text-center w-12">Thy</th>
                   <th className="py-4 px-1 text-center w-12">SBA</th>
                   <th className="py-4 px-1 text-center w-20 bg-blue-900">Total</th>
                   <th className="py-4 px-1 text-center w-14">Grd</th>
                   <th className="py-4 px-6 text-left">Facilitator</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                  {student.subjects.map(sub => (
                    <tr key={sub.subject} className="even:bg-gray-50/50 font-bold h-10 border-b border-gray-100">
                      <td className="px-6 py-1 text-blue-950 uppercase truncate max-w-[180px]">{sub.subject}</td>
                      <td className="py-1 text-center font-mono text-gray-500">{sub.sectionA ?? '-'}</td>
                      <td className="py-1 text-center font-mono text-gray-500">{sub.sectionB ?? '-'}</td>
                      <td className="py-1 text-center font-mono text-gray-500">{Math.round(sub.sbaScore)}</td>
                      <td className="py-1 text-center font-black bg-blue-50/50 text-blue-900">{Math.round(sub.finalCompositeScore)}</td>
                      <td className={`py-1 text-center font-black ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                      <td className="px-6 py-1 text-[10px] font-black text-blue-800 uppercase truncate opacity-40 italic">{sub.facilitator}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>

          {/* REMARKS CLUSTER */}
          <div className="grid grid-cols-1 gap-5 mb-8 text-[13px] shrink-0">
             <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <span className="font-black text-blue-900 uppercase block text-[10px] mb-2 tracking-[0.4em]">Performance Shard Analysis:</span>
                <p className="italic text-gray-700 leading-relaxed font-bold">"{dynamicAnalysis.performance}"</p>
             </div>
             <div className="grid grid-cols-2 gap-5">
               <div className="bg-blue-50/30 p-6 rounded-[2.5rem] border border-blue-100">
                  <span className="font-black text-blue-900 uppercase block text-[10px] mb-2 tracking-[0.4em]">Conduct & Character:</span>
                  <p className="font-black text-blue-800 uppercase italic leading-tight">"{student.conductRemark || 'EXEMPLARY CHARACTER OBSERVED.'}"</p>
               </div>
               <div className="bg-indigo-50/30 p-6 rounded-[2.5rem] border border-indigo-100">
                  <span className="font-black text-indigo-900 uppercase block text-[10px] mb-2 tracking-[0.4em]">Mastery Guidance:</span>
                  <div className="text-indigo-950 font-black italic leading-tight">
                    <EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none text-[13px]" />
                  </div>
               </div>
             </div>
          </div>

          {/* NRT APPENDIX */}
          <div className="mt-auto pt-6 border-t border-gray-100 shrink-0">
             <div className="bg-slate-900 text-white p-6 rounded-[2.5rem] flex justify-between items-center gap-10">
                <div className="flex-1">
                   <h5 className="text-[10px] font-black uppercase tracking-[0.3em] mb-1">NRT Grading Logic (σ-Spread: {settings.useTDistribution ? 'T-Dist' : 'Normal Z'})</h5>
                   <p className="text-[10px] leading-tight opacity-70 uppercase tracking-widest">Grades derived relative to cohort mean (μ). BSA calculated from 4 Core + 2 best Electives. Lower aggregate signifies proficiency.</p>
                </div>
                <div className="text-[11px] font-mono opacity-20 text-right uppercase">Network Shard<br/>{student.id.toString(16).toUpperCase().padStart(4, '0')}</div>
             </div>
          </div>

          {/* VALIDATION NODE (END OF OFFICIAL CAPTURE) */}
          <div className="flex justify-between items-end mt-10 pb-2 border-t border-gray-100 pt-6 shrink-0">
            <div className="w-[35%] text-center border-t-2 border-gray-900 pt-3">
               <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-1">
                 <EditableField value={settings.adminRoleTitle || "Academy Director"} onChange={(v) => onSettingChange('adminRoleTitle', v)} />
               </p>
               <div className="font-black text-blue-900 text-[12px] uppercase truncate">
                  <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center" />
               </div>
            </div>
            <div className="w-[35%] text-center border-t-2 border-gray-900 pt-3">
               <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-1">Resumption Protocol</p>
               <div className="font-black text-red-700 text-[12px] uppercase">
                  <EditableField value={settings.nextTermBegin} onChange={(v) => onSettingChange('nextTermBegin', v)} className="text-center" />
               </div>
            </div>
          </div>
       </div>
    </div>
  );
};

export default ReportCard;