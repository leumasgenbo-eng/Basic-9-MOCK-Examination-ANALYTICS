
import React, { useState } from 'react';
import { GlobalSettings, SchoolRegistryEntry } from '../../types';
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const hubId = `UBA-2025-${Math.floor(1000 + Math.random() * 9000)}`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email.toLowerCase(),
        options: {
          data: { 
            role: 'school_admin', 
            hubId, 
            schoolName: formData.schoolName.toUpperCase() 
          },
          shouldCreateUser: true
        }
      });

      if (error) throw error;
      setStep('PIN');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: formData.email.toLowerCase(),
        token: pin,
        type: 'signup'
      });

      if (error) throw error;
      if (!data.user) throw new Error("Activation failed.");

      const hubId = data.user.user_metadata.hubId;
      const ts = new Date().toISOString();

      const newSettings: GlobalSettings = {
        ...settings,
        schoolName: formData.schoolName.toUpperCase(),
        schoolAddress: formData.location.toUpperCase(),
        registrantName: formData.registrant.toUpperCase(),
        registrantEmail: formData.email.toLowerCase(),
        schoolNumber: hubId,
        reportDate: new Date().toLocaleDateString()
      };

      // Create persistence shards
      await supabase.from('uba_persistence').insert([
        { id: `${hubId}_settings`, payload: newSettings, user_id: data.user.id },
        { id: `${hubId}_students`, payload: [], user_id: data.user.id },
        { id: `${hubId}_facilitators`, payload: {}, user_id: data.user.id },
        { 
          id: `registry_${hubId}`, 
          payload: [{ ...newSettings, studentCount: 0, avgAggregate: 0, status: 'active', lastActivity: ts }],
          user_id: data.user.id 
        }
      ]);

      onBulkUpdate(newSettings);
      if (onResetStudents) onResetStudents();
      onComplete?.();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-2xl border border-slate-100 relative overflow-hidden">
        <div className="text-center space-y-4 mb-12">
            <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none">Academy Onboarding</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Establish your encrypted node on the UBA network</p>
        </div>

        {step === 'FORM' ? (
          <form onSubmit={handleRegister} className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest ml-2">Official Academy Name</label>
               <input type="text" value={formData.schoolName} onChange={e=>setFormData({...formData, schoolName: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" required />
            </div>
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest ml-2">Primary Contact Email (For PIN Delivery)</label>
               <input type="email" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black outline-none focus:ring-4 focus:ring-blue-500/10" required />
            </div>
            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-blue-900 uppercase tracking-widest ml-2">Institutional Location</label>
               <input type="text" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-5 text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10" required />
            </div>
            <div className="pt-6">
              <button type="submit" disabled={isLoading} className="w-full bg-blue-900 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl hover:bg-black transition-all active:scale-95 disabled:opacity-50">
                {isLoading ? "INITIATING NODE..." : "REQUEST ACTIVATION PIN"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-center">
            <p className="text-sm font-bold text-slate-600 uppercase">Verification PIN sent to {formData.email}</p>
            <input type="text" value={pin} onChange={e=>setPin(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-6 text-4xl font-black text-center tracking-[0.5em] outline-none" placeholder="000000" maxLength={6} required />
            <button type="submit" disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-xl hover:bg-emerald-700 transition-all">
              {isLoading ? "ACTIVATING..." : "VERIFY & OPEN HUB"}
            </button>
            <button type="button" onClick={()=>setStep('FORM')} className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Back to Form</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SchoolRegistrationPortal;
