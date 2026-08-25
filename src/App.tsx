import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Cycle, DailyLog, SystemSettings, UserProfile } from './types';
import { createInitialSystemState } from './data/initialData';
import { computeCycleMetrics } from './engine/bushidoCalculations';
import { getLogicalTodayDate, addDaysToDate } from './utils/dateUtils';
import { applyAccentTheme } from './utils/themeUtils';
import { Navbar } from './components/Navbar';
import { BattlefieldView } from './components/BattlefieldView';
import { CycleDashboardView } from './components/CycleDashboardView';
import { ArchivesView } from './components/ArchivesView';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { AutopsyModal } from './components/AutopsyModal';
import { PaymentModal } from './components/PaymentModal';
import { AuthModal } from './components/AuthModal';
import { AdminView } from './components/AdminView';
import { RotateCcw, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const STORAGE_KEY = 'bushido_discipline_os_v1';
const TOKEN_KEY = 'bushido_auth_token';

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [systemState, setSystemState] = useState<{
    cycles: Cycle[];
    logs: DailyLog[];
    settings: SystemSettings;
    userProfile: UserProfile;
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.userProfile) {
          const initial = createInitialSystemState();
          parsed.userProfile = initial.userProfile;
        }
        // Ensure cycle 1 or any active cycle is not unintentionally locked if requested
        if (Array.isArray(parsed.cycles)) {
          parsed.cycles = parsed.cycles.map((c: Cycle) => {
            if (c.id === 'cycle-1' && c.isArchived) {
              return { ...c, isArchived: false };
            }
            return c;
          });
        }
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to load from localStorage, initializing fresh:', e);
    }
    return createInitialSystemState();
  });

  const [activeCycleId, setActiveCycleId] = useState<string>(() => {
    return systemState.cycles[0]?.id || 'cycle-1';
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => getLogicalTodayDate());
  const [activeTab, setActiveTab] = useState<string>('battlefield');
  const [autopsyTargetLog, setAutopsyTargetLog] = useState<DailyLog | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [appToastMessage, setAppToastMessage] = useState<string | null>(null);

  const showAppToast = (msg: string) => {
    setAppToastMessage(msg);
    setTimeout(() => {
      setAppToastMessage(null);
    }, 4000);
  };

  const handleSelectDate = useCallback((newDate: string) => {
    setSelectedDate(newDate);

    // Auto switch active cycle if newDate falls into another cycle
    const matchedCycle = systemState.cycles.find(c => {
      const end = c.endDate || addDaysToDate(c.startDate, 89);
      return newDate >= c.startDate && newDate <= end;
    });

    if (matchedCycle && matchedCycle.id !== activeCycleId) {
      setActiveCycleId(matchedCycle.id);
    }
  }, [systemState.cycles, activeCycleId]);

  // Sync to local storage for instant offline resilience and apply accent theme
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(systemState));
    } catch (e) {
      console.error('LocalStorage save error:', e);
    }
    const theme = systemState.userProfile?.accentTheme || systemState.settings?.accentTheme || 'amber';
    applyAccentTheme(theme);
  }, [systemState]);

  // Fetch user profile and backend data on mount or token change
  useEffect(() => {
    const fetchBackendData = async () => {
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (authToken) {
          headers['Authorization'] = `Bearer ${authToken}`;
        }

        // Fetch User profile if logged in
        if (authToken) {
          const userRes = await fetch('/api/auth/me', { headers });
          if (userRes.ok) {
            const userData = await userRes.json();
            if (userData.user) {
              setSystemState(prev => ({
                ...prev,
                userProfile: {
                  ...prev.userProfile,
                  ...userData.user,
                  isVip: !!userData.user.isVip
                }
              }));
            }
          } else {
            // Token expired
            localStorage.removeItem(TOKEN_KEY);
            setAuthToken(null);
          }
        }

        // Fetch Cycles
        const cyclesRes = await fetch('/api/cycles', { headers });
        if (cyclesRes.ok) {
          const cyclesData = await cyclesRes.json();
          if (Array.isArray(cyclesData) && cyclesData.length > 0) {
            setSystemState(prev => ({
              ...prev,
              cycles: cyclesData
            }));
          }
        }

        // Fetch Daily Logs
        const logsRes = await fetch('/api/daily-logs', { headers });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          if (Array.isArray(logsData) && logsData.length > 0) {
            setSystemState(prev => ({
              ...prev,
              logs: logsData
            }));
          }
        }
      } catch (err) {
        console.warn('Backend sync warning (running in offline/local fallback):', err);
      }
    };

    fetchBackendData();
  }, [authToken]);

  const currentCycle = useMemo(() => {
    return systemState.cycles.find(c => c.id === activeCycleId) || systemState.cycles[0];
  }, [systemState.cycles, activeCycleId]);

  const logicalToday = getLogicalTodayDate();

  const cycleMetrics = useMemo(() => {
    if (!currentCycle) return null;
    return computeCycleMetrics(currentCycle, systemState.logs, systemState.cycles, logicalToday);
  }, [currentCycle, systemState.logs, systemState.cycles, logicalToday]);

  const handleUpdateLog = useCallback(async (updatedLog: DailyLog) => {
    // 1. Optimistic UI update
    setSystemState(prev => {
      const existingIdx = prev.logs.findIndex(l => l.date === updatedLog.date);
      let newLogs: DailyLog[];
      if (existingIdx >= 0) {
        newLogs = [...prev.logs];
        newLogs[existingIdx] = updatedLog;
      } else {
        newLogs = [...prev.logs, updatedLog];
      }
      return {
        ...prev,
        logs: newLogs
      };
    });

    // 2. Background sync with backend
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      await fetch('/api/daily-logs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...updatedLog,
          cycleId: updatedLog.cycleId || activeCycleId
        })
      });
    } catch (e) {
      console.warn('Failed to sync log to server backend (saved locally):', e);
    }
  }, [authToken, activeCycleId]);

  const handleUpdateCycle = useCallback(async (updatedCycle: Cycle) => {
    setSystemState(prev => ({
      ...prev,
      cycles: prev.cycles.map(c => c.id === updatedCycle.id ? updatedCycle : c)
    }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      await fetch(`/api/cycles/${updatedCycle.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedCycle)
      });
    } catch (e) {
      console.warn('Failed to sync cycle update to server:', e);
    }
  }, [authToken]);

  const handleDeleteCycle = useCallback(async (cycleId: string) => {
    // 1. Calculate remaining cycles first
    const remainingCycles = systemState.cycles.filter(c => c.id !== cycleId);
    const remainingLogs = systemState.logs.filter(l => l.cycleId !== cycleId);

    setSystemState(prev => ({
      ...prev,
      cycles: prev.cycles.filter(c => c.id !== cycleId),
      logs: prev.logs.filter(l => l.cycleId !== cycleId)
    }));

    // 2. Switch active cycle immediately if current was deleted
    if (activeCycleId === cycleId && remainingCycles.length > 0) {
      setActiveCycleId(remainingCycles[0].id);
      setSelectedDate(remainingCycles[0].startDate);
    }

    try {
      const headers: Record<string, string> = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      await fetch(`/api/cycles/${cycleId}`, {
        method: 'DELETE',
        headers
      });
    } catch (e) {
      console.warn('Failed to sync cycle deletion to server:', e);
    }
  }, [authToken, activeCycleId, systemState.cycles, systemState.logs]);

  const handleUpdateUserProfile = useCallback(async (updatedProfile: UserProfile) => {
    setSystemState(prev => ({
      ...prev,
      userProfile: updatedProfile
    }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      await fetch('/api/user/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updatedProfile)
      });
    } catch (e) {
      console.warn('Failed to sync user profile:', e);
    }
  }, [authToken]);

  const handleCreateNewCycle = useCallback(async (title: string, startDate: string, targetTheme: string) => {
    const newCycle: Cycle = {
      id: `cycle-${Date.now()}`,
      title,
      startDate,
      endDate: addDaysToDate(startDate, 89),
      targetTheme,
      inheritedStreak: cycleMetrics?.pureStreak || 0,
      isArchived: false,
      reportRead: false
    };

    setSystemState(prev => ({
      ...prev,
      cycles: [...prev.cycles, newCycle]
    }));
    setActiveCycleId(newCycle.id);
    setSelectedDate(startDate);
    setActiveTab('battlefield');

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      await fetch('/api/cycles', {
        method: 'POST',
        headers,
        body: JSON.stringify(newCycle)
      });
    } catch (e) {
      console.warn('Failed to save cycle to server:', e);
    }
  }, [authToken, cycleMetrics?.pureStreak]);

  const handleUpdateSettings = useCallback(async (updatedSettings: SystemSettings) => {
    setSystemState(prev => ({
      ...prev,
      settings: updatedSettings
    }));
  }, []);

  const handleExportData = () => {
    const data = {
      cycles: systemState.cycles,
      logs: systemState.logs,
      settings: systemState.settings,
      userProfile: systemState.userProfile,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bushido-discipline-backup-${logicalToday}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetData = () => {
    setIsResetConfirmOpen(true);
  };

  const handleConfirmReset = () => {
    const fresh = createInitialSystemState();
    setSystemState(fresh);
    setActiveCycleId(fresh.cycles[0].id);
    setSelectedDate(getLogicalTodayDate());
    setIsResetConfirmOpen(false);
    showAppToast('داده‌های سامانه با موفقیت به مقادیر اولیه بوشیدو بازنشانی شد.');
  };

  const handleImportData = (dataStr: string) => {
    try {
      const parsed = JSON.parse(dataStr);
      if (parsed.cycles && parsed.logs && parsed.settings) {
        if (!parsed.userProfile) {
          parsed.userProfile = createInitialSystemState().userProfile;
        }
        setSystemState(parsed);
        setActiveCycleId(parsed.cycles[0]?.id || 'cycle-1');
        showAppToast('اطلاعات پشتیبان با موفقیت بازیابی شد.');
      } else {
        showAppToast('فرمت فایل پشتیبان نامعتبر است.');
      }
    } catch {
      showAppToast('خطا در خواندن فایل JSON.');
    }
  };

  const handleAuthSuccess = (token: string, user: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, token);
    setAuthToken(token);
    setSystemState(prev => ({
      ...prev,
      userProfile: user
    }));
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setAuthToken(null);
    setSystemState(prev => ({
      ...prev,
      userProfile: {
        ...createInitialSystemState().userProfile,
        isVip: false,
        tier: 'free'
      }
    }));
    setIsAuthModalOpen(false);
  };

  if (!currentCycle || !cycleMetrics) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-zinc-400 font-bold text-sm">
        در حال راه‌اندازی موتور دیسیپلین بوشیدو...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-amber-500 selection:text-black pb-20 lg:pb-8">
      {/* Top Hub Bar */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        cycles={systemState.cycles}
        currentCycle={currentCycle}
        onSelectCycle={c => setActiveCycleId(c.id)}
        metrics={cycleMetrics}
        settings={systemState.settings}
        userProfile={systemState.userProfile}
        onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDebtAutopsy={() => {
          // Find first unresolved debt log
          const firstDebt = systemState.logs.find(l => {
            if (l.date >= logicalToday) return false;
            const habitKeys = ['wakeUp', 'workout', 'study', 'journal', 'hardTask'] as const;
            const isStd = habitKeys.every(k => l[k]);
            const isFrozen = l.failureReason === 'دلایل شخصی';
            const isResolved = !!(l.failureReason && (isFrozen || l.failureTime));
            return !isStd && !isResolved;
          });
          if (firstDebt) {
            setAutopsyTargetLog(firstDebt);
          } else {
            setActiveTab('battlefield');
          }
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6 pb-20 sm:pb-8">
        {activeTab === 'battlefield' && (
          <BattlefieldView
            currentCycle={currentCycle}
            metrics={cycleMetrics}
            logs={systemState.logs}
            selectedDate={selectedDate}
            nightOwlCutoffHour={systemState.userProfile?.nightOwlCutoffHour ?? systemState.settings?.nightOwlCutoffHour ?? 4}
            onSelectDate={handleSelectDate}
            onUpdateLog={handleUpdateLog}
            onOpenAutopsy={log => setAutopsyTargetLog(log)}
            onNavigateToArchives={() => setActiveTab('archives')}
          />
        )}

        {(activeTab === 'dashboard' || activeTab === 'cycle') && (
          <CycleDashboardView
            currentCycle={currentCycle}
            metrics={cycleMetrics}
            logs={systemState.logs}
            cycles={systemState.cycles}
            allTimeSettings={{
              allTimeMaxStreak: systemState.settings?.allTimeMaxStreak ?? 0,
              allTimeMaxScore: systemState.settings?.allTimeMaxScore ?? 0,
              allTimeMaxStandardDays: systemState.settings?.allTimeMaxStandardDays ?? 0,
            }}
            onSelectDate={d => {
              handleSelectDate(d);
              setActiveTab('battlefield');
            }}
            onNavigateTab={tab => setActiveTab(tab)}
          />
        )}

        {(activeTab === 'archives' || activeTab === 'database' || activeTab === 'court') && (
          <ArchivesView
            cycles={systemState.cycles}
            currentCycle={currentCycle}
            logs={systemState.logs}
            metrics={cycleMetrics}
            onSelectCycle={c => setActiveCycleId(c.id)}
            onUpdateCycle={handleUpdateCycle}
            onDeleteCycle={handleDeleteCycle}
            onSelectDate={d => {
              handleSelectDate(d);
              setActiveTab('battlefield');
            }}
            onOpenAutopsy={log => setAutopsyTargetLog(log)}
            onCreateNewCycle={handleCreateNewCycle}
          />
        )}

        {(activeTab === 'profile' || activeTab === 'settings') && (
          <ProfileSettingsView
            userProfile={systemState.userProfile}
            settings={systemState.settings}
            onUpdateUserProfile={handleUpdateUserProfile}
            onUpdateSettings={handleUpdateSettings}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onLogout={handleLogout}
            onResetData={handleResetData}
            onImportData={handleImportData}
            onExportData={handleExportData}
            onNavigateToAdmin={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminView
            currentUser={systemState.userProfile}
            authToken={authToken}
            onBack={() => setActiveTab('profile')}
            onRefreshUserProfile={() => {
              if (authToken) {
                fetch('/api/auth/me', {
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                  }
                })
                  .then(r => r.json())
                  .then(data => {
                    if (data?.user) {
                      setSystemState(prev => ({
                        ...prev,
                        userProfile: {
                          ...prev.userProfile,
                          ...data.user,
                          isVip: !!data.user.isVip
                        }
                      }));
                    }
                  })
                  .catch(console.error);
              }
            }}
          />
        )}
      </main>

      {/* Autopsy Drawer/Modal */}
      {autopsyTargetLog && (
        <AutopsyModal
          log={autopsyTargetLog}
          cycleTheme={currentCycle.targetTheme}
          allUnresolvedLogs={systemState.logs.filter(l => {
            if (l.date >= logicalToday) return false;
            const habitKeys = ['wakeUp', 'workout', 'study', 'journal', 'hardTask'] as const;
            const isStd = habitKeys.every(k => l[k]);
            const isFrozen = l.failureReason === 'دلایل شخصی';
            const isResolved = !!(l.failureReason && (isFrozen || l.failureTime));
            return !isStd && !isResolved;
          })}
          onSelectLog={nextLog => setAutopsyTargetLog(nextLog)}
          onSave={handleUpdateLog}
          onClose={() => setAutopsyTargetLog(null)}
        />
      )}

      {/* Mock Payment / Subscription Modal */}
      <PaymentModal
        userProfile={systemState.userProfile}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onUpgradeSuccess={handleUpdateUserProfile}
      />

      {/* User Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={systemState.userProfile?.id ? systemState.userProfile : null}
        onAuthSuccess={handleAuthSuccess}
        onLogout={handleLogout}
      />

      {/* Global App Toast Notification */}
      {appToastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#121215]/95 border border-amber-500/40 text-zinc-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs sm:text-sm font-bold backdrop-blur-xl animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{appToastMessage}</span>
          <button 
            onClick={() => setAppToastMessage(null)}
            className="text-zinc-400 hover:text-zinc-200 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121215] border border-red-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">
                  بازنشانی داده‌های سامانه
                </h3>
                <p className="text-xs text-red-400 mt-0.5">
                  بازگشت به مقادیر اولیه سیستم بوشیدو
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#09090b]/80 border border-zinc-800 rounded-2xl p-4">
              آیا از بازنشانی کلیه داده‌ها، لاگ‌ها و چرخه‌ها به اطلاعات نمونه اولیه سیستم بوشیدو اطمینان دارید؟ تمام تغییرات ثبت‌شده محلی پاک خواهند شد.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>بله، بازنشانی داده‌ها</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

