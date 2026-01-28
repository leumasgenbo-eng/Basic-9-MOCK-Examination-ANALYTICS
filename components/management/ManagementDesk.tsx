
import React, { useState } from 'react';
import { StudentData, GlobalSettings, ProcessedStudent, StaffAssignment } from '../../types';

// Sub-portals
import ScoreEntryPortal from './ScoreEntryPortal';
import AcademyIdentityPortal from './AcademyIdentityPortal';
import PupilSBAPortal from './PupilSBAPortal';
import FacilitatorPortal from './FacilitatorPortal';
import GradingConfigPortal from './GradingConfigPortal';
import SeriesHistoryPortal from './SeriesHistoryPortal';
import MockResourcesPortal from './MockResourcesPortal';
import FacilitatorDesk from './FacilitatorDesk';
import LikelyQuestionDesk from './LikelyQuestionDesk';
import EnrolmentForwardingPortal from './EnrolmentForwardingPortal';
import LocalSyncPortal from './LocalSyncPortal';
import RewardPortal from './RewardPortal';

// Extracted UI Layout components
import ManagementHeader from './ManagementHeader';
import ManagementTabs, { ManagementTabType } from './ManagementTabs';

interface ManagementDeskProps {
  students: StudentData[];
  setStudents: React.Dispatch<React.SetStateAction<StudentData[]>>;
  facilitators: Record<string, StaffAssignment>;
  setFacilitators: React.Dispatch<React.SetStateAction<Record<string, StaffAssignment>>>;
  subjects: string[];
  settings: GlobalSettings;
  onSettingChange: (key: keyof GlobalSettings, value: any) => void;
  onBulkUpdate: (updates: Partial<GlobalSettings>) => void;
  onSave: () => void;
  processedSnapshot: ProcessedStudent[];
  onLoadDummyData: () => void;
  onClearData: () => void;
  isFacilitator?: boolean;
  activeFacilitator?: { name: string; subject: string } | null;
}

const ManagementDesk: React.FC<ManagementDeskProps> = ({ 
  students, setStudents, facilitators, setFacilitators, subjects, settings, onSettingChange, onBulkUpdate, onSave, processedSnapshot, onLoadDummyData, onClearData,
  isFacilitator, activeFacilitator
}) => {
  const [activeTab, setActiveTab] = useState<ManagementTabType>(isFacilitator ? 'facilitatorDesk' : 'scoreEntry');

  return (
    <div className="p-0 max-w-7xl mx-auto pb-24 animate-in fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <ManagementHeader 
            schoolName={settings.schoolName} 
            isHubActive={!!settings.schoolNumber} 
            onLoadDummyData={onLoadDummyData} 
            onClearData={onClearData}
            hasData={students.length > 0}
            isFacilitator={isFacilitator}
        />
        <ManagementTabs activeTab={activeTab} setActiveTab={setActiveTab} isFacilitator={isFacilitator} />
        <div className="p-6 md:p-10 min-h-[600px]">
          {activeTab === 'scoreEntry' && <ScoreEntryPortal students={students} setStudents={setStudents} settings={settings} onSettingChange={onSettingChange} subjects={subjects} processedSnapshot={processedSnapshot} onSave={onSave} />}
          {activeTab === 'facilitatorDesk' && <FacilitatorDesk students={students} setStudents={setStudents} settings={settings} onSettingChange={onSettingChange} onSave={onSave} />}
          {activeTab === 'likelyQuestions' && <LikelyQuestionDesk activeFacilitator={activeFacilitator} />}
          {activeTab === 'enrolmentForward' && <EnrolmentForwardingPortal settings={settings} students={students} facilitators={facilitators} />}
          {activeTab === 'localSync' && <LocalSyncPortal students={students} settings={settings} />}
          {activeTab === 'rewards' && <RewardPortal students={students} setStudents={setStudents} settings={settings} subjects={subjects} facilitators={facilitators} onSave={onSave} onSettingChange={onSettingChange} isFacilitator={isFacilitator} />}
          {activeTab === 'school' && <AcademyIdentityPortal settings={settings} onSettingChange={onSettingChange} onSave={onSave} />}
          {activeTab === 'pupils' && <PupilSBAPortal students={students} setStudents={setStudents} settings={settings} subjects={subjects} />}
          {activeTab === 'facilitators' && <FacilitatorPortal subjects={subjects} facilitators={facilitators} setFacilitators={setFacilitators} settings={settings} isFacilitator={isFacilitator} activeFacilitator={activeFacilitator} />}
          {activeTab === 'grading' && <GradingConfigPortal settings={settings} onSettingChange={onSettingChange} />}
          {activeTab === 'history' && <SeriesHistoryPortal students={students} settings={settings} />}
          {activeTab === 'resources' && <MockResourcesPortal settings={settings} onSettingChange={onSettingChange} subjects={subjects} />}
        </div>
      </div>
    </div>
  );
};

export default ManagementDesk;
