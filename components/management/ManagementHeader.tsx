
import React from 'react';

interface ManagementHeaderProps {
  schoolName: string;
  isHubActive: boolean;
  onLoadDummyData: () => void;
  onClearData: () => void;
  hasData: boolean;
  isFacilitator?: boolean;
}

const ManagementHeader: React.FC<ManagementHeaderProps> = ({ 
  schoolName, 
  isHubActive, 
  onLoadDummyData, 
  onClearData, 
  hasData,
  isFacilitator 
}) => {
  return (
    <div className={`text-white p-4 sm:p-6 md:p-8 transition-colors duration-500 ${isFacilitator ? 'bg-indigo-900' : 'bg-blue-900'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight flex items-center justify-center sm:justify-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M9 20v-10M15 20V4M3 20h18"></path></svg>
            {isFacilitator ? 'Facilitator Node' : 'Management Hub'}
          </h2>
          <p className={`${isFacilitator ? 'text-indigo-300' : 'text-blue-300'} text-[9px] sm:text-xs uppercase tracking-widest mt-1 font-bold`}>
            Academy: {schoolName} | {isHubActive ? 'NETWORK AUTHORIZED' : 'LOCAL MODE'}
          </p>
        </div>
        
        {/* Management Actions - Hidden for Facilitators */}
        {!isFacilitator && (
          <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-center">
            {!hasData ? (
              <button 
                onClick={onLoadDummyData} 
                className="flex-1 sm:flex-none bg-yellow-500 hover:bg-yellow-600 text-blue-900 px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-yellow-400 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                Initialize Hub Demo
              </button>
            ) : (
              <button 
                onClick={onClearData} 
                className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase border border-red-500 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Switch to Real Mode
              </button>
            )}
          </div>
        )}

        {isFacilitator && (
          <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/20">
             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Faculty Access Terminal</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManagementHeader;
