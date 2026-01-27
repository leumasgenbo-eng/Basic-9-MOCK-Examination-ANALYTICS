
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

  const handleSharePDF = async () => {
    setIsGenerating(true);
    const reportId = `report-${student.id}`;
    const originalElement = document.getElementById(reportId);
    if (!originalElement) return setIsGenerating(false);
    
    const opt = { 
      margin: 0, 
      filename: `${student.name.replace(/\s+/g, '_')}_Report.pdf`, 
      image: { type: 'jpeg', quality: 0.98 }, 
      html2canvas: { scale: 2 }, 
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
    };
    try {
        // @ts-ignore
        await window.html2pdf().set(opt).from(originalElement).save();
    } catch (e) { console.error(e); } finally { setIsGenerating(false); }
  };

  const renderAppendix = () => (
    <div className="mt-2 pt-2 border-t border-gray-200">
      <div className={`${settings.reportTemplate === 'minimal' ? 'bg-gray-50 border border-gray-200 text-gray-600' : 'bg-gray-900 text-white'} p-3 rounded-xl space-y-1`}>
        <div className="flex justify-between items-center">
          <h5 className="text-[7px] font-black uppercase tracking-[0.2em]">Norm-Referenced Grading Appendix (NRT)</h5>
          <span className="text-[6px] font-bold opacity-40 uppercase">Distribution: {settings.useTDistribution ? 'T-Dist' : 'Normal Z'}</span>
        </div>
        <p className="text-[6px] leading-tight opacity-70">
          Grades derived from cohort mean (μ) and standard deviation (σ). 
          A1 = Excellence; C = Credit/Proficient. BSA = 4 Core + 2 best Electives.
        </p>
      </div>
    </div>
  );

  const renderSignatures = () => (
    <div className="flex justify-between items-end mt-auto pb-4 pt-4 border-t border-gray-100">
      <div className="w-[30%] text-center border-t border-gray-900 pt-1">
        <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest mb-0.5">Academy Director</p>
        <div className="font-black text-blue-900 text-[9px] uppercase">
          <EditableField value={settings.headTeacherName} onChange={(v) => onSettingChange('headTeacherName', v)} className="text-center" />
        </div>
      </div>
      <div className="w-[30%] text-center border-t border-gray-900 pt-1">
        <p className="text-[8px] font-black uppercase text-gray-500 tracking-widest mb-0.5">Resumption Protocol</p>
        <p className="text-[9px] font-black text-red-700 font-mono">{new Date(settings.nextTermBegin).toLocaleDateString(undefined, { dateStyle: 'medium' }).toUpperCase()}</p>
      </div>
    </div>
  );

  const TemplateWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => (
    <div 
      id={`report-${student.id}`} 
      className={`bg-white p-8 w-[210mm] h-[297mm] mx-auto border border-gray-200 shadow-2xl print:shadow-none print:border-none relative flex flex-col box-border font-sans overflow-hidden page-break ${className}`}
      style={{ minHeight: '297mm', maxHeight: '297mm' }}
    >
      <div data-html2canvas-ignore="true" className="absolute top-4 -right-16 flex flex-col gap-4 no-print z-50">
        <button onClick={handleSharePDF} disabled={isGenerating} className={`${isGenerating ? 'bg-gray-400' : 'bg-blue-900 hover:bg-black'} text-white w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition-all transform hover:scale-110`}>
          {isGenerating ? <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
        </button>
      </div>
      {children}
    </div>
  );

  // --- MINIMAL TEMPLATE ---
  if (settings.reportTemplate === 'minimal') {
    return (
      <TemplateWrapper className="rounded-none">
        <ReportBrandingHeader settings={settings} onSettingChange={onSettingChange} reportTitle={settings.examTitle} subtitle="STUDENT PERFORMANCE PROFILE" />
        
        <div className="flex flex-col gap-4 mb-4 mt-2">
          <div className="flex justify-between items-end border-b border-gray-100 pb-2">
            <div className="space-y-1">
              <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest">Candidate Name</span>
              <h3 className="text-xl font-black text-gray-900 uppercase">{student.name}</h3>
              <p className="text-[10px] text-gray-500 font-mono">Node: {student.id}</p>
            </div>
            <div className="text-right">
              <span className="text-[8px] text-gray-400 uppercase font-black tracking-widest">Aggregate</span>
              <div className="flex items-center gap-2">
                 <span className="text-4xl font-black text-blue-600">{student.bestSixAggregate}</span>
                 <span className="bg-blue-900 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase">{student.category}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-2 bg-gray-50 rounded-xl">
               <span className="text-[7px] font-black text-gray-400 uppercase block mb-0.5">Position</span>
               <p className="text-sm font-black text-gray-800">{student.rank} <span className="text-[9px] text-gray-400">/ {totalEnrolled}</span></p>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl">
               <span className="text-[7px] font-black text-gray-400 uppercase block mb-0.5">Gender</span>
               <p className="text-sm font-black text-gray-800">{student.gender === 'M' ? 'MALE' : 'FEMALE'}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-xl">
               <span className="text-[7px] font-black text-gray-400 uppercase block mb-0.5">Attendance</span>
               <p className="text-sm font-black text-gray-800">{student.attendance} <span className="text-[9px] text-gray-400">DAYS</span></p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <table className="w-full text-[11px] mb-4">
             <thead className="bg-gray-100 text-gray-500">
               <tr>
                 <th className="py-2 px-4 text-left rounded-tl-xl uppercase text-[8px] font-black tracking-widest">Subject</th>
                 <th className="text-center uppercase text-[8px] font-black tracking-widest">Score</th>
                 <th className="text-center uppercase text-[8px] font-black tracking-widest">Grade</th>
                 <th className="py-2 px-4 text-right rounded-tr-xl uppercase text-[8px] font-black tracking-widest">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-gray-100">
               {student.subjects.map(sub => (
                 <tr key={sub.subject} className="leading-tight">
                   <td className="py-1.5 px-4 font-bold text-gray-700 uppercase">{sub.subject}</td>
                   <td className="text-center font-mono font-black">{Math.round(sub.finalCompositeScore)}</td>
                   <td className="text-center font-black text-blue-600">{sub.grade}</td>
                   <td className="py-1.5 px-4 text-right text-[9px] italic text-gray-400">{sub.remark}</td>
                 </tr>
               ))}
             </tbody>
          </table>
        </div>

        <div className="space-y-3 mb-4">
           <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-1 block">Performance Analysis</span>
              <p className="text-[11px] font-medium text-blue-900 leading-tight italic">"{dynamicAnalysis.performance}"</p>
           </div>
           <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Conduct</span>
                <p className="text-[9px] font-black text-gray-700 uppercase italic leading-tight">"{student.conductRemark || 'SATISFACTORY'}"</p>
              </div>
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1 block">Teacher Note</span>
                <div className="text-[9px] font-black text-indigo-950 italic leading-tight">
                  <EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none p-0" />
                </div>
              </div>
           </div>
        </div>

        {renderAppendix()}
        {renderSignatures()}
      </TemplateWrapper>
    );
  }

  // --- PRESTIGE TEMPLATE ---
  if (settings.reportTemplate === 'prestige') {
    return (
      <TemplateWrapper className="border-[10px] border-double border-gray-900">
        <div className="flex flex-col items-center mb-4 border-b border-gray-950 pb-4">
           {settings.schoolLogo && <img src={settings.schoolLogo} alt="Seal" className="w-16 h-16 mb-2" />}
           <h1 className="text-3xl font-serif font-black uppercase text-gray-950 tracking-widest text-center leading-none">
             <EditableField value={settings.schoolName} onChange={(v) => onSettingChange('schoolName', v)} className="text-center font-serif" />
           </h1>
           <p className="text-[8px] font-bold uppercase tracking-[0.4em] text-gray-600 mb-2">Academic Excellence Index</p>
           <div className="flex gap-6 text-[8px] font-black uppercase text-gray-500 tracking-widest border-y border-gray-100 py-1 w-full justify-center">
              <EditableField value={settings.schoolAddress} onChange={(v) => onSettingChange('schoolAddress', v)} />
              <span>|</span>
              <EditableField value={settings.schoolContact} onChange={(v) => onSettingChange('schoolContact', v)} />
           </div>
        </div>

        <div className="text-center mb-4 space-y-1">
           <h2 className="text-xl font-serif italic text-gray-800">Transcript of Academic Record</h2>
           <p className="text-[10px] font-black text-red-800 tracking-[0.3em] uppercase">{settings.examTitle}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-200 mb-4">
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                 <div className="flex flex-col"><span className="text-[7px] font-black uppercase text-gray-400">Candidate</span><span className="text-lg font-serif font-black text-gray-950 uppercase border-b border-gray-300">{student.name}</span></div>
                 <div className="flex flex-col"><span className="text-[7px] font-black uppercase text-gray-400">Hub Ranking</span><span className="text-sm font-black text-gray-700">Ranked No. {student.rank} of {totalEnrolled}</span></div>
              </div>
              <div className="flex flex-col items-end justify-center">
                 <span className="text-[7px] font-black uppercase text-gray-400 mb-1">Merit Aggregate</span>
                 <div className="w-16 h-16 rounded-full border-4 border-gray-950 flex items-center justify-center text-3xl font-black text-gray-950">
                    {student.bestSixAggregate}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex-1 overflow-hidden">
           <table className="w-full text-[11px] border-collapse">
              <thead>
                <tr className="bg-gray-950 text-white uppercase text-[7px] tracking-widest">
                  <th className="py-2 px-6 text-left">Academic Discipline</th>
                  <th className="text-center">Score</th>
                  <th className="text-center">Grade</th>
                  <th className="py-2 px-6 text-right">Appraisal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {student.subjects.map(sub => (
                  <tr key={sub.subject} className="leading-tight">
                    <td className="py-1.5 px-6 font-serif font-black text-gray-900 uppercase">{sub.subject}</td>
                    <td className="text-center font-mono font-bold text-gray-600">{Math.round(sub.finalCompositeScore)}%</td>
                    <td className="text-center font-black text-base text-gray-950">{sub.grade}</td>
                    <td className="py-1.5 px-6 text-right text-[8px] uppercase font-bold text-gray-400 italic">{sub.remark}</td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>

        <div className="mt-4 mb-4">
           <div className="p-4 border-l-4 border-gray-950 bg-gray-50 italic text-[11px] text-gray-800 font-serif leading-tight">
             "{dynamicAnalysis.performance} {student.overallRemark || dynamicAnalysis.recommendation}"
           </div>
        </div>

        {renderAppendix()}
        {renderSignatures()}
      </TemplateWrapper>
    );
  }

  // --- DEFAULT/STANDARD TEMPLATE ---
  return (
    <TemplateWrapper>
       <ReportBrandingHeader settings={settings} onSettingChange={onSettingChange} reportTitle={settings.examTitle} subtitle="INDIVIDUAL PUPIL ATTAINMENT REPORT" />

       <div className="grid grid-cols-2 gap-4 mb-4 border-2 border-blue-950 p-3 rounded-2xl bg-blue-50/10 text-[11px] font-bold">
          <div className="space-y-1 border-r border-blue-100 pr-3">
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[9px]">Pupil:</span><span className="flex-1 uppercase font-black text-blue-950 truncate">{student.name}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[9px]">Index:</span><span className="flex-1 font-mono text-blue-800">{student.id.toString().padStart(6, '0')}</span></div>
            <div className="flex items-center"><span className="text-gray-400 w-24 uppercase text-[9px]">Sex:</span><span className="font-black text-blue-900">{student.gender === 'M' ? 'MALE' : 'FEMALE'}</span></div>
          </div>
          <div className="space-y-1 pl-1">
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[9px]">Best 6 Agg:</span><span className="text-2xl font-black text-blue-950 leading-none">{student.bestSixAggregate}</span></div>
            <div className="flex items-center justify-between"><span className="text-gray-400 uppercase text-[9px]">Position:</span><span className="font-black text-blue-900">{student.rank} OF {totalEnrolled}</span></div>
          </div>
       </div>

       <div className="mb-4 flex-1 overflow-hidden">
         <table className="w-full text-[10px] border-collapse border-2 border-blue-950">
            <thead className="bg-blue-950 text-white uppercase text-[7px] tracking-[0.2em]">
              <tr>
                <th className="py-2 px-3 text-left">Discipline</th>
                <th className="py-2 px-1 text-center">Obj</th>
                <th className="py-2 px-1 text-center">Thy</th>
                <th className="py-2 px-1 text-center">SBA</th>
                <th className="py-2 px-1 text-center bg-blue-900">Total</th>
                <th className="py-2 px-1 text-center">Grd</th>
                <th className="py-2 px-2 text-left">Facilitator</th>
              </tr>
            </thead>
            <tbody>
               {student.subjects.map(sub => (
                 <tr key={sub.subject} className="even:bg-gray-50/50 border-b border-gray-100 font-bold leading-tight">
                   <td className="px-3 py-1.5 text-blue-950 uppercase truncate max-w-[120px]">{sub.subject}</td>
                   <td className="py-1.5 text-center font-mono">{sub.sectionA ?? '-'}</td>
                   <td className="py-1.5 text-center font-mono">{sub.sectionB ?? '-'}</td>
                   <td className="py-1.5 text-center font-mono">{Math.round(sub.sbaScore)}</td>
                   <td className="py-1.5 text-center font-black text-[11px] bg-blue-50/50 text-blue-900">{Math.round(sub.finalCompositeScore)}</td>
                   <td className={`py-1.5 text-center font-black text-[11px] ${sub.gradeValue >= 7 ? 'text-red-700' : 'text-blue-950'}`}>{sub.grade}</td>
                   <td className="px-2 py-1.5 text-[8px] font-black text-blue-800 uppercase truncate italic opacity-60">{sub.facilitator}</td>
                 </tr>
               ))}
            </tbody>
         </table>
       </div>

       <div className="grid grid-cols-1 gap-2 mb-2 text-[10px]">
          <div className="bg-gray-50 p-2 rounded-xl border border-gray-200">
             <span className="font-black text-blue-900 uppercase block text-[8px] mb-1 tracking-widest">Regional Analysis:</span>
             <p className="italic text-gray-700 leading-tight font-bold">"{dynamicAnalysis.performance}"</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-50/50 p-2 rounded-xl border border-blue-100"><span className="font-black text-blue-900 uppercase block text-[8px] mb-1 tracking-widest">Character:</span><p className="font-black text-blue-800 uppercase italic text-[9px]">"{student.conductRemark || 'EXEMPLARY CHARACTER.'}"</p></div>
            <div className="bg-indigo-50/50 p-2 rounded-xl border border-indigo-100"><span className="font-black text-indigo-900 uppercase block text-[8px] mb-1 tracking-widest">Guidance:</span><div className="text-indigo-950 font-black italic text-[9px]"><EditableField value={student.overallRemark} onChange={(v) => onStudentUpdate?.(student.id, v)} multiline={true} placeholder={dynamicAnalysis.recommendation} className="w-full border-none p-0" /></div></div>
          </div>
       </div>

       {renderAppendix()}
       {renderSignatures()}
    </TemplateWrapper>
  );
};

export default ReportCard;
