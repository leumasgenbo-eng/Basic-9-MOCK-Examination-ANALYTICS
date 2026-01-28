
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
  const [step, setStep] = useState<'IDENTITY' | 'OTP' | 'DISCOVERY'>('IDENTITY');
  const [credentials, setCredentials] = useState({
    identityId: '',
    accessKey: '',
  });
  
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [resolvedSession, setResolvedSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter global registry for Discovery mode
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

  const generateOtp = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOtp(code);
    setOtpInput('');
  };

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
      const { data: persistenceData, error: fetchError } = await supabase
        .from('uba_persistence')
        .select('id, payload')
        .or(`id.eq.registry_${rootHubId},id.eq.${rootHubId}_facilitators,id.eq.${rootHubId}_students`);

      if (fetchError || !persistenceData || persistenceData.length === 0) {
         throw new Error("Handshake Failed: Identity Node not found.");
      }

      const registryShard = persistenceData.find(d => d.id === `registry_${rootHubId}`)?.payload;
      const rawEntry = Array.isArray(registryShard) ? registryShard[0] : registryShard;
      if (!rawEntry) throw new Error("Institutional registry is offline.");

      const facilitatorsShard = persistenceData.find(d => d.id === `${rootHubId}_facilitators`)?.payload as Record<string, StaffAssignment>;
      const studentsShard = persistenceData.find(d => d.id === `${rootHubId}_students`)?.payload as StudentData[];

      let isVerified = false;
      let sessionPayload: any = null;

      if (authMode === 'ADMIN') {
        if (inputId !== rootHubId) throw new Error("Admin access requires the Root Hub ID.");
        isVerified = (rawEntry.accessCode || "").trim().toUpperCase() === inputKey;
        sessionPayload = { type: 'ADMIN', hubId: rootHubId };
      } 
      else if (authMode === 'FACILITATOR') {
        if (facilitatorsShard) {
          const staff = Object.values(facilitatorsShard).find(f => 
            `${rootHubId}/${f.enrolledId}` === inputId && (f.passkey || "").toUpperCase() === inputKey
          );
          if (staff) {
            isVerified = true;
            sessionPayload = { type: 'FACILITATOR', name: staff.name, subject: staff.taughtSubject, hubId: rootHubId };
          }
        }
      } 
      else if (authMode === 'PUPIL') {
        if (studentsShard) {
          const pupil = studentsShard.find(s => 
            `${rootHubId}/PUP-${s.id}` === inputId && (s.passkey || "").toUpperCase() === inputKey
          );
          if (pupil) {
            isVerified = true;
            sessionPayload = { type: 'PUPIL', id: pupil.id, hubId: rootHubId };
          }
        }
      }

      if (!isVerified) throw new Error(`Access Denied: Invalid ${authMode} credentials.`);

      setResolvedSession(sessionPayload);
      generateOtp();
      setStep('OTP');
      setIsAuthenticating(false);

    } catch (err: any) {
      setErrorMessage(err.message);
      setIsAuthenticating(false);
      setTimeout(() => setErrorMessage(null), 5000);
    }
  };

  const handleOtpVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpInput === generatedOtp) {
      setIsAuthenticating(true);
      const { data: registryData } = await supabase
        .from('uba_persistence')
        .select('payload')
        .eq('id', `registry_${resolvedSession.hubId}`)
        .maybeSingle();
      
      const rawEntry = Array.isArray(registryData?.payload) ? registryData?.payload[0] : registryData?.payload;
      const systemAuthEmail = `${resolvedSession.hubId.toLowerCase()}@unitedbaylor.edu`;
      const masterPassword = (rawEntry.accessCode || "").trim().toUpperCase();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: systemAuthEmail,
        password: masterPassword 
      });

      if (authError) {
        setErrorMessage("Node Decryption Failed.");
        setStep('IDENTITY');
        setIsAuthenticating(false);
        return;
      }

      if (resolvedSession.type === 'ADMIN') onLoginSuccess(resolvedSession.hubId);
      else if (resolvedSession.type === 'FACILITATOR') onFacilitatorLogin(resolvedSession.name, resolvedSession.subject, resolvedSession.hubId);
      else onPupilLogin(resolvedSession.id, resolvedSession.hubId);
    } else {
      setErrorMessage("Handshake Sync Failed: Incorrect OTP.");
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const selectDiscoveredNode = (nodeId: string) => {
    setCredentials(prev => ({ ...prev, identityId: nodeId }));
    setStep('IDENTITY');
    setSearchQuery('');
  };

  return (
    <div className="w-full max-w-lg px-4 md:px-0 animate-in fade-in zoom-in-95 duration-700">
      <div className="bg-slate-950 p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
        
        <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-20"></div>

        {isAuthenticating && (
          <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center space-y-6">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-black text-white uppercase tracking-[0.4em] animate-pulse">Synchronizing Security Nodes...</p>
          </div>
        )}

        <div className="text-center relative mb-8">
          <div className="inline-block px-5 py-1.5 rounded-full bg-blue-600 text-white text-[8px] font-black uppercase tracking-[0.3em] mb-4 shadow-[0_0_20px_rgba(37,99,235,0.4)]">
             CROSS-DEVICE ACCESS TERMINAL
          </div>
          <div className="w-16 h-16 bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-2xl">
             <img src={ACADEMY_ICON} alt="UBA Shield" className="w-10 h-10 object-contain opacity-80" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Authentication Hub</h2>
          <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.4em] mt-3">Node ID: {credentials.identityId || 'UNSET'}</p>
        </div>

        {step === 'IDENTITY' && (
          <>
            <div className="flex bg-white/5 p-1 rounded-2xl mb-6 border border-white/5 overflow-x-auto no-scrollbar">
              {['ADMIN', 'FACILITATOR', 'PUPIL'].map(mode => (
                <button key={mode} onClick={() => setAuthMode(mode as any)} className={`flex-1 min-w-[80px] py-2.5 px-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${authMode === mode ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>{mode}</button>
              ))}
            </div>

            <form onSubmit={handleIdentityCheck} className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5 relative">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Identity UID</label>
                    <button type="button" onClick={() => setStep('DISCOVERY')} className="text-[8px] font-black text-blue-400 uppercase tracking-widest hover:text-white transition-colors">Find My Hub?</button>
                  </div>
                  <input 
                    type="text" 
                    value={credentials.identityId} 
                    onChange={(e) => setCredentials({...credentials, identityId: e.target.value})} 
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-xs font-black text-white outline-none focus:ring-4 focus:ring-blue-500/10 uppercase" 
                    placeholder={authMode === 'ADMIN' ? 'UBA-YYYY-XXXX' : authMode === 'FACILITATOR' ? 'UBA-YYYY-XXXX/FAC-00' : 'UBA-YYYY-XXXX/PUP-000'} 
                    required 
                  />
                </div>

                <div className="space-y-1.5 relative">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest ml-1">Passkey</label>
                  <div className="relative">
                    <input 
                      type={showKey ? "text" : "password"} 
                      value={credentials.accessKey} 
                      onChange={(e) => setCredentials({...credentials, accessKey: e.target.value})} 
                      className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-xs font-mono font-black text-blue-400 outline-none focus:ring-4 focus:ring-blue-500/10 uppercase pr-12 tracking-widest" 
                      placeholder={authMode === 'ADMIN' ? 'SEC-••••••••' : authMode === 'FACILITATOR' ? 'S-••••' : 'P-••••'} 
                      required 
                    />
                    <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white transition-colors">
                        {showKey ? '👁️' : '🔒'}
                    </button>
                  </div>
                </div>
              </div>

              {errorMessage && <div className="bg-red-500/10 text-red-500 p-4 rounded-2xl text-[8px] font-black uppercase text-center border border-red-500/20 animate-pulse">{errorMessage}</div>}

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-[0_0_30px_rgba(37,99,235,0.3)] transition-all active:scale-95">
                Initiate Handshake
              </button>
            </form>
          </>
        )}

        {step === 'OTP' && (
          <form onSubmit={handleOtpVerification} className="space-y-8 animate-in slide-in-from-right-4 duration-500">
             <div className="text-center space-y-2">
                <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-3xl border border-emerald-500/20 inline-block mb-4">
                   <span className="text-3xl font-mono font-black tracking-[0.5em]">{generatedOtp}</span>
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Security Handshake</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Type verification code for mobile sync</p>
             </div>

             <div className="flex justify-center gap-3">
                {['', '', '', ''].map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={otpInput[i] || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d?$/.test(val)) {
                        const next = otpInput.split('');
                        next[i] = val;
                        setOtpInput(next.join(''));
                        if (val && i < 3) (e.target.nextSibling as HTMLInputElement)?.focus();
                      }
                    }}
                    className="w-14 h-16 bg-slate-900 border border-white/10 rounded-2xl text-center text-2xl font-black text-white outline-none focus:ring-4 focus:ring-blue-500/20"
                    autoFocus={i === 0}
                  />
                ))}
             </div>

             <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-3xl font-black text-[10px] uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all">
               Verify & Decrypt
             </button>
             <button type="button" onClick={() => setStep('IDENTITY')} className="w-full text-[8px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">Return to Identity Node</button>
          </form>
        )}

        {step === 'DISCOVERY' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
             <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Network Node Discovery</h3>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Search cloud registry by school name</p>
             </div>
             <div className="relative">
                <input 
                   type="text" 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="Search: 'United Baylor'..."
                   className="w-full bg-slate-900 border border-blue-500/30 rounded-2xl px-12 py-4 text-xs font-black text-white outline-none focus:ring-4 focus:ring-blue-500/10 uppercase"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
             </div>

             <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                {discoveryResults.map(school => (
                  <button 
                    key={school.id}
                    onClick={() => selectDiscoveredNode(school.id)}
                    className="w-full text-left bg-white/5 hover:bg-blue-600/20 border border-white/5 p-4 rounded-2xl transition-all group"
                  >
                     <p className="text-[10px] font-black text-white uppercase group-hover:text-blue-400">{school.name}</p>
                     <p className="text-[8px] font-mono text-slate-500 mt-1 uppercase tracking-widest">UID: {school.id}</p>
                  </button>
                ))}
                {searchQuery && discoveryResults.length === 0 && (
                   <p className="text-center py-8 text-[9px] font-black text-slate-600 uppercase italic">No matching nodes found in the cloud registry</p>
                )}
             </div>

             <button type="button" onClick={() => setStep('IDENTITY')} className="w-full py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors border border-white/5 rounded-2xl">Return to Access Terminal</button>
          </div>
        )}

        <div className="pt-6 text-center border-t border-white/5 mt-6">
           <button onClick={onSwitchToRegister} className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest hover:text-blue-400">Enroll New Institutional Node</button>
        </div>
      </div>
    </div>
  );
};

export default LoginPortal;
