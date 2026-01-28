
import React, { useState } from 'react';
import { supabase } from '../../supabaseClient';

interface LoginPortalProps {
  onLoginSuccess: (hubId: string) => void;
  onSuperAdminLogin: () => void;
  onFacilitatorLogin: (name: string, subject: string, hubId: string) => void;
  onPupilLogin: (studentId: number, hubId: string) => void;
  onSwitchToRegister: () => void;
}

const LoginPortal: React.FC<LoginPortalProps> = ({ onLoginSuccess, onSuperAdminLogin, onFacilitatorLogin, onPupilLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'EMAIL' | 'PIN'>('EMAIL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: false 
        }
      });

      if (otpError) {
        if (otpError.message.includes('not found')) {
          throw new Error("ACCOUNT NOT REGISTERED: This identity is not active on the UBA Network. Contact your institutional hub.");
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
      if (!data.user) throw new Error("Synchronization session failed.");

      const metadata = data.user.user_metadata;
      const role = metadata.role;
      const hubId = metadata.hubId;

      if (email.toLowerCase() === 'leumasgenbo4@gmail.com') {
        onSuperAdminLogin();
      } else if (role === 'school_admin') {
        onLoginSuccess(hubId);
      } else if (role === 'facilitator') {
        onFacilitatorLogin(metadata.name || "FACILITATOR", metadata.subject || "GENERAL", hubId);
      } else if (role === 'pupil') {
        onPupilLogin(metadata.studentId, hubId);
      } else {
        throw new Error("UNAUTHORIZED SHARD: User profile does not contain a valid Hub ID.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-4 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-slate-950 p-10 md:p-14 rounded-[3.5rem] shadow-[0_40px_80px_rgba(0,0,0,0.4)] border border-white/10 relative overflow-hidden">
        
        {/* Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-50"></div>
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]"></div>

        <div className="text-center relative mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-900 text-white rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl border border-white/20 transform hover:scale-105 transition-transform">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Identity Gate</h2>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mt-3">United Baylor Academy Hub Access</p>
        </div>

        {step === 'EMAIL' ? (
          <form onSubmit={handleRequestPin} className="space-y-6 relative">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Network Identity Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-700" 
                placeholder="USER@HUB.UBA" 
                required 
              />
            </div>

            {error && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[9px] font-black uppercase text-center border border-red-500/20 leading-relaxed">{error}</div>}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? "Validating Shard..." : "Request Access PIN"}
            </button>
            
            <div className="pt-6 text-center border-t border-white/5">
              <button type="button" onClick={onSwitchToRegister} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-blue-400 transition-colors">Register New Institution</button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyPin} className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-center">
            <div className="space-y-2">
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Enter Secure PIN</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Synchronizing Node: {email}</p>
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-6 rounded-3xl font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95"
            >
              {isLoading ? "Verifying Handshake..." : "Access Dashboard Shard"}
            </button>

            <button type="button" onClick={() => setStep('EMAIL')} className="w-full text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors">Back to Gate</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPortal;
