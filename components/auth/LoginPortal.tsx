
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
  const [activeRole, setActiveRole] = useState<UserRole>(null);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'ROLE' | 'EMAIL' | 'PIN'>('ROLE');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MASTER_ADMIN_EMAIL = 'leumasgenbo4@gmail.com';

  const handleRoleSelect = (role: UserRole) => {
    setActiveRole(role);
    setStep('EMAIL');
  };

  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const targetEmail = email.toLowerCase().trim();

    try {
      const isMaster = targetEmail === MASTER_ADMIN_EMAIL;
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: targetEmail,
        options: {
          shouldCreateUser: isMaster
        }
      });

      if (otpError) {
        if (otpError.message.includes('not found') || otpError.message.includes('allowed')) {
          throw new Error(`ACCESS DENIED: This email is not registered as a ${activeRole?.toUpperCase()} node.`);
        }
        throw otpError;
      }

      setStep('PIN');
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

      if (verifyError) throw verifyError;
      if (!data.user) throw new Error("Sync failure.");

      const metadata = data.user.user_metadata;
      const hubId = metadata.hubId;
      const role = metadata.role;

      if (email.toLowerCase() === MASTER_ADMIN_EMAIL) {
        onSuperAdminLogin();
      } else if (activeRole === 'admin' && (role === 'school_admin' || hubId)) {
        onLoginSuccess(hubId);
      } else if (activeRole === 'facilitator' && role === 'facilitator') {
        onFacilitatorLogin(metadata.name || "FACILITATOR", metadata.subject || "GENERAL", hubId);
      } else if (activeRole === 'pupil' && role === 'pupil') {
        onPupilLogin(metadata.studentId, hubId);
      } else {
        throw new Error(`ROLE MISMATCH: This identity does not belong to the ${activeRole?.toUpperCase()} shard.`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'ROLE') {
    return (
      <div className="w-full max-w-4xl p-4 animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-12">
           <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Identity Gate</h2>
           <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.5em] mt-3">Select your institutional access node</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {[
             { id: 'admin', label: 'Institutional Admin', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', color: 'bg-blue-600' },
             { id: 'facilitator', label: 'Faculty Node', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', color: 'bg-indigo-600' },
             { id: 'pupil', label: 'Candidate Node', icon: 'M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c0 2 2 3 6 3s6-1 6-3v-5', color: 'bg-emerald-600' }
           ].map(role => (
             <button 
               key={role.id}
               onClick={() => handleRoleSelect(role.id as UserRole)}
               className="group bg-slate-950 border border-white/10 p-10 rounded-[3rem] text-center hover:border-white/30 transition-all hover:-translate-y-2 shadow-2xl relative overflow-hidden"
             >
                <div className={`w-16 h-16 ${role.color} text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform`}>
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d={role.icon}/></svg>
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">{role.label}</h3>
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
             </button>
           ))}
        </div>
        <div className="mt-12 text-center">
           <button onClick={onSwitchToRegister} className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Register New School Instance</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-950 p-10 md:p-14 rounded-[3.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
        <button 
          onClick={() => setStep('ROLE')}
          className="absolute top-8 left-8 text-slate-500 hover:text-white transition-colors"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>

        <div className="text-center relative mb-12">
          <div className="w-20 h-20 bg-blue-900 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20 uppercase font-black text-xs">
            {activeRole?.charAt(0)}
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">{activeRole} Handshake</h2>
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.4em] mt-3">Identity Node Synchronization</p>
        </div>

        {step === 'EMAIL' ? (
          <form onSubmit={handleRequestPin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" 
                placeholder="USER@HUB.UBA" 
                required 
              />
            </div>
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[9px] font-black uppercase text-center border border-red-500/20">{error}</div>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-50"
            >
              {isLoading ? "Validating..." : "Request OTP PIN"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Enter PIN</h3>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Sent to {email}</p>
            </div>
            <input 
              type="text" 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
              className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-6 text-4xl font-black text-white text-center tracking-[0.5em] outline-none focus:ring-4 focus:ring-emerald-500/10" 
              placeholder="000000" 
              maxLength={6}
              required 
              autoFocus
            />
            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[9px] font-black uppercase text-center border border-red-500/20">{error}</div>}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl disabled:opacity-50"
            >
              {isLoading ? "Verifying..." : "Access Shard"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPortal;
