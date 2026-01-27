
import React, { useState } from 'react';
import { ProcessedStudent, ClassStatistics, GlobalSettings, StaffAssignment } from '../../types';
import CompositeSheet from './CompositeSheet';
import SupplementarySheet from './SupplementarySheet';
import InstitutionalAnalytics from './InstitutionalAnalytics';
import ReportBrandingHeader from '../shared/ReportBrandingHeader';

interface MasterSheetProps {
  students: ProcessedStudent[];
  stats: ClassStatistics;
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  facilitators: Record<string, StaffAssignment>;
  isFacilitator?: boolean;
}

const MOCK_SERIES = Array.from({ length: 10 }, (_, i) => `MOCK ${i + 1}`);

const MasterSheet: React.FC<MasterSheetProps> = ({ students, stats, settings, onSettingChange, facilitators, isFacilitator }) => {
  const [sheetView, setSheetView] = useState<'composite' | 'sectionA' | 'sectionB' | 'analytics'>('composite');

  return (
    <div className="bg-white p-4 print:p-0 min-h-screen max-w-full">
      <div className="no-print mb-8 flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex gap-2">
            <button onClick={() => setSheetView('composite')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'composite' ? 'bg-blue-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>NRT Composite</button>
            <button onClick={() => setSheetView('sectionA')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'sectionA' ? 'bg-indigo-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Obj (Sec A)</button>
            <button onClick={() => setSheetView('sectionB')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'sectionB' ? 'bg-purple-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Thy (Sec B)</button>
            <button onClick={() => setSheetView('analytics')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${sheetView === 'analytics' ? 'bg-emerald-700 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>Analytics</button>
        </div>
        <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
           {MOCK_SERIES.map(mock => (
             <button key={mock} onClick={() => onSettingChange('activeMock', mock)} className={`px-2 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all ${settings.activeMock === mock ? 'bg-blue-900 text-white shadow-md' : 'bg-white text-blue-900 hover:bg-blue-50'}`}>
               {mock.split(' ')[1]}
             </button>
           ))}
        </div>
      </div>

      <div id="broadsheet-export-container">
        <ReportBrandingHeader 
          settings={settings} 
          onSettingChange={onSettingChange} 
          reportTitle={settings.examTitle}
          subtitle={sheetView === 'composite' ? 'OFFICIAL MASTER BROAD SHEET' : sheetView === 'analytics' ? 'INSTITUTIONAL PERFORMANCE ANALYTICS' : `SUPPLEMENTARY SUB-SCORE SHEET (${sheetView.toUpperCase()})`}
          isLandscape={true}
        />

        <div className="min-h-[400px]">
          {sheetView === 'composite' && <CompositeSheet students={students} stats={stats} settings={settings} facilitators={facilitators} isFacilitator={isFacilitator} />}
          {sheetView === 'sectionA' && <SupplementarySheet students={students} stats={stats} settings={settings} section="sectionA" />}
          {sheetView === 'sectionB' && <SupplementarySheet students={students} stats={stats} settings={settings} section="sectionB" />}
          {sheetView === 'analytics' && <InstitutionalAnalytics students={students} stats={stats} settings={settings} facilitators={facilitators} onSettingChange={onSettingChange} />}
        </div>
      </div>
    </div>
  );
};

export default MasterSheet;
