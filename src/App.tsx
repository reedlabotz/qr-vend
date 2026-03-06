import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Search, MapPin, Building2, Send, Phone, User, CheckCircle2, ChevronRight, LayoutGrid, LogOut, Loader2 } from 'lucide-react';
import QRCodeComponent from 'qrcode';
import { sheetService, type ClaimData } from './services/sheets';
import { translations, type Language, type TeamMember } from './services/i18n';

// Types
type Screen = 'LOGIN' | 'START' | 'FORM' | 'RESULT' | 'HISTORY';

export default function App() {
  const [screen, setScreen] = useState<Screen>('LOGIN');
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [recentClaims, setRecentClaims] = useState<ClaimData[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimData | null>(null);

  // User & i18n State
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [lang, setLang] = useState<Language>('english');

  const t = (key: string) => translations[lang][key] || key;

  useEffect(() => {
    const initTeam = async () => {
      try {
        const members = await sheetService.fetchTeamMembers();
        setTeamMembers(members);
      } catch {
        setError("Failed to load team list.");
      }
    };
    initTeam();
  }, []);

  const handleLogin = (member: TeamMember) => {
    setCurrentUser(member);
    setLang(member.language);
    setScreen('START');
  };

  const resetFlow = () => {
    setScreen('START');
    setFormData({ name: '', phone: '' });
    setCurrentUrl(null);
    setQrCodeDataUrl(null);
    setError(null);
    setSelectedClaim(null);
  };

  const handleStart = () => {
    setError(null);
    setScreen('FORM');
  };

  const handleSubmit = async (location: 'Office' | 'Field') => {
    if (!formData.name || !formData.phone) {
      setError("Please fill in both name and phone number.");
      return;
    }
    setError(null);
    if (!currentUrl || !currentUser) return;

    setIsThinking(true);
    try {
      const claim: Omit<ClaimData, 'url'> = {
        recipientName: formData.name,
        recipientPhone: formData.phone,
        location,
        claimedBy: currentUser.name,
        timestamp: new Date().toISOString(),
      };

      // Atomic Fetch & Claim
      const assignedUrl = await sheetService.claimNextUrl(claim as ClaimData);
      setCurrentUrl(assignedUrl);

      const qrUrl = await QRCodeComponent.toDataURL(assignedUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      setQrCodeDataUrl(qrUrl);
      setScreen('RESULT');
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to finalize survey claim.";
      setError(message);
    } finally {
      setIsThinking(false);
    }
  };

  const loadHistory = async () => {
    if (!currentUser) return;
    setIsThinking(true);
    setError(null);
    try {
      const history = await sheetService.getRecentClaims(currentUser.name);
      setRecentClaims(history);
      setScreen('HISTORY');
    } catch {
      setError(t('history_error') || "Failed to load recent activity.");
    } finally {
      setIsThinking(false);
    }
  };

  const viewHistoryItem = async (claim: ClaimData) => {
    setLoading(true);
    setError(null);
    try {
      const qrUrl = await QRCodeComponent.toDataURL(claim.url, { // Kept claim.url as 'url' is not defined in this scope
        width: 400,
        margin: 2,
      });
      setQrCodeDataUrl(qrUrl);
      setSelectedClaim(claim);
      setScreen('RESULT');
    } catch {
      setError("Failed to generate QR for history item.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnclaim = async () => {
    const url = currentUrl || selectedClaim?.url;
    if (!url) return;

    // If we're just on the form, we haven't claimed yet, so just reset locally
    if (screen === 'FORM') {
      resetFlow();
      return;
    }

    setIsThinking(true);
    setError(null);
    try {
      await sheetService.unclaimUrl(url);
      resetFlow();
    } catch {
      setError(t('unclaiming'));
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-xl mx-auto flex flex-col p-4 md:p-8 relative">
      <AnimatePresence>
        {isThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto rounded-3xl"
          >
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
              <span className="text-white text-sm font-medium tracking-widest uppercase">Thinking...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent Header */}
      {
        currentUser && (
          <div className="flex justify-between items-center mb-8 px-2">
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">{t('user_label')}</span>
              <span className="text-base font-medium text-white">{currentUser.name}</span>
            </div>
            <button
              onClick={() => { setCurrentUser(null); setScreen('LOGIN'); }}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm"
            >
              <LogOut size={16} />
              {t('switch_user')}
            </button>
          </div>
        )
      }

      <AnimatePresence mode="wait">
        {screen === 'LOGIN' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col justify-center items-center space-y-8"
          >
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-light tracking-tight text-white">Survey Application</h1>
              <p className="text-zinc-300 text-lg">Please select your profile</p>
            </div>

            <div className="w-full max-w-xs space-y-3">
              {teamMembers.length === 0 ? (
                <p className="text-center text-zinc-600 text-sm animate-pulse">{t('loading_team')}</p>
              ) : (
                teamMembers.map((member) => (
                  <button
                    key={member.name}
                    onClick={() => handleLogin(member)}
                    className="w-full glass-effect p-5 flex items-center justify-between group hover:border-zinc-400 transition-all text-left"
                  >
                    <div className="flex flex-col">
                      <span className="text-white text-lg font-medium">{member.name}</span>
                      <span className="text-zinc-400 text-xs uppercase tracking-wider">{member.language}</span>
                    </div>
                    <ChevronRight size={22} className="text-zinc-500 group-hover:text-zinc-200" />
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}

        {screen === 'START' && (
          <motion.div
            key="start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col justify-center items-center space-y-12"
          >
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-light tracking-tight text-white">{t('portal_title')}</h1>
              <p className="text-zinc-300 text-lg">{t('system_ready')}</p>
            </div>

            <div className="w-full space-y-4 max-w-xs">
              <button
                onClick={handleStart}
                disabled={loading}
                className="w-full h-40 glass-effect btn-hover flex flex-col items-center justify-center gap-4 hover:border-zinc-500/50"
              >
                <div className="p-4 rounded-full bg-white/5 border border-white/10 text-white/70">
                  <LayoutGrid size={32} strokeWidth={1.5} />
                </div>
                <span className="text-xl font-medium text-white">
                  {loading ? t('issue_btn') : t('issue_new')}
                </span>
              </button>

              <button
                onClick={loadHistory}
                className="w-full py-4 px-6 glass-effect btn-hover flex items-center justify-between hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <History size={20} className="text-zinc-400" />
                  <span className="text-zinc-200 text-lg">{t('view_recent')}</span>
                </div>
                <ChevronRight size={20} className="text-zinc-500" />
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 text-sm"
              >
                {error}
              </motion.div>
            )}
          </motion.div>
        )}

        {screen === 'FORM' && (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full pt-4"
          >
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-medium text-zinc-200">{t('new_registration')}</h2>
              <button onClick={resetFlow} className="p-2 -mr-2 text-zinc-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-8 glass-effect p-6 md:p-10 mb-8">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm uppercase tracking-widest text-zinc-400 font-bold mb-2 block">
                    {t('full_name')}
                  </label>
                  <div className="relative">
                    <User size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Jane Doe"
                      className="w-full bg-zinc-900/50 border border-zinc-700 focus:border-white pl-10 pr-4 py-4 rounded-lg text-white text-lg outline-none transition-all placeholder:text-zinc-600"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2 block">
                    {t('phone_number')}
                  </label>
                  <div className="relative">
                    <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                    <input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-zinc-900/50 border border-zinc-800 focus:border-zinc-500 pl-10 pr-4 py-3 rounded-lg text-white outline-none transition-all"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <p className="text-sm text-center text-zinc-400 px-4 font-medium uppercase tracking-widest">
                  {t('select_location')}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSubmit('Office')}
                    disabled={loading}
                    className="flex flex-col items-center gap-4 p-6 rounded-xl border border-zinc-700 hover:border-white hover:bg-white/5 active:bg-white/10 transition-all group"
                  >
                    <Building2 size={28} strokeWidth={1.5} className="text-zinc-400 group-hover:text-white" />
                    <span className="text-base font-semibold text-zinc-300 group-hover:text-white">{t('office')}</span>
                  </button>
                  <button
                    onClick={() => handleSubmit('Field')}
                    disabled={loading}
                    className="flex flex-col items-center gap-4 p-6 rounded-xl border border-zinc-700 hover:border-white hover:bg-white/5 active:bg-white/10 transition-all group"
                  >
                    <MapPin size={28} strokeWidth={1.5} className="text-zinc-400 group-hover:text-white" />
                    <span className="text-base font-semibold text-zinc-300 group-hover:text-white">{t('field')}</span>
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {screen === 'RESULT' && qrCodeDataUrl && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex-1 flex flex-col items-center justify-center space-y-12 max-w-md mx-auto w-full pt-4"
          >
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <CheckCircle2 size={14} />
                {t('success_registered')}
              </div>
              <h2 className="text-2xl font-light text-white">{t('share_access')}</h2>
            </div>

            <div className="w-full bg-white p-6 rounded-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-zinc-100 opacity-0 group-hover:opacity-10 transition-opacity pointer-events-none" />
              <img src={qrCodeDataUrl} alt="QR Code" className="w-full h-auto" />
            </div>

            <div className="w-full space-y-6">
              <div className="p-6 rounded-xl bg-zinc-900 border border-zinc-700 text-center space-y-2">
                <p className="text-xs text-zinc-400 uppercase tracking-widest font-bold">{t('recipient')}</p>
                <p className="text-white text-xl font-bold">{formData.name || selectedClaim?.recipientName}</p>
                <p className="text-zinc-300 text-base">{formData.phone || selectedClaim?.recipientPhone}</p>
              </div>

              <div className="flex flex-col gap-3">
                <a
                  href={`https://wa.me/${formData.phone || selectedClaim?.recipientPhone}?text=${encodeURIComponent('Here is your survey link: ' + (currentUrl || selectedClaim?.url))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 text-center bg-[#25D366] text-white font-bold rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all shadow-lg shadow-emerald-950/20"
                >
                  <Send size={20} />
                  {t('open_whatsapp')}
                </a>

                <button
                  onClick={handleUnclaim}
                  disabled={loading}
                  className="w-full py-4 px-6 border border-zinc-800 hover:border-red-900/50 hover:bg-red-950/10 text-zinc-500 hover:text-red-400 rounded-xl flex items-center justify-center gap-3 transition-all"
                >
                  <X size={20} />
                  {loading ? t('unclaiming') : t('cancel')}
                </button>

                <button
                  onClick={resetFlow}
                  className="w-full py-4 text-zinc-400 hover:text-white transition-colors"
                >
                  {t('return_dashboard')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {screen === 'HISTORY' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col w-full max-w-md mx-auto pt-4"
          >
            <div className="flex justify-between items-center mb-10">
              <div className="space-y-1">
                <h2 className="text-2xl font-light text-white">{t('activity')}</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">{t('user_label')}: {currentUser?.name}</p>
              </div>
              <button onClick={resetFlow} className="p-2 -mr-2 text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {recentClaims.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-zinc-600 glass-effect">
                  <LayoutGrid size={48} strokeWidth={1} className="mb-4 opacity-20" />
                  <p className="text-sm">{t('no_activity')}</p>
                </div>
              ) : (
                recentClaims.map((claim, idx) => (
                  <button
                    key={idx}
                    onClick={() => viewHistoryItem(claim)}
                    className="w-full p-5 glass-effect flex items-center justify-between group active:scale-[0.99] transition-all"
                  >
                    <div className="text-left space-y-1">
                      <p className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {claim.id} • {claim.recipientName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        <span>{claim.location === 'Office' ? t('office') : t('field')}</span>
                        <span>•</span>
                        <span>
                          {new Date(claim.timestamp).toLocaleString(undefined, {
                            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-zinc-600 group-hover:border-white transition-all">
                      <Search size={20} className="text-zinc-300 group-hover:text-white" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div >
  );
}
