import React, { useState, useMemo, useRef } from 'react';
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
    
    const genderTerm = student.gender === 'M' ? 'male' : 'female';
    const regionalLocality = settings.schoolAddress.split(',')[0] || "this locality";

    const strengthText = strengths.length > 0 
        ? `Exhibits strong mastery in ${strengths.slice(0, 2).join(", ")}, performing significantly above the ${genderTerm} benchmark in ${regionalLocality}.` 
        : `Maintains a steady performance profile across core subjects within ${regionalLocality}.`;
    
    const weaknessText = weaknesses.length > 0
        ? `Remedial intervention in ${weaknesses.slice(0, 1).map(w => w.name).join("")} is advised to match the regional cohort average of ${weaknesses[0].mean}%.`
        : `Academic output is highly competitive within the regional perimeter.`;

    return { 
      performance: `${strengthText} ${weaknessText}`, 
      recommendation: student.bestSixAggregate <= 15 ? "Outstanding result. Continue consistent study habits." : "Needs more intensive focus on theoretical applications." 
    };
  }, [student, stats, settings.schoolAddress]);

  const handleShareWhatsApp = () => {
    const phone = student.parentContact.replace(/\s+/g, '').replace(/[^0-9]/g, '');
    const message = `*${settings.schoolName} - OFFICIAL ASSESSMENT ALERT*\n\n` +
                    `Dear Parent/Guardian,\n\n` +
                    `Assessment results for *${student.name}* (${settings.activeMock}) are now ready for review:\n\n` +
                    `• *Best 6 Aggregate:* ${student.bestSixAggregate}\n` +
                    `• *Class Position:* ${student.rank} of ${totalEnrolled}\n` +
                    `• *Status:* ${student.category}\n\n` +
                    `Please find the detailed attainment report attached or login to the Pupil Portal.\n\n` +
                    `_Generated via SS-Map Network Hub_`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleSendEmail = () => {
    const email = student.parentEmail || "";
    const subject = `Official Academic Report: ${student.name} - ${settings.schoolName}`;
    const body = `Assessment Period: ${settings.activeMock}\n` +
                 `Pupil Name: ${student.name}\n` +
                 `Aggregate Score: ${student.bestSixAggregate}\n` +
                 `Position: ${student.rank} of ${totalEnrolled}\n\n` +
                 `Kindly review the pupil's performance in the attached official PDF document.\n\n` +
                 `Institutional Administration,\n` +
                 `${settings.schoolName}`;
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleDownloadPDF = async () => {
    setIsGenerating(true);
    const reportId = `report-${student.id}`;
    const originalElement = document.getElementById(reportId);
    if (!originalElement) return setIsGenerating(false);
    
    // @ts-ignore
    const opt = { 
      margin: 0, 
      filename: `${student.name.replace(/\s+/g, '_')}_${settings.activeMock}_Report.pdf`, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(originalElement).save();
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  return (
    <div id={`report-${student.id}`} className="bg-white p-10 max-w-[210mm] mx-auto min-h-[296mm] border border-gray-200 shadow-2xl print:shadow-none print:border-none page-break relative flex flex-col box-border font-sans mb-20 last:mb-0">
       
       {/* ACTION COMMAND CENTER - Hidden for print */}
       <div data-html2canvas-ignore="true" className="absolute -top-4 right-0 no-print flex flex-wrap justify-end gap-3 z-[60]">
          <div className="bg-white p-2 rounded-2xl shadow-2xl border border-gray-100 flex items-center gap-3">
             <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-3 border-r">Dispatch Hub</span>
             
             {/* WhatsApp Button */}
             <button 
               onClick={handleShareWhatsApp}
               className="group flex items-center justify-center w-10 h-10 bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg transition-all active:scale-90"
               title="WhatsApp Parent"
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-7.6 8.38 8.38 0 0 1 3.8.9L21 3.5Z"></path></svg>
             </button>

             {/* Email Button */}
             <button 
               onClick={handleSendEmail}
               disabled={!student.parentEmail}
               className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-all active:scale-90 ${student.parentEmail ? 'bg-slate-800 hover:bg-black text-white' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
               title={student.parentEmail ? "Email Parent" : "Email Not Configured"}
             >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
             </button>

             {/* PDF Button */}
             <button 
               onClick={handleDownloadPDF}
               disabled={isGenerating}
               className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-lg transition-all active:scale-90 ${isGenerating ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700 text-white'}`}
               title="Download PDF Report"
             >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                )}
             </button>
          </div>
       </div>

       {/* Unified Academy Branding Header */}
       <ReportBrandingHeader 
         settings={settings} 
         onSettingChange={onSettingChange} 
         reportTitle={settings.examTitle}
         subtitle="INDIVIDUAL PUPIL ATTAINMENT REPORT"
       />

       {/* Pupil Particulars */}
       <div className="grid grid-cols-2 gap-6 mb-6 border-2 border-blue-950 p-4 rounded-3xl bg-blue-50/10 text-[12px] font-bold">
          <div className="space-y-2 border-r border-blue-100 pr-4">
            <div className="flex items-center"><span className="text-gray-400 w-28 uppercase text-[10px]">Pupil:</span><span className="flex-1 uppercase font-black text-blue-950 truncate">{student.name}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-28 uppercase text-[10px]">Index:</span><span className="flex-1 font-mono text-blue-800">{student.id.toString().padStart(6, '0')}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-28 uppercase text-[10px]">Sex:</span><span className="font-black text-blue-900">{student.gender === 'M' ? 'MALE' : 'FEMALE'}</span></div>
          </div>
          <div className="space-y-2 pl-2">
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Best 6 Aggregate:</span><span className="text-3xl font-black text-blue-950 leading-none">{student.bestSixAggregate}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[10px]">Position:</span><span className="font-black text-blue-900">{student.rank} OF {totalEnrolled || '---'}</span></div>
          </div>
       </div>

       {/* Performance Matrix */}
       <div className="mb-6 flex-1">
         <table className="w-full text-[11px] border-collapse border-2 border-blue-950">
            <thead className="bg-blue-950 text-white uppercase text-[8px] tracking-[0.2em]">
              <tr>
                <th className="py-3 px-4 text-left">Academic Discipline</th>
                <th className="py-3 px-1 text-center">Obj</th>
                <th className="py-3 px-1 text-center">Thy</th>
                <th className="py-3 px-1 text-center">SBA</th>
                <th className="py-3 px-1 text-center bg-blue-900">Total</th>
                <th className="py-3 px-1 text-center">Grd</th>
                <th className="py-3 px-3 text-left">Facilitator</th>
              </tr>
            </thead>
            <tbody>
               {student.subjects.map(sub => (
                 <tr key={sub.subject} className="even:bg-gray-50/50 border-b border-gray-100 font-bold">
                   <td className="px-4 py-2.5 text-blue-950 uppercase truncate">{sub.subject}</td>
                   <td className="py-2.5 text-center font-mono">{sub.sectionA ?? '-'}</td>
                   <td className="py-2.5 text-center font-mono">{sub.sectionB ?? '-'}</td>
                   <td className="py-2.5 text-center font-mono">{Math.round(sub.sbaScore)}</td>
                   <td className="py-2.5 text-center font-black text-sm bg-blue-50/50 text-blue-900">{Math.round(sub.finalCompositeScore)}</td>
                   <td className={`py-2.5 text-center font-black text-sm ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                   <td className="px-3 py-2.5 text-[9px] font-black text-blue-800 uppercase truncate italic opacity-60">{sub.facilitator}</td>
                 </tr>
               ))}
            </tbody>
         </table>
       </div>

       {/* Regional Remarks Analytics */}
       <div className="grid grid-cols-1 gap-3 mb-6 text-[11px]">
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm">
             <span className="font-black text-blue-900 uppercase block text-[9px] mb-2 tracking-widest">Regional Locality Analysis:</span>
             <p className="italic text-gray-700 leading-relaxed font-bold">"{dynamicAnalysis.performance}"</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100"><span className="font-black text-blue-900 uppercase block text-[9px] mb-2 tracking-widest">Conduct & Character:</span><p className="font-black text-blue-800 uppercase italic">"{student.conductRemark || 'EXEMPLARY CHARACTER OBSERVED.'}"</p></div>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100"><span className="font-black text-indigo-900 uppercase block text-[9px] mb-2 tracking-widest">Mastery Guidance:</span><div className="text-indigo-950 font-black italic"><EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none" /></div></div>
          </div>
       </div>

       {/* NRT Logic Appendix */}
       <div className="mt-auto pt-4 border-t border-gray-200">
          <div className="bg-gray-900 text-white p-4 rounded-xl space-y-2">
             <div className="flex justify-between items-center">
                <h5 className="text-[8px] font-black uppercase tracking-[0.2em]">Norm-Referenced Grading Appendix (NRT)</h5>
                <span className="text-[7px] font-bold opacity-40 uppercase">Distribution: {settings.useTDistribution ? 'T-Dist' : 'Normal Z'}</span>
             </div>
             <p className="text-[7px] leading-relaxed opacity-70">
                Grades are calculated relative to the cohort mean (<strong>μ</strong>) and standard deviation (<strong>σ</strong>). 
                An <strong>A1</strong> indicates performance significantly above the class average, while <strong>C-grades</strong> represent the Credit/Proficient zone. 
                BSA (Best Six Aggregate) is calculated using 4 Core + 2 best Electives. Lower aggregate = Higher distinction.
             </p>
          </div>
       </div>

       {/* Signatures & Resumption */}
       <div className="flex justify-between items-end mt-auto pb-6 pt-10 border-t border-gray-100">
         <div className="w-[30%] text-center border-t-2 border-gray-900 pt-2">
            <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">
              <EditableField 
                value={settings.adminRoleTitle || "Academy Director"} 
                onChange={(v) => onSettingChange('adminRoleTitle', v)} 
              />
            </p>
            <div className="font-black text-blue-900 text-[10px] uppercase">
               <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center" />
            </div>
         </div>
         <div className="w-[30%] text-center border-t-2 border-gray-900 pt-2">
            <p className="text-[9px] font-black uppercase text-gray-500 tracking-widest mb-1">Resumption Protocol</p>
            <p className="text-[10px] font-black text-red-700 font-mono">{new Date(settings.nextTermBegin).toLocaleDateString(undefined, { dateStyle: 'long' }).toUpperCase()}</p>
         </div>
       </div>
    </div>
  );
};

export default ReportCard;