
import React, { useState } from 'react';
import { GlobalSettings } from '../../types';
import { supabase } from '../../supabaseClient';

interface SchoolRegistrationPortalProps {
  settings: GlobalSettings;
  onBulkUpdate: (updates: Partial<GlobalSettings>) => void;
  onSave: () => void;
  onComplete?: () => void;
  onResetStudents?: () => void;
  onSwitchToLogin?: () => void;
}

const SchoolRegistrationPortal: React.FC<SchoolRegistrationPortalProps> = ({ 
  settings, onBulkUpdate, onSave, onComplete, onResetStudents, onSwitchToLogin 
}) => {
  const [formData, setFormData] = useState({
    schoolName: '',
    location: '',
    registrant: '', // Full Name
    email: '',
    contact: '' // Contact Node
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'FORM' | 'PIN'>('FORM');
  const [pin, setPin] = useState('');
  const [tempCredentials, setTempCredentials] = useState<{hubId: string, accessKey: string} | null>(null);

  const downloadCredentials = (hubId: string, accessKey: string) => {
    const text = `UNITED BAYLOR ACADEMY (UBA) - INSTITUTIONAL ACCESS PACK\n` +
                 `==============================================================\n\n` +
                 `LOGIN CREDENTIALS:\n` +
                 `1. Institution Name:   ${formData.schoolName.toUpperCase()}\n` +
                 `2. Enrollment ID (Key): ${hubId}\n` +
                 `3. Registrant Identity: ${formData.registrant.toUpperCase()}\n` +
                 `4. System Access Key:   ${accessKey}\n\n` +
                 `--------------------------------------------------------------\n` +
                 `REGISTRATION PARTICULARS:\n` +
                 `Location:         ${formData.location.toUpperCase()}\n` +
                 `Registrant Name:  ${formData.registrant.toUpperCase()}\n` +
                 `Contact Node:     ${formData.contact}\n` +
                 `Registered Email: ${formData.email.toLowerCase()}\n\n` +
                 `* IMPORTANT: Save this file. Your Access Key is unique.`;
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UBA_Credentials_${hubId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.registrant || !formData.email || !formData.contact) {
        alert("Please complete all institutional particulars.");
        return;
    }
    setIsLoading(true);

    try {
      const hubId = `UBA-2025-${Math.floor(1000 + Math.random() * 9000)}`;
      const accessKey = `SSMAP-SEC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      
      downloadCredentials(hubId, accessKey);
      setTempCredentials({ hubId, accessKey });

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email.toLowerCase().trim(),
        options: {
          data: { 
            role: 'school_admin', 
            hubId, 
            schoolName: formData.schoolName.toUpperCase(),
            registrantName: formData.registrant.toUpperCase(),
            schoolContact: formData.contact,
            accessCode: accessKey
          },
          shouldCreateUser: true
        }
      });

      if (error) throw error;
      
      alert("INSTITUTIONAL PACK READY: Credentials downloaded. PIN dispatched to email.");
      setStep('PIN');
    } catch (err: any) {
      alert("Registration Fault: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email.toLowerCase().trim(),
        token: pin.trim(),
        type: 'email' 
      });

      if (error) throw error;
      if (!data.user || !tempCredentials) throw new Error("Synchronization failure.");

      const { hubId, accessKey } = tempCredentials;
      const ts = new Date().toISOString();

      const newSettings: GlobalSettings = {
        ...settings,
        schoolName: formData.schoolName.toUpperCase(),
        schoolAddress: formData.location.toUpperCase(),
        registrantName: formData.registrant.toUpperCase(),
        registrantEmail: formData.email.toLowerCase(),
        schoolContact: formData.contact,
        schoolEmail: formData.email.toLowerCase(), // Default school email to registrant email
        schoolWebsite: `www.${formData.schoolName.toLowerCase().replace(/\s+/g, '')}.edu.gh`,
        schoolMotto: "EXCELLENCE IN KNOWLEDGE AND CHARACTER",
        schoolNumber: hubId,
        accessCode: accessKey,
        reportDate: new Date().toLocaleDateString()
      };

      await supabase.from('uba_persistence').insert([
        { id: `${hubId}_settings`, hub_id: hubId, payload: newSettings, user_id: data.user.id },
        { id: `${hubId}_students`, hub_id: hubId, payload: [], user_id: data.user.id },
        { id: `${hubId}_facilitators`, hub_id: hubId, payload: {}, user_id: data.user.id },
        { id: `registry_${hubId}`, hub_id: hubId, payload: [{ ...newSettings, status: 'active', lastActivity: ts }], user_id: data.user.id }
      ]);

      onBulkUpdate(newSettings);
      if (onResetStudents) onResetStudents();
      onComplete?.();
    } catch (err: any) {
      alert("Activation Error: Token has expired or is invalid");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in duration-700">
      <div className="bg-slate-950 p-1 rounded-[3.2rem] shadow-2xl border border-white/10">
        <div className="bg-white rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
          <div className="text-center space-y-4 mb-12">
              <div className="w-20 h-20 bg-blue-900 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-white/10 transition-transform hover:rotate-12">
                 <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 11l-3 3L17 12"/></svg>
              </div>
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Institutional Shard Enrollment</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Establish your Academy Persistence Node</p>
          </div>

          {step === 'FORM' ? (
            <form onSubmit={handleRegister} className="grid grid-cols-1 gap-6">
              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-2">Official Academy Identity</label>
                 <input type="text" value={formData.schoolName} onChange={e=>setFormData({...formData, schoolName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="e.g. UNITED BAYLOR ACADEMY..." required />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-2">Registrant (Legal Name)</label>
                   <input type="text" value={formData.registrant} onChange={e=>setFormData({...formData, registrant: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="FULL NAME..." required />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-2">Primary Contact Node</label>
                   <input type="text" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="000 000 0000" required />
                </div>
              </div>

              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-2">Academy Shard Location</label>
                 <input type="text" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="TOWN, REGION, COUNTRY..." required />
              </div>

              <div className="space-y-1.5">
                 <label className="text-[9px] font-black text-blue-900 uppercase tracking-widest ml-2">Registered Email (PIN Activation)</label>
                 <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" placeholder="ADMIN@ACADEMY.EDU" required />
              </div>

              <div className="pt-6">
                <button type="submit" disabled={isLoading} className="group relative w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                  <span className="relative z-10">{isLoading ? "Validating Matrix..." : "Download Keys & Request PIN"}</span>
                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </button>
              </div>
              <div className="text-center pt-4">
                <button type="button" onClick={onSwitchToLogin} className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-indigo-600 transition-colors">Already Active? Access Hub</button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-8 text-center animate-in slide-in-from-right-4 duration-500">
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                 <p className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.2em] leading-relaxed">
                   SHARD ACTIVATION TOKEN DISPATCHED TO<br/>
                   <span className="text-xs font-mono font-black">{formData.email.toUpperCase()}</span>
                 </p>
              </div>
              <input type="text" value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-6 text-4xl font-black text-center tracking-[0.5em] outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all" placeholder="000000" maxLength={6} required autoFocus />
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-emerald-700 transition-all active:scale-95">
                {isLoading ? "Synchronizing Node..." : "Verify & Activate Institution"}
              </button>
              <button type="button" onClick={()=>setStep('FORM')} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-slate-900">Return to Particulars</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationPortal;
