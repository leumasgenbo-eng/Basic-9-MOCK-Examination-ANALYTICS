
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

interface AdvertisementPortalViewProps {
  onLogAction: (action: string, target: string, details: string) => void;
}

const AdvertisementPortalView: React.FC<AdvertisementPortalViewProps> = ({ onLogAction }) => {
  const [adContent, setAdContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeAd, setActiveAd] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentAd = async () => {
      const { data, error } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', 'global_advertisements')
        .maybeSingle();
      
      if (data && data.payload) {
        setAdContent(data.payload.message || '');
        setActiveAd(data.payload.message || '');
      }
    };
    fetchCurrentAd();
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
      alert("NETWORK BROADCAST SUCCESSFUL: Advertisement is now streaming to all institutional dashboards.");
    } catch (err: any) {
      alert(`Broadcast Failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-700 h-full flex flex-col p-10">
      <div className="space-y-2 mb-10 flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black uppercase text-white tracking-tighter flex items-center gap-4">
             <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse shadow-[0_0_15px_rgba(249,115,22,0.6)]"></div>
             Network Advertisement Portal
          </h2>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Global Dashboard Stream Controller</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-4">
           <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Linked to Marketing Desk</span>
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
         <div className="space-y-6">
            <div className="bg-slate-950 border border-slate-800 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
               <div className="relative space-y-4">
                  <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block px-2">Live Broadcast Content</label>
                  <textarea 
                    value={adContent}
                    onChange={(e) => setAdContent(e.target.value)}
                    placeholder="Enter announcement text to stream to all school terminals..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-sm font-black text-white outline-none focus:ring-4 focus:ring-orange-500/20 transition-all min-h-[250px] placeholder:text-slate-700"
                  />
                  <div className="flex justify-between items-center px-4">
                     <span className="text-[8px] font-black text-slate-600 uppercase">Text will be auto-capitalized for visibility</span>
                     <span className="text-[8px] font-mono text-slate-500">{adContent.length} / 500 Characters</span>
                  </div>
                  <button 
                    onClick={handleBroadcast}
                    disabled={isSaving}
                    className="w-full bg-orange-600 hover:bg-orange-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSaving ? "Synchronizing Nodes..." : "Execute Global Broadcast"}
                  </button>
               </div>
            </div>
         </div>

         <div className="space-y-8">
            <div className="bg-slate-950/50 border border-slate-800 p-10 rounded-[3.5rem] space-y-8">
               <h3 className="text-xl font-black uppercase text-white tracking-tight leading-none border-b border-slate-800 pb-6">Stream Preview</h3>
               
               <div className="space-y-6">
                  <div className="space-y-2">
                     <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest ml-2">Header UI Simulation</span>
                     <div className="bg-blue-900 h-16 rounded-2xl flex items-center px-6 overflow-hidden border border-white/5">
                        {activeAd ? (
                           <div className="flex-1 whitespace-nowrap overflow-hidden">
                              <p className="inline-block animate-[marquee_20s_linear_infinite] text-[10px] font-black text-orange-300 uppercase tracking-widest pr-[100%]">
                                 {activeAd} • {activeAd} • {activeAd}
                              </p>
                           </div>
                        ) : (
                           <span className="text-[10px] font-black text-blue-800 uppercase tracking-widest">No Active Stream</span>
                        )}
                     </div>
                  </div>

                  <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 italic">
                     <h4 className="text-[9px] font-black text-blue-400 uppercase mb-3">Transmission Notice</h4>
                     <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                        The content provided here is broadcasted in real-time to the header of every authenticated school terminal in the network. Use this for critical system alerts, upcoming external examination schedules, or network-wide recruitment calls.
                     </p>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-orange-500/5 rounded-[2.5rem] border border-orange-500/10 flex items-start gap-6">
               <div className="w-12 h-12 bg-orange-500/20 text-orange-500 rounded-2xl flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
               </div>
               <div className="space-y-1">
                  <h4 className="text-xs font-black text-orange-500 uppercase">Integrity Alert</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase leading-relaxed tracking-widest">
                     Advertisements are encrypted and mirrored across all network nodes. Data entry here propagates immediately to institutional terminals and links feedback to the Marketing Desk.
                  </p>
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
