
import React, { useState, useEffect, useMemo } from 'react';
import { GlobalSettings, StaffAssignment, SchoolRegistryEntry, StudentData } from '../../types';
import { supabase } from '../../supabaseClient';

interface LoginPortalProps {
  settings: GlobalSettings;
  globalRegistry: SchoolRegistryEntry[];
  initialCredentials?: any;
  onLoginSuccess: (hubId: string) => void;
  onSuperAdminLogin: () => void;
  onFacilitatorLogin: (name: string, subject: string, hubId: string) => void;
  onPupilLogin: (studentId: number, hubId: string) => void;
  onSwitchToRegister: () => void;
}

const ACADEMY_ICON = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH6AMXDA0YOT8bkgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmhuAAAAsklEQVR42u3XQQqAMAxE0X9P7n8pLhRBaS3idGbgvYVAKX0mSZI0SZIU47X2vPcZay1rrV+S6XUt9ba9621pLXWfP9PkiRJkiRpqgB7/X/f53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le53le578HAAB//6B+n9VvAAAAAElFTkSuQmCC";

const LoginPortal: React.FC<LoginPortalProps> = ({ settings, globalRegistry, initialCredentials, onLoginSuccess, onSuperAdminLogin, onFacilitatorLogin, onPupilLogin, onSwitchToRegister }) => {
  const [authMode, setAuthMode] = useState<'ADMIN' | 'FACILITATOR' | 'PUPIL'>('ADMIN');
  const [step, setStep] = useState<'IDENTITY' | 'SYNCING' | 'OTP' | 'DISCOVERY'>('IDENTITY');
  const [credentials, setCredentials] = useState({
    identityId: '',
    accessKey: '',
  });
  
  const [otpInput, setOtpInput] = useState('');
  const [targetPin, setTargetPin] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [resolvedSession, setResolvedSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const discoveryResults = useMemo(() => {
    if (!searchQuery) return [];
    return globalRegistry.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.id.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);
  }, [globalRegistry, searchQuery]);

  useEffect(() => {
    if (initialCredentials) {
      setCredentials({
        identityId: initialCredentials.schoolNumber || '',
        accessKey: initialCredentials.accessCode || ''
      });
    }
  }, [initialCredentials]);

  const handleIdentityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setErrorMessage(null);
    
    const inputKey = credentials.accessKey.trim().toUpperCase();
    const inputId = credentials.identityId.trim().toUpperCase();

    if (inputKey === "UBA-HQ-MASTER-2025") {
      setIsAuthenticating(false);
      onSuperAdminLogin();
      return;
    }

    try {
      const rootHubId = inputId.split('/')[0];
      const { data: persistenceData } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .or(`id.eq.registry_${rootHubId},id.eq.${rootHubId}_facilitators,id.eq.${rootHubId}_students,id.eq.${rootHubId}_settings`);

      if (!persistenceData || persistenceData.length === 0) {
         throw new Error("Identity Node Offline. Verify UID.");
      }

      const registryShard = persistenceData.find(d => d.id === `registry_${rootHubId}`)?.payload;
      const rawEntry = Array.isArray(registryShard) ? registryShard[0] : registryShard;
      const schoolSettings = persistenceData.find(d => d.id === `${rootHubId}_settings`)?.payload as GlobalSettings;

      if (!rawEntry) throw new Error("Institutional registry heartbeat lost.");

      const facilitatorsShard = persistenceData.find(d => d.id === `${rootHubId}_facilitators`)?.payload as Record<string, StaffAssignment>;
      const studentsShard = persistenceData.find(d => d.id === `${rootHubId}_students`)?.payload as StudentData[];

      let isVerified = false;
      let sessionPayload: any = null;

      if (authMode === 'ADMIN') {
        if (inputId !== rootHubId) throw new Error("Admin access restricted to Root Hub ID.");
        isVerified = (rawEntry.accessCode || "").trim().toUpperCase() === inputKey;
        sessionPayload = { type: 'ADMIN', hubId: rootHubId };
      } 
      else if (authMode === 'FACILITATOR') {
        const staff = Object.values(facilitatorsShard || {}).find(f => 
          `${rootHubId}/${f.enrolledId}` === inputId && (f.passkey || "").toUpperCase() === inputKey
        );
        if (staff) {
          isVerified = true;
          sessionPayload = { type: 'FACILITATOR', name: staff.name, subject: staff.taughtSubject, hubId: rootHubId };
        }
      } 
      else if (authMode === 'PUPIL') {
        const pupil = studentsShard?.find(s => 
          `${rootHubId}/PUP-${s.id}` === inputId && (s.passkey || "").toUpperCase() === inputKey
        );
        if (pupil) {
          isVerified = true;
          sessionPayload = { type: 'PUPIL', id: pupil.id, hubId: rootHubId };
        }
      }

      if (!isVerified) throw new Error(`Invalid credentials for ${authMode}.`);

      // Use the PIN from settings instead of a random OTP
      const pin = schoolSettings?.securityPin || "0000";
      setTargetPin(pin);
      setResolvedSession(sessionPayload);
      setIsAuthenticating(false);

      // Transition to Manual PIN Entry
      setStep('SYNCING');
      setTimeout(() => {
        setStep('OTP');
      }, 1500);

    } catch (err: any) {
      setErrorMessage(err.message);
      setIsAuthenticating(false);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleFinalAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === targetPin) {
      setIsAuthenticating(true);
      if (resolvedSession.type === 'ADMIN') onLoginSuccess(resolvedSession.hubId);
      else if (resolvedSession.type === 'FACILITATOR') onFacilitatorLogin(resolvedSession.name, resolvedSession.subject, resolvedSession.hubId);
      else onPupilLogin(resolvedSession.id, resolvedSession.hubId);
    } else {
      setErrorMessage("Handshake Sync Failed: Incorrect PIN.");
      setOtpInput('');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  return (
    <div className="w-full max-w-lg px-4 md:px-0 animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-slate-950 p-6 md:p-12 rounded-[3.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-20"></div>

        {step === 'SYNCING' && (
          <div className="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center space-y-8 p-12 text-center animate-pulse">
            <div className="relative">
              <div className="w-24 h-24 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
               <h3 className="text-xl font-black text-white uppercase tracking-widest">Handshake Initiated</h3>
               <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] leading-relaxed">
                  Establishing Peer Connection... <br/>
                  <span className="text-blue-400">Awaiting Desk PIN Input</span>
               </p>
            </div>
          </div>
        )}

        {isAuthenticating && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Establishing Secure Uplink...</p>
          </div>
        )}

        <div className="text-center relative mb-8">
          <div className="w-20 h-20 bg-slate-900 border border-white/5 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl relative group">
             <div className="absolute inset-0 bg-blue-600/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <img src={ACADEMY_ICON} alt="UBA Shield" className="w-12 h-12 object-contain opacity-80 relative" />
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Institutional Gate</h2>
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em] mt-3">Node ID: {credentials.identityId || 'UBA-NETWORK'}</p>
        </div>

        {step === 'IDENTITY' && (
          <>
            <div className="flex bg-white/5 p-1 rounded-2xl mb-8 border border-white/5">
              {['ADMIN', 'FACILITATOR', 'PUPIL'].map(mode => (
                <button key={mode} onClick={() => setAuthMode(mode as any)} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${authMode === mode ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-600 hover:text-slate-300'}`}>{mode}</button>
              ))}
            </div>

            <form onSubmit={handleIdentityCheck} className="space-y-6">
              <div className="space-y-5">
                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Handshake UID</label>
                    <button type="button" onClick={() => setStep('DISCOVERY')} className="text-[8px] font-black text-blue-500 uppercase hover:text-white transition-colors">Locate Hub?</button>
                  </div>
                  <input 
                    type="text" 
                    value={credentials.identityId} 
                    onChange={(e) => setCredentials({...credentials, identityId: e.target.value})} 
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-sm font-black text-white outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" 
                    placeholder={authMode === 'ADMIN' ? 'UBA-YYYY-XXXX' : authMode === 'FACILITATOR' ? 'UBA-YYYY-XXXX/FAC-00' : 'UBA-YYYY-XXXX/PUP-000'} 
                    required 
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Passkey</label>
                  <div className="relative">
                    <input 
                      type={showKey ? "text" : "password"} 
                      value={credentials.accessKey} 
                      onChange={(e) => setCredentials({...credentials, accessKey: e.target.value})} 
                      className="w-full bg-slate-900 border border-white/5 rounded-2xl px-6 py-5 text-sm font-mono font-black text-blue-400 outline-none focus:ring-4 focus:ring-blue-500/10 uppercase pr-14 tracking-widest" 
                      placeholder="••••••••" 
                      required 
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                        {showKey ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>
              </div>

              {errorMessage && <div className="bg-red-500/10 text-red-500 p-5 rounded-3xl text-[9px] font-black uppercase text-center border border-red-500/20 animate-pulse">{errorMessage}</div>}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-[0_0_40px_rgba(37,99,235,0.3)] transition-all active:scale-95">
                Verify Identity
              </button>
            </form>
          </>
        )}

        {step === 'OTP' && (
          <form onSubmit={handleFinalAuth} className="space-y-10 animate-in slide-in-from-right-8 duration-500 text-center">
             <div className="space-y-3">
                <div className="inline-flex bg-blue-600/20 text-blue-400 p-4 rounded-3xl border border-blue-500/20 mb-4 shadow-xl">
                   <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="mx-auto"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Security Handshake</h3>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">Enter your pre-configured PIN from your desk</p>
             </div>
             
             <div className="flex justify-center gap-4">
                {['', '', '', ''].map((_, i) => (
                  <input
                    key={i}
                    type="password"
                    maxLength={1}
                    value={otpInput[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const next = otpInput.split('');
                        next[i] = val;
                        const nextStr = next.join('');
                        setOtpInput(nextStr);
                        if (val && i < 3) {
                          const inputs = e.currentTarget.parentElement?.getElementsByTagName('input');
                          inputs?.[i+1]?.focus();
                        }
                      }
                    }}
                    className="w-16 h-20 bg-slate-900 border border-white/10 rounded-[1.5rem] text-center text-3xl font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20"
                    autoFocus={i === 0}
                  />
                ))}
             </div>

             {errorMessage && <div className="text-red-500 text-[10px] font-black uppercase tracking-widest">{errorMessage}</div>}

             <div className="space-y-4">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-6 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">
                  Confirm PIN
                </button>
                <div className="flex justify-center">
                  <button type="button" onClick={() => setStep('IDENTITY')} className="text-[9px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors border-b border-transparent hover:border-white pb-1">Reset Terminal Session</button>
                </div>
             </div>
          </form>
        )}

        {step === 'DISCOVERY' && (
          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
             <div className="text-center space-y-2">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Institutional Locator</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Network-wide Shard Discovery</p>
             </div>
             <div className="relative">
                <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search Registry..."
                   className="w-full bg-slate-900 border border-blue-500/20 rounded-[1.5rem] px-12 py-5 text-sm font-black text-white outline-none focus:ring-4 focus:ring-blue-500/10 uppercase"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
             </div>

             <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar pr-1">
                {discoveryResults.map(school => (
                  <button 
                    key={school.id}
                    onClick={() => { setCredentials({...credentials, identityId: school.id}); setStep('IDENTITY'); setSearchQuery(''); }}
                    className="w-full text-left bg-white/5 hover:bg-blue-600/30 border border-white/5 p-5 rounded-[1.5rem] transition-all group"
                  >
                     <p className="text-[11px] font-black text-white uppercase group-hover:text-blue-400">{school.name}</p>
                     <p className="text-[9px] font-mono text-slate-600 mt-1 uppercase tracking-widest leading-none">Node UID: {school.id}</p>
                  </button>
                ))}
             </div>

             <button type="button" onClick={() => setStep('IDENTITY')} className="w-full py-5 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors border border-white/5 rounded-[1.5rem]">Cancel Discovery</button>
          </div>
        )}

        <div className="pt-8 text-center border-t border-white/5 mt-8">
           <button onClick={onSwitchToRegister} className="text-[10px] font-black text-blue-500/40 uppercase tracking-[0.2em] hover:text-blue-500 transition-colors">Enroll Institutional Node</button>
        </div>
      </div>
    </div>
  );
};

export default LoginPortal;
