
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { ForwardingData } from '../../types';

interface AdvertisementPortalViewProps {
  onLogAction: (action: string, target: string, details: string) => void;
}

const AdvertisementPortalView: React.FC<AdvertisementPortalViewProps> = ({ onLogAction }) => {
  const [adContent, setAdContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeAd, setActiveAd] = useState<string | null>(null);
  const [feedbackStream, setFeedbackStream] = useState<ForwardingData[]>([]);

  const fetchGlobalData = async () => {
    // 1. Fetch Current Broadcast
    const { data: adData } = await supabase.from('uba_persistence').select('payload').eq('id', 'global_advertisements').maybeSingle();
    if (adData?.payload) {
      setAdContent(adData.payload.message || '');
      setActiveAd(adData.payload.message || '');
    }

    // 2. Fetch Feedback Feed (limit to last 10 submissions)
    const { data: feedbackData } = await supabase.from('uba_persistence').select('payload, last_updated').like('id', 'forward_%').order('last_updated', { ascending: false }).limit(10);
    if (feedbackData) {
      setFeedbackStream(feedbackData.map(d => d.payload as ForwardingData));
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const interval = setInterval(fetchGlobalData, 15000); // Polling for new feedback
    return () => clearInterval(interval);
  }, []);

  const handleBroadcast = async () => {
    if (!adContent.trim() && activeAd) {
      if (!window.confirm("Clear the current broadcast?")) return;
    }
    
    setIsSaving(true);
    try {
      const payload = { 
        message: adContent.toUpperCase(), 
        timestamp: new Date().toISOString(),
        author: 'HQ_SUPERADMIN'
      };
      
      const { error } = await supabase.from('uba_persistence').upsert({
        id: 'global_advertisements',
        payload: payload,
        last_updated: new Date().toISOString()
      });

      if (error) throw error;
      
      setActiveAd(adContent.toUpperCase());
      onLogAction("AD_BROADCAST", "GLOBAL_NETWORK", `Broadcast updated: ${adContent.substring(0, 30)}...`);
      alert("GLOBAL BROADCAST ACTIVE: Your announcement is now streaming to all verified institution dashboards.");
    } catch (err: any) {
      alert(`Broadcast Fault: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10 space-y-12">
      
      {/* Header Controller */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-5 h-5 bg-orange-600 rounded-full animate-pulse shadow-[0_0_20px_rgba(234,88,12,0.6)]"></div>
             Master Advertisement Desk
          </h2>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Network Announcement Hub</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
           <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Network Pulse: Operational</span>
           <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         
         {/* LEFT: Broadcast Controls */}
         <div className="lg:col-span-7 space-y-8">
            <div className="bg-slate-950 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full -mr-40 -mt-40 blur-[120px]"></div>
               <div className="relative space-y-6">
                  <label className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] block px-4">Announcement Terminal</label>
                  <textarea 
                    value={adContent}
                    onChange={(e) => setAdContent(e.target.value)}
                    placeholder="Enter urgent updates, recruitment calls, or network-wide alerts..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-10 text-base font-black text-white outline-none focus:ring-8 focus:ring-orange-500/10 transition-all min-h-[300px] placeholder:text-slate-800 shadow-inner"
                  />
                  <div className="flex justify-between items-center px-6">
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Text streams in the header of all institutions</span>
                     <span className="text-[10px] font-mono text-slate-500">{adContent.length} / 500</span>
                  </div>
                  <button 
                    onClick={handleBroadcast}
                    disabled={isSaving}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-8 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.6em] shadow-[0_20px_50px_rgba(234,88,12,0.3)] transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? "Synchronizing Hubs..." : "Execute Global Broadcast"}
                  </button>
               </div>
            </div>
         </div>

         {/* RIGHT: Live Feedback Feed (Requested) */}
         <div className="lg:col-span-5 space-y-8">
            <div className="bg-slate-950 border border-slate-800 p-10 rounded-[3.5rem] shadow-2xl flex flex-col h-full max-h-[600px]">
               <div className="flex items-center justify-between border-b border-slate-800 pb-6 mb-6">
                  <h3 className="text-xl font-black uppercase text-blue-400 tracking-tight">Marketing Feedback Stream</h3>
                  <span className="text-[8px] font-black text-slate-600 uppercase bg-slate-900 px-3 py-1 rounded-full">Real-time Feed</span>
               </div>
               
               <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                  {feedbackStream.length > 0 ? feedbackStream.map((feed, i) => (
                    <div key={i} className="bg-slate-900 border border-slate-800/50 p-6 rounded-3xl space-y-3 hover:border-blue-500/30 transition-all group">
                       <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black text-white uppercase truncate max-w-[200px]">{feed.schoolName}</span>
                          <span className="text-[8px] font-mono text-slate-600">{new Date(feed.submissionTimestamp).toLocaleTimeString()}</span>
                       </div>
                       <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
                          "{feed.feedback || "Forwarded data packet received."}"
                       </p>
                       <div className="flex justify-end border-t border-slate-800 pt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Linked to Marketing Desk →</span>
                       </div>
                    </div>
                  )) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-20 text-center">
                       <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-4"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                       <p className="text-[10px] font-black uppercase tracking-widest">No feedback detected in stream</p>
                    </div>
                  )}
               </div>
            </div>

            {/* Header Preview Simulation */}
            <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-[3rem] space-y-4">
               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-2">Header Marquee Simulation</span>
               <div className="bg-blue-900 h-14 rounded-2xl flex items-center px-6 overflow-hidden border border-white/5 shadow-inner">
                  {activeAd ? (
                     <div className="flex-1 whitespace-nowrap overflow-hidden">
                        <p className="inline-block animate-[marquee_25s_linear_infinite] text-[10px] font-black text-orange-300 uppercase tracking-widest pr-[100%]">
                           {activeAd} • {activeAd} • {activeAd}
                        </p>
                     </div>
                  ) : (
                     <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">System Silent</span>
                  )}
               </div>
            </div>
         </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
};

export default AdvertisementPortalView;
