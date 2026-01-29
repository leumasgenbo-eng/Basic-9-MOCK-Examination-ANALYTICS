
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

interface LoginPortalProps {
  onLoginSuccess: (hubId: string) => void;
  onSuperAdminLogin: () => void;
  onFacilitatorLogin: (name: string, subject: string, hubId: string) => void;
  onPupilLogin: (studentId: number, hubId: string) => void;
  onSwitchToRegister: () => void;
}

type UserRole = 'admin' | 'facilitator' | 'pupil' | null;

const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess, onSuperAdminLogin, onFacilitatorLogin, onPupilLogin, onSwitchToRegister }) => {
  const [activeGate, setActiveGate] = useState<UserRole>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'GATE_SELECTION' | 'EMAIL_INPUT' | 'PIN_VERIFICATION'>('GATE_SELECTION');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MASTER_ADMIN_EMAIL = 'leumasgenbo4@gmail.com';

  const handleGateSelect = (role: UserRole) => {
    setActiveGate(role);
    setStep('EMAIL_INPUT');
  };

  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const targetEmail = email.toLowerCase().trim();

    try {
      // Trigger Supabase OTP dispatch
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: targetEmail === MASTER_ADMIN_EMAIL // Only HQ can create on login
        }
      });

      if (otpError) {
        throw new Error("GATE ACCESS DENIED: Node not found in registry.");
      }

      setStep('PIN_VERIFICATION');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: otp.trim(),
        type: 'email'
      });

      if (verifyError) throw new Error("INVALID PIN: Handshake timed out.");
      if (!data.user) throw new Error("SYNC ERROR: Identity node corrupted.");

      const metadata = data.user.user_metadata || {};
      const hubId = metadata.hubId;
      const registeredRole = metadata.role;

      // ROLE VALIDATION GATE: Prevent role leakage
      if (email.toLowerCase() === MASTER_ADMIN_EMAIL) {
        onSuperAdminLogin();
      } else if (activeGate === 'admin' && (registeredRole === 'school_admin' || hubId)) {
        onLoginSuccess(hubId);
      } else if (activeGate === 'facilitator' && registeredRole === 'facilitator') {
        onFacilitatorLogin(metadata.name || "STAFF", metadata.subject || "GENERAL", hubId);
      } else if (activeGate === 'pupil' && registeredRole === 'pupil') {
        onPupilLogin(metadata.studentId, hubId);
      } else {
        await supabase.auth.signOut();
        throw new Error(`GATE MISMATCH: This identity does not have ${activeGate?.toUpperCase()} permissions.`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'GATE_SELECTION') {
    return (
      <div className="w-full max-w-4xl p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-16">
           <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Access Terminal</h2>
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mt-3">Select your institutional node gate</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           {[
             { id: 'admin', label: 'Institutional Admin', color: 'from-blue-600 to-blue-900', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
             { id: 'facilitator', label: 'Faculty Node', color: 'from-indigo-600 to-indigo-900', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
             { id: 'pupil', label: 'Candidate Node', color: 'from-emerald-600 to-emerald-900', icon: 'M22 10v6M2 10l10-5 10 5-10 5z' }
           ].map(gate => (
             <button 
               key={gate.id}
               onClick={() => handleGateSelect(gate.id as UserRole)}
               className="group relative bg-slate-950 border border-white/10 p-12 rounded-[3.5rem] text-center hover:border-white/30 transition-all hover:-translate-y-2 shadow-2xl overflow-hidden"
             >
                <div className={`w-20 h-20 bg-gradient-to-br ${gate.color} text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl group-hover:scale-110 transition-transform`}>
                   <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={gate.icon}/></svg>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">{gate.label}</h3>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </button>
           ))}
        </div>
        <div className="mt-16 text-center">
           <button onClick={onSwitchToRegister} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Onboard New School Cluster</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-950 p-12 md:p-16 rounded-[4rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
        <button 
          onClick={() => setStep('GATE_SELECTION')}
          className="absolute top-10 left-10 text-slate-500 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        </button>

        <div className="text-center relative mb-12">
          <div className={`w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center text-white shadow-2xl border border-white/20 uppercase font-black text-xs ${activeGate === 'pupil' ? 'bg-emerald-600' : activeGate === 'facilitator' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
            {activeGate?.substring(0, 3)}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">{activeGate} HANDSHAKE</h2>
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mt-3">Node Identity Verification</p>
        </div>

        {step === 'EMAIL_INPUT' ? (
          <form onSubmit={handleRequestPin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Registered Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all uppercase" 
                placeholder="USER@HUB.UBA" 
                required 
              />
            </div>
            {error && <div className="bg-red-500/10 text-red-500 p-5 rounded-2xl text-[9px] font-black uppercase text-center border border-red-500/20">{error}</div>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-50"
            >
              {isLoading ? "Validating Node..." : "Request Access PIN"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Enter Token</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Sent to {email}</p>
            </div>
            <input 
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-7 text-5xl font-black text-white text-center tracking-[0.6em] outline-none focus:ring-4 focus:ring-emerald-500/10" 
              placeholder="000000" 
              maxLength={6}
              required 
              autoFocus
            />
            {error && <div className="bg-red-500/10 text-red-500 p-5 rounded-2xl text-[9px] font-black uppercase text-center border border-red-500/20">{error}</div>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-50"
            >
              {isLoading ? "Synchronizing..." : "Access Shard Interface"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPortal;
