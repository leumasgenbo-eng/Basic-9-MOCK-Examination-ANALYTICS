
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
    registrant: '', 
    email: '',
    contact: '' 
  });
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'FORM' | 'PIN'>('FORM');
  const [pin, setPin] = useState('');
  const [tempCredentials, setTempCredentials] = useState<{hubId: string, accessKey: string} | null>(null);

  const downloadCredentials = (hubId: string, accessKey: string) => {
    const text = `SS-map ACADEMY (SMA) - INSTITUTIONAL ACCESS PACK\n` +
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
    a.href = url; a.download = `SMA_Credentials_${hubId}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.schoolName || !formData.registrant || !formData.email || !formData.contact) {
        alert("Complete all particulars."); return;
    }
    setIsLoading(true);
    try {
      const hubId = `SMA-2025-${Math.floor(1000 + Math.random() * 9000)}`;
      const accessKey = `SSMAP-SEC-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      downloadCredentials(hubId, accessKey);
      setTempCredentials({ hubId, accessKey });

      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email.toLowerCase().trim(),
        options: {
          data: { role: 'school_admin', hubId, name: formData.registrant.toUpperCase() },
          shouldCreateUser: true
        }
      });
      if (error) throw error;
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
      if (!data.user || !tempCredentials) throw new Error("Sync failure.");

      const { hubId, accessKey } = tempCredentials;
      const ts = new Date().toISOString();

      // 1. DISPATCH ADMIN IDENTITY TO REGISTRY
      await supabase.from('uba_identities').upsert({
         email: formData.email.toLowerCase().trim(),
         full_name: formData.registrant.toUpperCase().trim(),
         node_id: hubId,
         hub_id: hubId,
         role: 'school_admin'
      });

      const newSettings: GlobalSettings = {
        ...settings,
        schoolName: formData.schoolName.toUpperCase(),
        schoolAddress: formData.location.toUpperCase(),
        registrantName: formData.registrant.toUpperCase(),
        registrantEmail: formData.email.toLowerCase(),
        schoolContact: formData.contact,
        schoolEmail: formData.email.toLowerCase(),
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
      alert("Activation Error: Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in duration-700">
      <div className="bg-slate-950 p-1 rounded-[3.2rem] shadow-2xl border border-white/10">
        <div className="bg-white rounded-[3rem] p-10 md:p-14 relative overflow-hidden">
          <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Institutional Enrollment</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">SS-map Hub Persistence Node Sync</p>
          </div>

          {step === 'FORM' ? (
            <form onSubmit={handleRegister} className="grid grid-cols-1 gap-6">
              <input type="text" value={formData.schoolName} onChange={e=>setFormData({...formData, schoolName: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="SMA INSTITUTION NAME..." required />
              <input type="text" value={formData.registrant} onChange={e=>setFormData({...formData, registrant: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black uppercase outline-none" placeholder="REGISTRANT NAME..." required />
              <input type="text" value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="CONTACT PHONE..." required />
              <input type="text" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="LOCATION..." required />
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-sm font-black outline-none" placeholder="ADMIN@SMA.NETWORK" required />
              <button type="submit" disabled={isLoading} className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] disabled:opacity-50">
                {isLoading ? "Validating..." : "Execute Enrollment"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerify} className="space-y-8 text-center">
              <input type="text" value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-6 text-4xl font-black text-center tracking-[0.5em] outline-none" placeholder="000000" maxLength={6} required autoFocus />
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl disabled:opacity-50">
                {isLoading ? "Syncing..." : "Activate Institution"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchoolRegistrationPortal;
