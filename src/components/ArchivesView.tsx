import React, { useState } from 'react';
import { DailyLog, Cycle, CycleMetrics, CycleVerdict } from '../types';
import { computeDailyProperties } from '../engine/bushidoCalculations';
import { formatPersianDate, getLogicalTodayDate, addDaysToDate, daysBetween } from '../utils/dateUtils';
import { toPersianDigits, toEnglishDigits, normalizeSearchText } from '../utils/numberUtils';
import { soundFX } from '../utils/audioEffects';
import { getDeterministicCourtVerdict } from '../engine/deterministicSensei';
import confetti from 'canvas-confetti';
import { 
  Archive, 
  Search, 
  Gavel, 
  Award, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  Snowflake, 
  Calendar, 
  Plus, 
  Layers, 
  FileBadge, 
  ChevronLeft, 
  Scroll, 
  ShieldCheck, 
  Check, 
  Clock, 
  Trash2, 
  Lock, 
  Unlock, 
  PackageCheck,
  X
} from 'lucide-react';

interface ArchivesViewProps {
  cycles: Cycle[];
  currentCycle: Cycle;
  logs: DailyLog[];
  metrics: CycleMetrics;
  onSelectCycle?: (cycle: Cycle) => void;
  onUpdateCycle: (updated: Cycle) => void;
  onDeleteCycle?: (cycleId: string) => void;
  onSelectDate: (date: string) => void;
  onOpenAutopsy: (log: DailyLog) => void;
  onCreateNewCycle: (title: string, startDate: string, targetTheme: string) => void;
}

export const ArchivesView: React.FC<ArchivesViewProps> = ({
  cycles,
  currentCycle,
  logs,
  metrics,
  onUpdateCycle,
  onDeleteCycle,
  onSelectDate,
  onOpenAutopsy,
  onCreateNewCycle
}) => {
  const logicalToday = getLogicalTodayDate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isGeneratingVerdict, setIsGeneratingVerdict] = useState(false);
  const [showNewCycleModal, setShowNewCycleModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showArchiveConfirmModal, setShowArchiveConfirmModal] = useState(false);
  const [showUnarchiveConfirmModal, setShowUnarchiveConfirmModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newStartDate, setNewStartDate] = useState(logicalToday);
  const [newTheme, setNewTheme] = useState('');
  const [modalOverlapError, setModalOverlapError] = useState<string | null>(null);
  const [archiveNotice, setArchiveNotice] = useState<string | null>(null);

  const verdict = currentCycle.verdict;

  // Bushido Archiving Check:
  const is90DaysFinished = logicalToday > currentCycle.endDate || metrics.elapsedDays >= 90;
  const hasUnresolvedDebts = metrics.unresolvedDebtCount > 0;
  const canArchive = is90DaysFinished && !hasUnresolvedDebts && !!verdict && !currentCycle.isArchived;

  const handleOpenArchiveModal = () => {
    if (!is90DaysFinished) {
      soundFX.playWarning();
      setArchiveNotice('بایگانی فقط پس از اتمام دوره کامل ۹۰ روزه امکان‌پذیر است.');
      setTimeout(() => setArchiveNotice(null), 5000);
      return;
    }
    if (hasUnresolvedDebts) {
      soundFX.playWarning();
      setArchiveNotice(`شما ${toPersianDigits(metrics.unresolvedDebtCount)} روز بدهی باز دارید. ابتدا تمام روزهای سوخته را کالبدشکافی کنید.`);
      setTimeout(() => setArchiveNotice(null), 5000);
      return;
    }
    if (!verdict) {
      soundFX.playWarning();
      setArchiveNotice('پیش از بایگانی نهایی، باید حکم رسمی دادگاه بوشیدو صادر شده باشد.');
      setTimeout(() => setArchiveNotice(null), 5000);
      return;
    }

    setShowArchiveConfirmModal(true);
  };

  const handleConfirmArchive = () => {
    onUpdateCycle({
      ...currentCycle,
      isArchived: true,
      reportRead: true
    });
    soundFX.playStandardDay();
    setShowArchiveConfirmModal(false);
    setArchiveNotice('چرخه با موفقیت به بایگانی رسمی منتقل و قفل شد.');
    setTimeout(() => setArchiveNotice(null), 5000);
  };

  const handleOpenUnarchiveModal = () => {
    setShowUnarchiveConfirmModal(true);
  };

  const handleConfirmUnarchive = () => {
    onUpdateCycle({
      ...currentCycle,
      isArchived: false
    });
    soundFX.playCheck();
    setShowUnarchiveConfirmModal(false);
    setArchiveNotice('چرخه از بایگانی خارج شد و به حالت فعال بازگشت.');
    setTimeout(() => setArchiveNotice(null), 5000);
  };

  const handleDeleteCurrentCycle = () => {
    if (!onDeleteCycle) return;
    if (cycles.length <= 1) {
      soundFX.playWarning();
      setArchiveNotice('امکان حذف تنها چرخه فعال در سیستم وجود ندارد.');
      setTimeout(() => setArchiveNotice(null), 5000);
      return;
    }
    setShowDeleteConfirmModal(true);
  };

  const handleConfirmDelete = () => {
    if (!onDeleteCycle) return;
    soundFX.playSlash();
    onDeleteCycle(currentCycle.id);
    setShowDeleteConfirmModal(false);
  };

  const handleGenerateVerdict = async () => {
    setIsGeneratingVerdict(true);
    try {
      const courtResult = getDeterministicCourtVerdict({
        cycleTitle: currentCycle.title,
        standardDays: metrics.standardDaysCount,
        totalDays: metrics.logsCount || 90,
        maxStreak: metrics.maxPureStreak,
        disciplinePercentage: metrics.disciplinePercentage,
        vulnerableHabits: metrics.vulnerableHabits
      });

      const newVerdict: CycleVerdict = {
        verdict: courtResult.verdict,
        grade: courtResult.grade,
        senseiNotes: courtResult.senseiNotes,
        strengths: courtResult.strengths,
        weaknesses: courtResult.weaknesses,
        bushidoSealDate: new Date().toISOString(),
        tacticalPlanForNextCycle: courtResult.tacticalPlanForNextCycle
      };

      onUpdateCycle({
        ...currentCycle,
        verdict: newVerdict
      });

      // Background AI analysis attempt
      fetch('/api/ai/verdict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycleTitle: currentCycle.title,
          standardDays: metrics.standardDaysCount,
          totalDays: metrics.logsCount || 90,
          maxStreak: metrics.maxPureStreak,
          disciplinePercentage: metrics.disciplinePercentage,
          vulnerableHabits: metrics.vulnerableHabits
        })
      }).catch(() => {});

      soundFX.playStandardDay();
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {}
    } catch (e) {
      console.error('Court verdict generation error:', e);
    } finally {
      setIsGeneratingVerdict(false);
    }
  };

  // High-Precision Comprehensive Search Engine for Bushido Daily Logs
  const matchLogWithQuery = (log: DailyLog, computed: ReturnType<typeof computeDailyProperties>, query: string): boolean => {
    if (!query.trim()) return true;
    const rawQ = query.trim();
    const qNorm = normalizeSearchText(rawQ);
    const qDigitsEn = toEnglishDigits(qNorm);
    const qDigitsFa = toPersianDigits(qDigitsEn);

    // 1. Day number calculation within current cycle (e.g., "روز ۱۵", "15", "۱۵", "روز اول")
    const dayNumber = Math.max(1, daysBetween(currentCycle.startDate, log.date) + 1);
    const dayNumberStrEn = String(dayNumber);
    const dayNumberStrFa = toPersianDigits(dayNumber);

    if (
      qDigitsEn === dayNumberStrEn || 
      qNorm === `روز ${dayNumberStrEn}` || 
      qNorm === `روز ${dayNumberStrFa}` ||
      qNorm.includes(`روز ${dayNumberStrEn}`) ||
      qNorm.includes(`روز ${dayNumberStrFa}`)
    ) {
      return true;
    }

    // 2. Dates (Persian full with weekday, short, and ISO Gregorian)
    const persianFull = normalizeSearchText(formatPersianDate(log.date, { withWeekday: true }));
    const persianShort = normalizeSearchText(formatPersianDate(log.date));
    const rawIso = log.date.toLowerCase();

    if (persianFull.includes(qNorm) || persianShort.includes(qNorm) || rawIso.includes(qDigitsEn)) {
      return true;
    }

    // 3. Temporal relative words ("امروز", "دیروز", "روز جاری")
    if (qNorm === 'امروز' || qNorm === 'روز جاری' || qNorm === 'today') {
      if (log.date === logicalToday) return true;
    }
    if (qNorm === 'دیروز' || qNorm === 'yesterday') {
      if (daysBetween(log.date, logicalToday) === 1) return true;
    }

    // 4. Status types & Persian keywords
    if (
      (qNorm.includes('استاندارد') || qNorm.includes('کامل') || qNorm.includes('تعهد') || qNorm.includes('پیروزی') || qNorm.includes('standard')) && 
      (computed.isStandard || computed.statusType === 'standard')
    ) return true;

    if (
      (qNorm.includes('فریز') || qNorm.includes('توقف') || qNorm.includes('freeze') || qNorm.includes('frozen')) && 
      computed.statusType === 'personal_frozen'
    ) return true;

    if (
      (qNorm.includes('بدهی') || qNorm.includes('سوخته') || qNorm.includes('شکست') || qNorm.includes('debt') || qNorm.includes('unresolved')) && 
      computed.statusType === 'burned_unresolved'
    ) return true;

    if (
      (qNorm.includes('کالبدشکافی') || qNorm.includes('حل شده') || qNorm.includes('حل‌') || qNorm.includes('تحلیل') || qNorm.includes('resolved') || qNorm.includes('autopsy')) && 
      computed.statusType === 'burned_resolved'
    ) return true;

    // 5. Score matching (e.g. "۱۰", "10", "امتیاز ۱۰", "۱۰ از ۱۰", "10/10")
    const scoreEn = String(computed.score);
    const scoreFa = toPersianDigits(computed.score);
    if (
      qDigitsEn === scoreEn ||
      qNorm === `امتیاز ${scoreEn}` ||
      qNorm === `امتیاز ${scoreFa}` ||
      qNorm === `${scoreEn} از ۱۰` ||
      qNorm === `${scoreFa} از ۱۰` ||
      qNorm === `${scoreEn}/10` ||
      qNorm === `${scoreFa}/10` ||
      (computed.score === 10 && (qNorm.includes('کمال') || qNorm.includes('شاهکار') || qNorm.includes('۱۰ از ۱۰') || qNorm.includes('10/10')))
    ) {
      return true;
    }

    // 6. Foundation habits & special mission keywords
    if (
      (qNorm.includes('سحر') || qNorm.includes('بیدار') || qNorm.includes('صبح') || qNorm.includes('wakeup')) &&
      log.wakeUp
    ) return true;

    if (
      (qNorm.includes('ورزش') || qNorm.includes('تمرین') || qNorm.includes('باشگاه') || qNorm.includes('workout')) &&
      log.workout
    ) return true;

    if (
      (qNorm.includes('مطالعه') || qNorm.includes('کتاب') || qNorm.includes('study') || qNorm.includes('reading')) &&
      log.study
    ) return true;

    if (
      (qNorm.includes('ژورنال') || qNorm.includes('یادداشت') || qNorm.includes('دفتر') || qNorm.includes('journal')) &&
      log.journal
    ) return true;

    if (
      (qNorm.includes('کار سخت') || qNorm.includes('تسک') || qNorm.includes('عمیق') || qNorm.includes('پروژه') || qNorm.includes('hard')) &&
      log.hardTask
    ) return true;

    if (
      (qNorm.includes('ماموریت') || qNorm.includes('ویژه') || qNorm.includes('special') || qNorm.includes('mission')) &&
      log.specialMission
    ) return true;

    // 7. Textual fields (Notes, Failure reasons, Countermeasures, Failure times, Autopsy notes)
    const normReason = normalizeSearchText(log.failureReason);
    const normNotes = normalizeSearchText(log.notes);
    const normCountermeasure = normalizeSearchText(log.countermeasure);
    const normAutopsy = normalizeSearchText(log.autopsyNotes);
    const normTime = normalizeSearchText(log.failureTime);

    if (
      normReason.includes(qNorm) ||
      normNotes.includes(qNorm) ||
      normCountermeasure.includes(qNorm) ||
      normAutopsy.includes(qNorm) ||
      normTime.includes(qNorm)
    ) {
      return true;
    }

    return false;
  };

  const filteredLogs = logs
    .filter(l => l.cycleId === currentCycle.id || (l.date >= currentCycle.startDate && l.date <= currentCycle.endDate))
    .filter(l => {
      const computed = computeDailyProperties(l, logs, logicalToday);
      if (statusFilter !== 'all' && computed.statusType !== statusFilter) return false;
      return matchLogWithQuery(l, computed, search);
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleOpenNewCycleModal = () => {
    setNewTitle(`چرخه ${toPersianDigits(cycles.length + 1)} — ارتقای تمرکز عمیق و کارایی`);
    setNewStartDate(logicalToday);
    setNewTheme('۱۵۰ ساعت کار عمیق و دیسیپلین پایدار');
    setModalOverlapError(null);
    setShowNewCycleModal(true);
  };

  const handleCreateCycleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newStartDate.trim()) return;

    // Proactive Overlap Validation Check
    const proposedStart = newStartDate.trim();
    const proposedEnd = addDaysToDate(proposedStart, 89);

    const overlappingCycle = cycles.find(c => {
      const existingEnd = c.endDate || addDaysToDate(c.startDate, 89);
      return !(proposedEnd < c.startDate || proposedStart > existingEnd);
    });

    if (overlappingCycle) {
      soundFX.playWarning();
      setModalOverlapError(
        `تداخل تقویمی: بازه زمانی این چرخه (${formatPersianDate(proposedStart)} تا ${formatPersianDate(proposedEnd)}) با چرخه «${overlappingCycle.title}» (${formatPersianDate(overlappingCycle.startDate)} تا ${formatPersianDate(overlappingCycle.endDate || addDaysToDate(overlappingCycle.startDate, 89))}) تداخل دارد.`
      );
      return;
    }

    onCreateNewCycle(newTitle.trim(), proposedStart, newTheme.trim());
    setShowNewCycleModal(false);
    setModalOverlapError(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200" dir="rtl">
      
      {/* Top Section: Bushido Court & Verdict Card (Clean unified card without unbalanced halos) */}
      <div className="bg-[#121215]/90 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-xl backdrop-blur-xl relative overflow-hidden">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-md shrink-0">
                <Gavel className="w-6 h-6 text-zinc-200" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black text-zinc-100">
                    دادگاه بوشیدو و کارنامه چرخه
                  </h2>
                  {currentCycle.isArchived ? (
                    <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 select-none pointer-events-none cursor-default">
                      <Lock className="w-3 h-3 text-zinc-400" />
                      بایگانی و قفل‌شده
                    </span>
                  ) : verdict ? (
                    <span className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold select-none pointer-events-none cursor-default">
                      حکم صادر شده
                    </span>
                  ) : (
                    <span className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] px-2.5 py-0.5 rounded-full font-bold select-none pointer-events-none cursor-default">
                      در جریان ارزیابی
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  ارزیابی جامع عملکرد ۹۰ روزه بر مبنای انضباط آهنین و ثبات تعهد
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleGenerateVerdict}
                disabled={isGeneratingVerdict || currentCycle.isArchived}
                className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-black font-black text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-[0.98] shrink-0 whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4 text-black shrink-0" />
                <span>{verdict ? 'ارزیابی مجدد و به‌روزرسانی حکم' : 'صدور حکم دادگاه بوشیدو'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewCycleModal}
                className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 active:bg-zinc-800 text-zinc-100 text-xs font-bold px-4 py-2.5 rounded-xl border border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98] shadow-md shrink-0 whitespace-nowrap"
              >
                <Plus className="w-4 h-4 text-zinc-300 shrink-0" />
                <span>تعریف چرخه جدید</span>
              </button>
            </div>
          </div>

          {/* Unified Cycle Lifecycle & Management Bar */}
          <div className="bg-[#09090b]/80 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-inner">
            <div className="flex items-center gap-2.5 text-zinc-300">
              <PackageCheck className="w-4 h-4 text-zinc-400 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-zinc-200">وضعیت و مدیریت چرخه:</span>
                <p className="text-[11px] text-zinc-400">
                  {currentCycle.isArchived 
                    ? 'این چرخه در بایگانی رسمی قفل شده است.' 
                    : is90DaysFinished 
                      ? 'دوره ۹۰ روزه تکمیل شده و آماده صدور حکم و بایگانی رسمی است.' 
                      : `روز ${toPersianDigits(metrics.elapsedDays)} از ۹۰ روز. بایگانی پس از پایان دوره و تسویه بدهی‌ها امکان‌پذیر است.`}
                </p>
              </div>
            </div>

            {/* Lifecycle Actions (Archive, Unarchive & Delete safely grouped together) */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {!currentCycle.isArchived ? (
                <button
                  onClick={handleOpenArchiveModal}
                  disabled={!canArchive}
                  title={!canArchive ? 'شرایط بایگانی: اتمام ۹۰ روز، تسویه بدهی‌ها و صدور حکم دادگاه' : 'بایگانی و قفل رسمی این چرخه'}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700 disabled:opacity-40 disabled:hover:bg-zinc-800 text-zinc-300 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98] text-xs whitespace-nowrap"
                >
                  <Archive className="w-3.5 h-3.5 text-zinc-400" />
                  <span>بایگانی نهایی چرخه</span>
                </button>
              ) : (
                <button
                  onClick={handleOpenUnarchiveModal}
                  title="خروج از بایگانی و بازگرداندن چرخه به حالت فعال جهت ویرایش"
                  className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700 text-zinc-200 px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98] text-xs whitespace-nowrap shadow-md"
                >
                  <Unlock className="w-3.5 h-3.5 text-zinc-300" />
                  <span>خروج چرخه از بایگانی</span>
                </button>
              )}

              {/* Accessible Delete Cycle Option without 90-day scrolling */}
              {onDeleteCycle && cycles.length > 1 && (
                <button
                  onClick={handleDeleteCurrentCycle}
                  title="حذف کامل این چرخه ۹۰ روزه و تمام داده‌های آن"
                  className="bg-red-950/30 hover:bg-red-900/50 border border-red-500/30 hover:border-red-500/60 text-red-400 hover:text-red-300 px-3 py-2 rounded-xl font-bold flex items-center gap-1.5 transition cursor-pointer active:scale-[0.98] text-xs whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف چرخه</span>
                </button>
              )}
            </div>
          </div>

          {/* Feedback notice if any */}
          {archiveNotice && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl p-3 text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>{archiveNotice}</span>
            </div>
          )}

          {/* Verdict Body */}
          {verdict ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Grade & Stamp Seal (4 Columns) */}
              <div className="lg:col-span-4 bg-[#09090b]/80 border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="w-20 h-20 rounded-full border-4 border-amber-500/60 bg-amber-500/10 flex items-center justify-center shadow-lg shadow-amber-500/20 my-2">
                  <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono tracking-tighter">
                    {verdict.grade}
                  </span>
                </div>
                <h4 className="text-sm font-black text-zinc-100 mt-2">
                  {verdict.verdict}
                </h4>
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-mono mt-2">
                  <FileBadge className="w-3.5 h-3.5 text-amber-400" />
                  <span>مهر رسمی سنسی بوشیدو</span>
                </div>
                {verdict.bushidoSealDate && (
                  <span className="text-[10px] text-zinc-500 font-mono mt-1">
                    {formatPersianDate(verdict.bushidoSealDate.split('T')[0])}
                  </span>
                )}
              </div>

              {/* Strengths, Weaknesses & Tactical Notes (8 Columns) */}
              <div className="lg:col-span-8 space-y-4">
                <div className="bg-[#09090b]/60 border border-zinc-800/80 rounded-2xl p-4">
                  <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-2">
                    <Scroll className="w-3.5 h-3.5" />
                    <span>تحلیل سنسی بوشیدو:</span>
                  </h4>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {verdict.senseiNotes}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Strengths */}
                  <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-3.5">
                    <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-2">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>نقاط قوت و پیروزی‌ها</span>
                    </h5>
                    <ul className="space-y-1.5">
                      {verdict.strengths.map((s, idx) => (
                        <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                          <span className="text-emerald-400 font-bold">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weaknesses */}
                  <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-3.5">
                    <h5 className="text-xs font-bold text-red-400 flex items-center gap-1.5 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>آسیب‌پذیری‌ها و نقاط شکست</span>
                    </h5>
                    <ul className="space-y-1.5">
                      {verdict.weaknesses.map((w, idx) => (
                        <li key={idx} className="text-[11px] text-zinc-300 flex items-start gap-1.5">
                          <span className="text-red-400 font-bold">•</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {verdict.tacticalPlanForNextCycle && (
                  <div className="bg-[#09090b]/60 border border-zinc-800/80 rounded-2xl p-3.5 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block mb-0.5">
                        استراتژی پیشنهادی برای چرخه بعدی:
                      </span>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        {verdict.tacticalPlanForNextCycle}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-[#09090b]/60 border border-dashed border-zinc-800 rounded-2xl p-6 text-center space-y-2">
              <Award className="w-9 h-9 text-zinc-600 mx-auto" />
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-bold text-zinc-200">
                  هنوز حکمی برای این چرخه صادر نشده است
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  با کلیک روی «صدور حکم دادگاه بوشیدو»، کارنامه رسمی به همراه نمره و تحلیل نقاط قوت و ضعف برای چرخه فعلی صادر می‌شود.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Archives Table & Mobile Card View */}
      <div className="space-y-4">
        {/* Controls: Search & Filter Tabs */}
        <div className="bg-[#121215]/90 border border-zinc-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
          {/* Enhanced Search Box with Clear Button */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="جستجو در روز، تاریخ، امتیاز، وضعیت، عادت‌ها، علت شکست..."
              className="w-full bg-[#09090b] border border-zinc-800 rounded-xl pr-9 pl-8 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 transition"
            />
            {search.length > 0 && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute left-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 transition cursor-pointer p-0.5"
                title="پاک کردن جستجو"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Neutral Professional Filter Pills */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'all', label: 'همه رکوردها' },
              { id: 'standard', label: 'تعهد استاندارد' },
              { id: 'personal_frozen', label: 'توقف فریز' },
              { id: 'burned_unresolved', label: 'بدهی باز' },
              { id: 'burned_resolved', label: 'کالبدشکافی‌شده' }
            ].map(f => {
              const isActive = statusFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    soundFX.playCheck();
                    setStatusFilter(f.id);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-xl border whitespace-nowrap transition cursor-pointer active:scale-[0.98] leading-none ${
                    isActive
                      ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold shadow-sm'
                      : 'bg-[#09090b]/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Mobile Card View (Visible on Mobile only: < md) */}
        <div className="block md:hidden space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="bg-[#121215]/90 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-500 text-xs">
              هیچ رکوردی مطابق جستجو و فیلتر جاری یافت نشد.
            </div>
          ) : (
            filteredLogs.map(l => {
              const computed = computeDailyProperties(l, logs, logicalToday);
              const isToday = l.date === logicalToday;

              return (
                <div
                  key={l.id}
                  className={`bg-[#121215]/90 border rounded-2xl p-4 space-y-3.5 shadow-md transition ${
                    isToday 
                      ? 'border-rose-500/40 bg-rose-500/5' 
                      : 'border-zinc-800'
                  }`}
                >
                  {/* Top row: Date & Score & Status without line-breaks */}
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onSelectDate(l.date)}
                      className="flex items-center gap-1.5 font-bold text-xs text-zinc-100 hover:text-amber-400 cursor-pointer text-right transition"
                    >
                      <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span className="whitespace-nowrap">{formatPersianDate(l.date, { withWeekday: true })}</span>
                      {isToday && (
                        <span className="bg-rose-500/20 text-rose-300 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap">
                          امروز
                        </span>
                      )}
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`font-bold text-xs font-mono bg-[#09090b] px-2 py-1 rounded-lg border border-zinc-800 shrink-0 whitespace-nowrap ${
                        computed.score === 10
                          ? 'text-amber-400 font-black'
                          : computed.isStandard
                          ? 'text-emerald-400'
                          : computed.statusType === 'personal_frozen'
                          ? 'text-blue-300'
                          : 'text-zinc-300'
                      }`}>
                        {toPersianDigits(computed.score)} / ۱۰
                      </span>

                      <span className={`h-6 px-2 rounded-lg text-[10px] font-bold border inline-flex items-center gap-1 shadow-sm select-none pointer-events-none cursor-default shrink-0 whitespace-nowrap ${
                        computed.statusType === 'standard'
                          ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                          : computed.statusType === 'personal_frozen'
                          ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                          : computed.statusType === 'burned_resolved'
                          ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                          : 'bg-red-950/80 border-red-500/40 text-red-300 animate-pulse'
                      }`}>
                        {computed.statusType === 'standard' && <CheckCircle2 className="w-3 h-3" />}
                        {computed.statusType === 'personal_frozen' && <Snowflake className="w-3 h-3" />}
                        {computed.statusType === 'burned_resolved' && <FileBadge className="w-3 h-3 text-zinc-400" />}
                        {computed.statusType === 'burned_unresolved' && <AlertTriangle className="w-3 h-3" />}
                        <span>
                          {computed.statusType === 'standard' && 'تعهد کامل'}
                          {computed.statusType === 'personal_frozen' && 'توقف فریز'}
                          {computed.statusType === 'burned_resolved' && 'حل‌شده'}
                          {computed.statusType === 'burned_unresolved' && 'بدهی باز'}
                        </span>
                      </span>
                    </div>
                  </div>

                  {/* Habits & Special Mission Status Row */}
                  <div className="bg-[#09090b]/80 p-2.5 rounded-xl border border-zinc-800/80 flex items-center justify-between flex-wrap gap-2">
                    <span className="text-[11px] text-zinc-400 font-bold">۵ پایه و ماموریت ویژه:</span>
                    <div className="flex items-center gap-1.5">
                      {/* 5 Core Habits */}
                      {[
                        { k: 'wakeUp', title: 'سحرخیزی', done: l.wakeUp },
                        { k: 'workout', title: 'ورزش', done: l.workout },
                        { k: 'study', title: 'مطالعه', done: l.study },
                        { k: 'journal', title: 'ژورنال', done: l.journal },
                        { k: 'hardTask', title: 'کار سخت', done: l.hardTask }
                      ].map(h => (
                        <div
                          key={h.k}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                            h.done
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-zinc-800/80 text-zinc-600 border border-zinc-700'
                          }`}
                          title={`${h.title}: ${h.done ? 'انجام شد' : 'انجام نشد'}`}
                        >
                          {h.done ? '✓' : '×'}
                        </div>
                      ))}

                      {/* Divider */}
                      <span className="w-[1px] h-4 bg-zinc-800 mx-0.5"></span>

                      {/* Special Mission Badge */}
                      <div
                        className={`w-7 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition ${
                          l.specialMission
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'bg-zinc-800/80 text-zinc-600 border border-zinc-700'
                        }`}
                        title={`ماموریت ویژه: ${l.specialMission ? 'انجام شد (+۲ امتیاز)' : 'انجام نشد'}`}
                      >
                        {l.specialMission ? <Check className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" /> : '×'}
                      </div>
                    </div>
                  </div>

                  {/* Failure Info if any */}
                  {(l.failureReason || l.notes || l.countermeasure) && (
                    <div className="bg-[#09090b]/60 p-2.5 rounded-xl border border-zinc-800/80 space-y-1.5 text-[11px]">
                      {l.failureReason && (
                        <div className="text-red-300">
                          <span className="font-bold text-zinc-400">ریشه شکست: </span>
                          <span>{l.failureReason}</span>
                          {l.failureTime && <span className="text-zinc-500 mr-1">({toPersianDigits(l.failureTime)})</span>}
                        </div>
                      )}
                      {l.countermeasure && (
                        <div className="text-zinc-200">
                          <span className="font-bold text-zinc-400">پادزهر و استراتژی: </span>
                          <span>{l.countermeasure}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-start gap-2 pt-1 flex-wrap">
                    <button
                      onClick={() => onSelectDate(l.date)}
                      className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-300 text-xs px-3 py-1.5 rounded-xl border border-zinc-700 flex items-center gap-1 cursor-pointer active:scale-[0.98] whitespace-nowrap transition"
                    >
                      <span>مشاهده در میدان نبرد</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    {(computed.needsAutopsy || l.failureReason) && (
                      <button
                        onClick={() => onOpenAutopsy(l)}
                        className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-200 text-xs font-bold px-3 py-1.5 rounded-xl border border-zinc-700 cursor-pointer active:scale-[0.98] whitespace-nowrap transition"
                      >
                        کالبدشکافی شکست
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 2. Desktop Table View (Aligned Headers & Unified Obsidian Depth) */}
        <div className="hidden md:block bg-[#121215]/90 border border-zinc-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#09090b] border-b border-zinc-800 text-zinc-400 font-semibold select-none">
                <tr>
                  <th className="p-3.5 whitespace-nowrap min-w-[110px] text-right">تاریخ روز</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[130px] text-center">۵ پایه تعهد</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[90px] text-center">ماموریت ویژه</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[80px] text-center">امتیاز</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[130px] text-center">وضعیت روز</th>
                  <th className="p-3.5 min-w-[220px] text-right">علت و زمان شکست</th>
                  <th className="p-3.5 min-w-[220px] text-right">پادزهر و استراتژی فردا</th>
                  <th className="p-3.5 whitespace-nowrap min-w-[90px] text-center">اقدام</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      هیچ رکوردی مطابق جستجو و فیلتر جاری یافت نشد.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(l => {
                    const computed = computeDailyProperties(l, logs, logicalToday);
                    const isToday = l.date === logicalToday;

                    return (
                      <tr key={l.id} className={`hover:bg-zinc-800/40 transition ${isToday ? 'bg-rose-500/5 hover:bg-rose-500/10' : ''}`}>
                        <td className="p-3.5 font-mono whitespace-nowrap align-middle text-right">
                          <button
                            onClick={() => onSelectDate(l.date)}
                            className="hover:text-amber-400 font-bold flex items-center gap-1.5 cursor-pointer text-zinc-100"
                          >
                            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{formatPersianDate(l.date, { short: true })}</span>
                            {isToday && (
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-sans">
                                امروز
                              </span>
                            )}
                          </button>
                        </td>

                        {/* 5 Habits Badges (Centered) */}
                        <td className="p-3.5 whitespace-nowrap align-middle text-center">
                          <div className="flex items-center justify-center gap-1">
                            {[
                              { k: 'wakeUp', title: 'سحرخیزی', done: l.wakeUp },
                              { k: 'workout', title: 'ورزش', done: l.workout },
                              { k: 'study', title: 'مطالعه', done: l.study },
                              { k: 'journal', title: 'ژورنال', done: l.journal },
                              { k: 'hardTask', title: 'کار سخت', done: l.hardTask }
                            ].map(h => (
                              <span
                                key={h.k}
                                title={`${h.title}: ${h.done ? 'انجام شد' : 'انجام نشد'}`}
                                className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                                  h.done 
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' 
                                    : 'bg-zinc-800 text-zinc-600 border border-zinc-700'
                                }`}
                              >
                                {h.done ? '✓' : '×'}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Special Mission (Centered) */}
                        <td className="p-3.5 whitespace-nowrap align-middle text-center">
                          {l.specialMission ? (
                            <span 
                              title="ماموریت ویژه: انجام شد (+۲ امتیاز اضافه)"
                              className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center justify-center font-bold text-[10px] shadow-sm mx-auto"
                            >
                              ✓
                            </span>
                          ) : (
                            <span 
                              title="ماموریت ویژه: انجام نشد"
                              className="w-5 h-5 rounded-md bg-zinc-800/80 text-zinc-600 border border-zinc-700 inline-flex items-center justify-center text-[10px] font-bold mx-auto"
                            >
                              ×
                            </span>
                          )}
                        </td>

                        {/* Score Column (Centered) */}
                        <td className={`p-3.5 whitespace-nowrap font-mono align-middle text-center ${
                          computed.score === 10
                            ? 'text-amber-400 font-black'
                            : computed.isStandard
                            ? 'text-emerald-400 font-bold'
                            : computed.statusType === 'personal_frozen'
                            ? 'text-blue-300 font-medium'
                            : 'text-zinc-300 font-medium'
                        }`}>
                          {toPersianDigits(computed.score)} / ۱۰
                        </td>

                        {/* Status Badge (Centered) */}
                        <td className="p-3.5 whitespace-nowrap align-middle text-center">
                          <div className="flex items-center justify-center">
                            <span className={`w-28 h-7 justify-center px-2 py-0.5 rounded-lg text-[11px] font-bold border inline-flex items-center gap-1.5 shadow-sm text-center select-none pointer-events-none cursor-default ${
                              computed.statusType === 'standard'
                                ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
                                : computed.statusType === 'personal_frozen'
                                ? 'bg-blue-950/80 border-blue-500/40 text-blue-300'
                                : computed.statusType === 'burned_resolved'
                                ? 'bg-zinc-800 border-zinc-700 text-zinc-300'
                                : 'bg-red-950/80 border-red-500/40 text-red-300 animate-pulse'
                            }`}>
                              {computed.statusType === 'standard' && <CheckCircle2 className="w-3.5 h-3.5" />}
                              {computed.statusType === 'personal_frozen' && <Snowflake className="w-3.5 h-3.5" />}
                              {computed.statusType === 'burned_resolved' && <FileBadge className="w-3.5 h-3.5 text-zinc-400" />}
                              {computed.statusType === 'burned_unresolved' && <AlertTriangle className="w-3.5 h-3.5" />}
                              <span>
                                {computed.statusType === 'standard' && 'تعهد کامل'}
                                {computed.statusType === 'personal_frozen' && 'توقف فریز'}
                                {computed.statusType === 'burned_resolved' && 'حل‌شده'}
                                {computed.statusType === 'burned_unresolved' && 'بدهی باز'}
                              </span>
                            </span>
                          </div>
                        </td>

                        {/* Failure Reason and Time (Right aligned) */}
                        <td className="p-3.5 text-xs text-zinc-300 align-middle text-right max-w-[240px]">
                          {l.failureReason ? (
                            <div className="space-y-1 bg-[#09090b]/80 p-2 rounded-xl border border-zinc-800/80">
                              <p className="font-semibold text-zinc-200 leading-snug break-words">
                                {l.failureReason}
                              </p>
                              {l.failureTime && (
                                <div className="inline-flex items-center gap-1 text-[10px] bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-zinc-400 font-mono">
                                  <Clock className="w-3 h-3 text-zinc-500" />
                                  <span>زمان: {toPersianDigits(l.failureTime)}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-600 block text-right">—</span>
                          )}
                        </td>

                        {/* Countermeasure / Strategy (Right aligned) */}
                        <td className="p-3.5 text-xs text-zinc-300 align-middle text-right max-w-[240px]">
                          {l.countermeasure || l.autopsyNotes ? (
                            <p className="leading-snug text-zinc-300 break-words line-clamp-3 hover:line-clamp-none transition-all">
                              {l.countermeasure || l.autopsyNotes}
                            </p>
                          ) : (
                            <span className="text-zinc-600 block text-right">—</span>
                          )}
                        </td>

                        {/* Action Button (Centered) */}
                        <td className="p-3.5 whitespace-nowrap text-center align-middle">
                          <button
                            onClick={() => onOpenAutopsy(l)}
                            className="text-xs bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700 transition cursor-pointer active:scale-[0.98]"
                          >
                            کالبدشکافی
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* New Cycle Creation Modal */}
      {showNewCycleModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <h3 className="font-bold text-lg text-zinc-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-zinc-300" />
              <span>تعریف چرخه ۹۰ روزه جدید</span>
            </h3>

            {modalOverlapError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3 text-xs font-medium flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{modalOverlapError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCycleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">عنوان چرخه:</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">تاریخ شروع (YYYY-MM-DD):</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={e => setNewStartDate(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-zinc-600 transition"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">میثاق و تم اصلی چرخه:</label>
                <textarea
                  value={newTheme}
                  onChange={e => setNewTheme(e.target.value)}
                  rows={3}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-zinc-600 transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewCycleModal(false)}
                  className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700 text-zinc-300 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer active:scale-[0.98]"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-amber-500/20 transition cursor-pointer active:scale-[0.98]"
                >
                  ایجاد و شروع چرخه
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Archive Cycle Confirmation Modal */}
      {showArchiveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 shrink-0">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">
                  تأیید بایگانی نهایی چرخه
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  قفل سوابق تاریخی در بایگانی بوشیدو
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#09090b]/80 border border-zinc-800 rounded-2xl p-4">
              آیا از انتقال چرخه <strong className="text-amber-300">«{currentCycle.title}»</strong> به بایگانی رسمی اطمینان دارید؟ با بایگانی چرخه، سوابق قفل شده و در صورت نیاز می‌توانید مجدداً آن را از بایگانی خارج کنید.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowArchiveConfirmModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-[0.98]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmArchive}
                className="bg-zinc-750 hover:bg-zinc-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg border border-zinc-600 transition cursor-pointer active:scale-[0.98]"
              >
                <Archive className="w-4 h-4" />
                <span>تأیید و انتقال به بایگانی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unarchive Cycle Confirmation Modal */}
      {showUnarchiveConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-200 shrink-0">
                <Unlock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">
                  خروج چرخه از بایگانی
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  بازگرداندن به حالت فعال و ویرایش‌پذیر
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#09090b]/80 border border-zinc-800 rounded-2xl p-4">
              آیا مایلید چرخه <strong className="text-amber-300">«{currentCycle.title}»</strong> را از حالت بایگانی خارج کنید تا بتوانید مجدداً روزها و لاگ‌های آن را در میدان نبرد ثبت یا ویرایش نمایید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowUnarchiveConfirmModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-[0.98]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmUnarchive}
                className="bg-zinc-750 hover:bg-zinc-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg border border-zinc-600 transition cursor-pointer active:scale-[0.98]"
              >
                <Unlock className="w-4 h-4" />
                <span>تأیید و خروج از بایگانی</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Cycle Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-red-500/40 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-100">
                  تأیید حذف دائمی چرخه
                </h3>
                <p className="text-xs text-red-400 mt-0.5">
                  عملیات غیرقابل بازگشت
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#09090b]/80 border border-zinc-800 rounded-2xl p-4">
              آیا از حذف کامل <strong className="text-amber-300">«{currentCycle.title}»</strong> و تمام لاگ‌ها، کارنامه‌ها و گزارش‌های مرتبط با این چرخه ۹۰ روزه اطمینان قطعی دارید؟
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="bg-zinc-800 hover:bg-zinc-700 hover:border-zinc-600 border border-zinc-700 text-zinc-300 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer active:scale-[0.98]"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="bg-red-600 hover:bg-red-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-red-600/30 transition cursor-pointer active:scale-[0.98]"
              >
                <Trash2 className="w-4 h-4" />
                <span>بله، حذف قطعی چرخه</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
