import React, { useState } from 'react';
import { GlobalSettings, SchoolRegistryEntry } from '../../types';
import { supabase } from '../../supabaseClient';

interface SchoolRegistrationPortalProps {
  settings: GlobalSettings;
  onBulkUpdate: (updates: Partial<GlobalSettings>) => void;
  onSave: () => void;
  onComplete?: (credentials: any) => void;
  onExit?: () => void;
  onResetStudents?: () => void;
  onSwitchToLogin?: () => void;
}

const ACADEMY_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AMXDA0YOT8bkgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmhuAAAAsklEQVR42u3XQQqAMAxE0X9P7n8pLhRBaS3idGbgvYVAKX0mSZI0SZIU47X2vPcZay1rrV+S6XUt9ba9621pLXWfP9PkiRJkiRpqgB7/X/f53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le578HAAB//6B+n9VvAAAAAElFTkSuQmCC";

const SchoolRegistrationPortal: React.FC<SchoolRegistrationPortalProps> = ({ 
  settings, onBulkUpdate, onSave, onComplete, onExit, onResetStudents, onSwitchToLogin 
}) => {
  const isExistingRegistration = !!settings.accessCode;
  const [isRegistered, setIsRegistered] = useState(isExistingRegistration);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authErrorCode, setAuthErrorCode] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    schoolName: isExistingRegistration ? settings.schoolName : '',
    location: isExistingRegistration ? settings.schoolAddress : '',
    registrant: isExistingRegistration ? settings.registrantName || '' : '',
    registrantEmail: isExistingRegistration ? settings.registrantEmail || '' : '',
    schoolEmail: isExistingRegistration ? settings.schoolEmail || '' : '',
    contact: isExistingRegistration ? settings.schoolContact || '' : ''
  });

  const handleEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncing(true);
    setAuthErrorCode(null);

    try {
      const hubId = `UBA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const accessKey = `SEC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const staffKey = `STAFF-${Math.floor(1000 + Math.random() * 9000)}`;
      const pupilKey = `PUPIL-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const systemAuthEmail = `${hubId.toLowerCase()}@unitedbaylor.edu`;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: systemAuthEmail,
        password: accessKey, 
        options: {
          data: { hubId, schoolName: formData.schoolName.toUpperCase(), role: 'school_admin' }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
           setAuthErrorCode('USER_EXISTS');
           setIsSyncing(false);
           return;
        }
        throw signUpError;
      }

      const userId = authData.user?.id;
      if (!userId) throw new Error("Security node failed to generate identity.");

      const ts = new Date().toISOString();

      const newSettings = {
        ...settings,
        schoolName: formData.schoolName.toUpperCase(),
        schoolAddress: formData.location.toUpperCase(),
        registrantName: formData.registrant.toUpperCase(),
        registrantEmail: formData.registrantEmail.toLowerCase(),
        schoolEmail: formData.schoolEmail.toLowerCase(),
        schoolContact: formData.contact,
        schoolNumber: hubId,
        accessCode: accessKey,
        staffAccessCode: staffKey,
        pupilAccessCode: pupilKey,
        systemAuthEmail,
        enrollmentDate: new Date().toLocaleDateString()
      };

      await supabase.from('uba_persistence').insert({ 
        id: `${hubId}_settings`, 
        payload: newSettings, 
        last_updated: ts,
        user_id: userId 
      });

      const newRegistryEntry: SchoolRegistryEntry = {
        id: hubId,
        name: formData.schoolName.toUpperCase(),
        registrant: formData.registrant.toUpperCase(),
        accessCode: accessKey,
        staffAccessCode: staffKey,
        pupilAccessCode: pupilKey,
        enrollmentDate: new Date().toLocaleDateString(),
        studentCount: 0,
        avgAggregate: 0,
        performanceHistory: [],
        status: 'active',
        lastActivity: ts
      };

      await supabase.from('uba_persistence').insert({ 
        id: `registry_${hubId}`, 
        payload: [newRegistryEntry], 
        last_updated: ts,
        user_id: userId
      });

      onBulkUpdate(newSettings);
      if (onResetStudents) onResetStudents();
      setIsRegistered(true);
    } catch (err: any) {
      alert(err.message || "Registration Node Error.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadCredentials = () => {
    const text = `SS-MAP - INSTITUTIONAL ACCESS PACK\n` +
                 `==================================================\n\n` +
                 `USE THESE FIELDS TO LOGIN TO YOUR HUB:\n\n` +
                 `1. Institution Hub ID:  ${settings.schoolNumber}\n` +
                 `2. System Login Email:  ${settings.systemAuthEmail}\n` +
                 `3. System Access Key:   ${settings.accessCode}\n\n` +
                 `--------------------------------------------------\n` +
                 `REGISTRATION METADATA:\n` +
                 `Academy Name: ${settings.schoolName}\n` +
                 `Director:     ${settings.registrantName}\n` +
                 `Locality:     ${settings.schoolAddress}\n\n` +
                 `* IMPORTANT: Save this file. Your Access Key is required for every session.`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SSMap_AccessPack_${settings.schoolNumber}.txt`;
    a.click();
  };

  if (isSyncing) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="w-24 h-24 border-8 border-slate-100 border-t-blue-900 rounded-full animate-spin"></div>
      <h3 className="text-xl font-black text-slate-900 uppercase">Synchronizing Node...</h3>
    </div>
  );

  if (isRegistered) return (
    <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-700">
      <div className="bg-slate-950 rounded-[3rem] p-10 md:p-16 shadow-2xl border border-white/10 relative overflow-hidden flex flex-col">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full -mr-48 -mt-48 blur-[100px]"></div>
        
        <div className="relative mb-12 border-b border-white/10 pb-8 text-center">
          <h2 className="text-2xl font-black text-blue-400 uppercase tracking-[0.2em] mb-2">SS-MAP - INSTITUTIONAL ACCESS PACK</h2>
          <div className="h-1 w-full bg-gradient-to-r from-transparent via-blue-600 to-transparent mb-4"></div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">AUTHORIZED CREDENTIALS FOR {settings.schoolName}</p>
        </div>

        <div className="space-y-10 relative">
          <section className="space-y-6">
            <h3 className="text-[11px] font-black text-white/40 uppercase tracking-[0.4em]">Hub Access Protocols:</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/10 transition-all">
                <span className="text-[9px] font-black text-blue-400 uppercase block mb-1">1. Institution Hub ID</span>
                <p className="text-2xl font-mono font-black text-white tracking-tighter">{settings.schoolNumber}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/10 transition-all">
                <span className="text-[9px] font-black text-blue-400 uppercase block mb-1">2. System Login Email</span>
                <p className="text-lg font-mono font-black text-white/80">{settings.systemAuthEmail}</p>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl group hover:bg-white/10 transition-all relative">
                <span className="text-[9px] font-black text-emerald-400 uppercase block mb-1">3. System Access Key</span>
                <p className="text-2xl font-mono font-black text-emerald-400 tracking-[0.2em]">{settings.accessCode}</p>
                <div className="absolute right-6 top-1/2 -translate-y-1/2">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-500/30"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white/[0.02] border border-white/5 p-8 rounded-[2rem] space-y-4">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 pb-2">Registration Metadata:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 text-xs">
              <div className="flex justify-between items-center"><span className="text-slate-500 uppercase font-bold text-[9px]">Academy Name:</span><span className="font-black text-white uppercase">{settings.schoolName}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500 uppercase font-bold text-[9px]">Director:</span><span className="font-black text-white uppercase">{settings.registrantName}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500 uppercase font-bold text-[9px]">Locality:</span><span className="font-black text-white uppercase">{settings.schoolAddress}</span></div>
              <div className="flex justify-between items-center"><span className="text-slate-500 uppercase font-bold text-[9px]">Enrollment Date:</span><span className="font-black text-white uppercase font-mono">{settings.enrollmentDate}</span></div>
            </div>
          </section>

          <div className="pt-6 text-center space-y-8">
            <p className="text-[10px] text-red-400/80 font-black uppercase tracking-[0.2em] italic">
               * IMPORTANT: Save this file. Your Access Key is required for every session.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={handleDownloadCredentials} className="bg-white text-slate-900 px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-50 transition-all active:scale-95">Download Pack (.txt)</button>
              <button onClick={() => onComplete?.(settings)} className="bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-blue-500 transition-all active:scale-95">Enter Control Center</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white rounded-[3rem] p-10 md:p-16 shadow-2xl border border-slate-100 space-y-12">
        <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center mx-auto shadow-2xl mb-2">
               <img src={ACADEMY_ICON} alt="Shield" className="w-12 h-12" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Register Institution Hub</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Establish your encrypted node on the UBA network</p>
        </div>

        <form onSubmit={handleEnrollment} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
            <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Official Academy Name</label><input type="text" value={formData.schoolName} onChange={(e) => setFormData({...formData, schoolName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" required placeholder="E.G. UNITED BAYLOR ACADEMY" /></div>
            <div className="md:col-span-2 space-y-1.5"><label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Locality / Address</label><input type="text" placeholder="TOWN, REGION..." value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" required /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Director Name</label><input type="text" placeholder="FULL NAME..." value={formData.registrant} onChange={(e) => setFormData({...formData, registrant: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" required /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Management Email</label><input type="email" placeholder="ADMIN@EMAIL.COM" value={formData.registrantEmail} onChange={(e) => setFormData({...formData, registrantEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">School Official Email</label><input type="email" placeholder="OFFICE@ACADEMY.COM" value={formData.schoolEmail} onChange={(e) => setFormData({...formData, schoolEmail: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-black text-blue-900 uppercase tracking-[0.2em]">Primary Contact Node</label><input type="text" placeholder="PHONE..." value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" required /></div>
            <div className="md:col-span-2 pt-10 space-y-6">
              <button type="submit" disabled={isSyncing} className="w-full bg-blue-900 text-white py-7 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-black transition-all active:scale-95">{isSyncing ? "Syncing Shards..." : "Execute Enrollment Protocol"}</button>
              <div className="text-center"><button type="button" onClick={onSwitchToLogin} className="text-[10px] font-black text-blue-900 uppercase tracking-[0.3em] hover:text-indigo-600 border-b-2 border-transparent hover:border-indigo-600 pb-1">Already Registered? Hub Access</button></div>
            </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolRegistrationPortal;