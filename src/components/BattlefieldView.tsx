import React, { useState, useEffect, useRef } from 'react';
import { DailyLog, Cycle, CycleMetrics, HabitKey } from '../types';
import { FOUNDATION_HABITS, computeDailyProperties } from '../engine/bushidoCalculations';
import { formatPersianDate, getLogicalTodayDate, addDaysToDate, getRelativeDateLabel, daysBetween } from '../utils/dateUtils';
import { toPersianDigits } from '../utils/numberUtils';
import { soundFX } from '../utils/audioEffects';
import confetti from 'canvas-confetti';
import { 
  Sun, 
  Dumbbell, 
  BookOpen, 
  PenTool, 
  Briefcase, 
  Target, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Flame, 
  Snowflake, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  ShieldAlert, 
  Zap, 
  FileText, 
  Clock,
  Swords,
  ShieldCheck,
  X,
  Compass,
  Rocket,
  Check
} from 'lucide-react';

interface BattlefieldViewProps {
  currentCycle: Cycle | null;
  metrics: CycleMetrics;
  logs: DailyLog[];
  selectedDate: string;
  nightOwlCutoffHour?: number;
  onSelectDate: (date: string) => void;
  onUpdateLog: (log: DailyLog) => void;
  onOpenAutopsy: (log: DailyLog) => void;
  onNavigateToArchives?: () => void;
}

const HABIT_ICONS: Record<HabitKey, React.ReactNode> = {
  wakeUp: <Sun className="w-5 h-5" />,
  workout: <Dumbbell className="w-5 h-5" />,
  study: <BookOpen className="w-5 h-5" />,
  journal: <PenTool className="w-5 h-5" />,
  hardTask: <Briefcase className="w-5 h-5" />
};

export const BattlefieldView: React.FC<BattlefieldViewProps> = ({
  currentCycle,
  metrics,
  logs,
  selectedDate,
  nightOwlCutoffHour = 4,
  onSelectDate,
  onUpdateLog,
  onOpenAutopsy,
  onNavigateToArchives
}) => {
  const logicalToday = getLogicalTodayDate();
  const isToday = selectedDate === logicalToday;

  // 1. Guard against No Active Cycle / Empty State
  if (!currentCycle) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-6" dir="rtl">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto shadow-xl">
          <Target className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
            هیچ چرخه فعالی در سیستم تعریف نشده است
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
            میدان نبرد بوشیدو بر اساس دوره‌های متمرکز ۹۰ روزه عمل می‌کند. برای شروع ثبت عادات روزانه و پیگیری دیسیپلین، ابتدا یک چرخه جدید تعریف کنید.
          </p>
        </div>
        {onNavigateToArchives && (
          <button
            onClick={onNavigateToArchives}
            className="bg-amber-500 hover:bg-amber-400 text-black font-black text-xs px-6 py-3 rounded-2xl inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>تعریف چرخه جدید در بایگانی و فرماندهی</span>
          </button>
        )}
      </div>
    );
  }

  const isCycleArchived = !!currentCycle.isArchived;
  const isFuture = selectedDate > logicalToday;

  // Martial Honor Banner State (Standard Day or 10/10 Mastery Day)
  const [martialHonorToast, setMartialHonorToast] = useState<{
    type: 'standard' | 'mastery';
    title: string;
    subtitle: string;
    score: number;
  } | null>(null);

  // Find or construct the log for selected date
  let activeLog = logs.find(l => l.date === selectedDate);
  if (!activeLog) {
    activeLog = {
      id: `log-${selectedDate}`,
      cycleId: currentCycle.id,
      date: selectedDate,
      createdAt: new Date().toISOString(),
      wakeUp: false,
      workout: false,
      study: false,
      journal: false,
      hardTask: false,
      specialMission: false
    };
  }

  const computed = computeDailyProperties(activeLog, logs, logicalToday);

  // Find all unresolved past days that cause system lock (strictly before today)
  const unresolvedPastLogs = logs.filter(l => {
    if (l.date >= logicalToday) return false;
    const c = computeDailyProperties(l, logs, logicalToday);
    return c.statusType === 'burned_unresolved';
  });

  const isLocked = (unresolvedPastLogs.length > 0 && isToday) || isCycleArchived || isFuture;

  const toggleHabit = (key: HabitKey) => {
    if (isCycleArchived) {
      soundFX.playWarning();
      return;
    }

    if (isFuture) {
      soundFX.playWarning();
      return;
    }

    if (isLocked) {
      soundFX.playWarning();
      return;
    }

    const nextVal = !activeLog![key];
    const updated: DailyLog = {
      ...activeLog!,
      [key]: nextVal
    };

    const habitKeys: HabitKey[] = ['wakeUp', 'workout', 'study', 'journal', 'hardTask'];
    const wasStandard = habitKeys.every(k => activeLog![k]);
    const willBeStandard = habitKeys.every(k => (k === key ? nextVal : updated[k]));

    if (!wasStandard && willBeStandard) {
      if (updated.specialMission) {
        // 10/10 Mastery - Golden Samurai Sparks
        soundFX.playMastery();
        confetti({
          particleCount: 38,
          spread: 55,
          origin: { y: 0.65 },
          colors: ['#f59e0b', '#fbbf24', '#d97706', '#fef3c7'],
          shapes: ['square'],
          scalar: 0.9,
          ticks: 150
        });
        setMartialHonorToast({
          type: 'mastery',
          title: 'کمال تعهد روز محقق شد (۱۰ از ۱۰)',
          subtitle: '۵ رکن تعهد فونداسیون + ماموریت ویژه با پیروزی کامل ثبت گردید.',
          score: 10
        });
      } else {
        // 8/10 Standard Day - Emerald Vitality Sparks
        soundFX.playStandardDay();
        confetti({
          particleCount: 26,
          spread: 45,
          origin: { y: 0.65 },
          colors: ['#10b981', '#34d399', '#059669', '#6ee7b7'],
          shapes: ['square'],
          scalar: 0.85,
          ticks: 130
        });
        setMartialHonorToast({
          type: 'standard',
          title: 'روز استاندارد محقق شد',
          subtitle: '۵ رکن فونداسیون بوشیدو با موفقیت تکمیل شد و ارزش روز تثبیت گردید.',
          score: 8
        });
      }

      // Auto dismiss martial banner after 5 seconds
      setTimeout(() => {
        setMartialHonorToast(null);
      }, 5000);
    } else {
      soundFX.playCheck();
    }

    onUpdateLog(updated);
  };

  const toggleSpecialMission = () => {
    if (isCycleArchived || isLocked || isFuture) return;
    const nextVal = !activeLog!.specialMission;
    const updated: DailyLog = {
      ...activeLog!,
      specialMission: nextVal
    };

    const habitKeys: HabitKey[] = ['wakeUp', 'workout', 'study', 'journal', 'hardTask'];
    const isStandard = habitKeys.every(k => updated[k]);

    if (nextVal && isStandard) {
      // Reached 10/10 Mastery - Golden Samurai Sparks
      soundFX.playMastery();
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#f59e0b', '#fbbf24', '#d97706', '#fef3c7'],
        shapes: ['square'],
        scalar: 0.95,
        ticks: 160
      });
      setMartialHonorToast({
        type: 'mastery',
        title: 'کمال تعهد روز محقق شد (۱۰ از ۱۰)',
        subtitle: '۵ رکن فونداسیون + ماموریت ویژه با موفقیت کامل در پرونده ثبت شد.',
        score: 10
      });

      setTimeout(() => {
        setMartialHonorToast(null);
      }, 5000);
    } else {
      soundFX.playCheck();
    }

    onUpdateLog(updated);
  };

  // Local state for smooth, real-time typing in notes without UI stutter
  const [notesValue, setNotesValue] = useState(activeLog?.notes || '');
  const [isSaved, setIsSaved] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with selected date changes
  useEffect(() => {
    setNotesValue(activeLog?.notes || '');
    setIsSaved(true);
  }, [selectedDate, activeLog?.notes]);

  // Auto-resize textarea height to fit content naturally without awkward drag scroll
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(90, textareaRef.current.scrollHeight)}px`;
    }
  }, [notesValue]);

  // Debounced auto-save to global store
  useEffect(() => {
    if (isCycleArchived || isFuture) return;
    if (notesValue === (activeLog?.notes || '')) return;

    setIsSaved(false);
    const timer = setTimeout(() => {
      const updated: DailyLog = {
        ...activeLog!,
        notes: notesValue
      };
      onUpdateLog(updated);
      setIsSaved(true);
    }, 500);

    return () => clearTimeout(timer);
  }, [notesValue, isCycleArchived, isFuture, activeLog, onUpdateLog]);

  const handleNotesChange = (val: string) => {
    if (isCycleArchived || isFuture) return;
    setNotesValue(val);
  };

  const handleNotesBlur = () => {
    if (isCycleArchived || isFuture) return;
    if (notesValue !== (activeLog?.notes || '')) {
      const updated: DailyLog = {
        ...activeLog!,
        notes: notesValue
      };
      onUpdateLog(updated);
      setIsSaved(true);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* 1. Date Navigator Bar */}
      <div className="bg-[#121215]/90 border border-zinc-800 rounded-2xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            type="button"
            onClick={() => onSelectDate(addDaysToDate(selectedDate, -1))}
            className="h-10 px-3.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-zinc-200 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 border border-zinc-700 shadow-sm"
            title="رفتن به روز قبل"
          >
            <ChevronRight className="w-4 h-4 shrink-0 text-zinc-300" />
            <span className="whitespace-nowrap leading-none">روز قبل</span>
          </button>

          <div className="text-center px-1 sm:px-2 flex-1 sm:flex-initial min-w-0 flex flex-col items-center justify-center">
            <div className="text-[11px] sm:text-xs text-zinc-400 font-semibold inline-flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="whitespace-nowrap">{getRelativeDateLabel(selectedDate, logicalToday)}</span>
            </div>
            <h2 className="text-xs sm:text-sm md:text-base font-bold text-zinc-100 mt-0.5 whitespace-nowrap">
              {formatPersianDate(selectedDate, { withWeekday: true })}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => onSelectDate(addDaysToDate(selectedDate, 1))}
            className="h-10 px-3.5 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-750 text-zinc-200 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 border border-zinc-700 shadow-sm"
            title="رفتن به روز بعد"
          >
            <span className="whitespace-nowrap leading-none">روز بعد</span>
            <ChevronLeft className="w-4 h-4 shrink-0 text-zinc-300" />
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
          {!isToday && (
            <button
              type="button"
              onClick={() => onSelectDate(logicalToday)}
              className="h-10 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs px-3.5 rounded-xl transition cursor-pointer inline-flex items-center justify-center gap-1.5 font-bold whitespace-nowrap shrink-0 shadow-sm active:scale-[0.98]"
              title="پرش به روز جاری نبرد"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="leading-none">پرش به امروز</span>
            </button>
          )}

          <div className="h-10 bg-[#09090b] px-3.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0">
            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="leading-none">کات‌آف شبانه: {toPersianDigits(nightOwlCutoffHour)}:۰۰ بامداد</span>
          </div>
        </div>
      </div>

      {/* 1.5. Martial Honor Achievement Banner (Crossed Swords ⚔️ & Samurai Seal) */}
      {martialHonorToast && (
        <div 
          className={`rounded-2xl p-4 sm:p-5 border-2 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 backdrop-blur-xl flex items-start sm:items-center justify-between gap-4 ${
            martialHonorToast.type === 'mastery'
              ? 'bg-gradient-to-r from-amber-950/90 via-[#121215] to-amber-950/90 border-amber-500 shadow-amber-950/50'
              : 'bg-gradient-to-r from-emerald-950/90 via-[#121215] to-emerald-950/90 border-emerald-500 shadow-emerald-950/50'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              martialHonorToast.type === 'mastery'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-inner'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-inner'
            }`}>
              <Swords className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`text-base font-black flex items-center gap-1.5 ${
                  martialHonorToast.type === 'mastery' ? 'text-amber-300' : 'text-emerald-300'
                }`}>
                  <Swords className="w-4 h-4" />
                  <span>{martialHonorToast.title}</span>
                </h4>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold font-mono border ${
                  martialHonorToast.type === 'mastery'
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                    : 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
                }`}>
                  {toPersianDigits(martialHonorToast.score)} از ۱۰ امتیاز
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1">
                {martialHonorToast.subtitle}
              </p>
            </div>
          </div>

          <button
            onClick={() => setMartialHonorToast(null)}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800/80 transition cursor-pointer shrink-0"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Lock & Information Banners (Future / Archived / Past Debt Lock) */}
      {isFuture ? (
        <div className="bg-[#121215]/80 border border-zinc-800 rounded-2xl p-4 sm:p-5 text-zinc-100 shadow-xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center shrink-0 shadow-inner">
                <Compass className="w-5 h-5 text-zinc-300" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                    {getRelativeDateLabel(selectedDate, logicalToday)}
                  </h3>
                  <span className="text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-2.5 py-0.5 rounded-lg font-mono font-medium">
                    {formatPersianDate(selectedDate, { short: true })}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed max-w-2xl">
                  ثبت عملکردها و پایه‌های تعهد صرفاً در روز موعود فعال خواهد شد. تمرکز دیسیپلین بر فتح روز جاری است.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSelectDate(logicalToday)}
              className="w-full sm:w-auto h-10 bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold text-xs px-4 rounded-xl inline-flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="leading-none">بازگشت به روز جاری نبرد</span>
            </button>
          </div>
        </div>
      ) : isCycleArchived ? (
        <div className="bg-purple-950/60 border-2 border-purple-500/60 rounded-2xl p-5 text-zinc-100 shadow-xl shadow-purple-950/40">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-bold text-purple-200 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-purple-400" />
                  این چرخه بایگانی شده است (وضعیت فقط‌خواندنی)
                </h3>
                <span className="text-xs bg-purple-900/60 border border-purple-700 text-purple-200 px-2.5 py-1 rounded-md font-bold">
                  سوابق تاریخی مهر و موم شده
                </span>
              </div>
              <p className="text-xs sm:text-sm text-purple-200/90 mt-1 leading-relaxed">
                تمام ۹۰ روز این چرخه در دادگاه بوشیدو ارزیابی و بایگانی شده است. برای ثبت عملکردهای جدید روزانه، لطفاً یک چرخه فعال دیگر انتخاب کنید یا چرخه جدیدی بسازید.
              </p>
            </div>
          </div>
        </div>
      ) : (unresolvedPastLogs.length > 0 && isToday) ? (
        <div className="bg-red-950/60 border-2 border-red-500/60 rounded-2xl p-5 text-zinc-100 shadow-xl shadow-red-950/40 animate-pulse">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-base font-bold text-red-300 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  قفل اجرا فعال است (Behavior Lock)
                </h3>
                <span className="text-xs bg-red-900/60 border border-red-700 text-red-200 px-2.5 py-1 rounded-md font-bold">
                  {toPersianDigits(unresolvedPastLogs.length)} روز بدهی کالبدشکافی نشده
                </span>
              </div>
              <p className="text-xs sm:text-sm text-red-200/90 mt-1 leading-relaxed">
                طبق اصل دیسیپلین بوشیدو، پیش از ثبت روز جاری، باید روزهای سوخته گذشته کالبدشکافی شده و علت شکست ثبت گردد تا سیستم از انباشت خطاهای ناخودآگاه پاک شود.
              </p>
              
              <div className="mt-3.5 flex flex-wrap gap-2">
                {unresolvedPastLogs.map(ul => (
                  <button
                    key={ul.id}
                    onClick={() => onOpenAutopsy(ul)}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    کالبدشکافی {formatPersianDate(ul.date, { short: true })}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 3. Daily Status & Score Header Card */}
      <div className="bg-[#121215]/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-3 py-1 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 shrink-0 ${
                computed.statusType === 'standard'
                  ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                  : computed.statusType === 'personal_frozen'
                  ? 'bg-blue-950/70 border-blue-500/40 text-blue-300'
                  : computed.statusType === 'burned_resolved'
                  ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300'
                  : (isToday 
                      ? 'bg-zinc-800/80 border-zinc-700 text-zinc-300' 
                      : 'bg-red-950/70 border-red-500/50 text-red-300')
              }`}>
                {computed.statusType === 'standard' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {computed.statusType === 'personal_frozen' && <Snowflake className="w-3.5 h-3.5" />}
                {computed.statusType === 'burned_resolved' && <FileText className="w-3.5 h-3.5" />}
                {computed.statusType === 'burned_unresolved' && (
                  isToday ? <Clock className="w-3.5 h-3.5 text-zinc-400" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span>
                  {computed.statusType === 'standard' && 'تعهد کامل (Standard)'}
                  {computed.statusType === 'personal_frozen' && 'توقف اضطراری (فریز)'}
                  {computed.statusType === 'burned_resolved' && 'پرونده شکست بسته شد'}
                  {computed.statusType === 'burned_unresolved' && (isToday ? 'در جریان اجرای روز' : 'نیازمند کالبدشکافی')}
                </span>
              </span>

              <span className="text-xs text-zinc-300 bg-[#09090b]/60 px-2.5 py-1 rounded-xl border border-zinc-800 font-medium shrink-0">
                {toPersianDigits(computed.habitsCount)} از {toPersianDigits(5)} پایه فونداسیون
              </span>

              {/* Dynamic Live Streak Impact Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-xl border inline-flex items-center gap-1.5 font-medium shrink-0 ${
                computed.isStandard
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-300'
                  : computed.statusType === 'personal_frozen'
                  ? 'bg-blue-500/10 border-blue-500/25 text-blue-300'
                  : isToday
                  ? 'bg-[#09090b]/60 border-zinc-800 text-zinc-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <Flame className={`w-3.5 h-3.5 ${
                  computed.isStandard ? 'text-rose-400 fill-current' : 'text-zinc-500'
                }`} />
                <span>
                  {computed.isStandard
                    ? 'زنجیره متوالی حفظ شد'
                    : computed.statusType === 'personal_frozen'
                    ? 'زنجیره در امان (فریز)'
                    : isToday
                    ? 'حفظ زنجیره با تکمیل ۵ پایه'
                    : 'شکست زنجیره'}
                </span>
              </span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 font-medium leading-relaxed pt-0.5">
              {computed.coachStatusLabel}
            </p>
          </div>

          {/* Score & Visual Blocks - Strict Fixed Symmetry */}
          <div className={`border rounded-2xl p-4 text-center w-full md:w-[240px] shrink-0 transition-all flex flex-col justify-between ${
            computed.score === 10
              ? 'bg-amber-950/30 border-amber-500/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-500/40'
              : computed.isStandard
              ? 'bg-emerald-950/30 border-emerald-500/60 shadow-lg shadow-emerald-950/40 ring-1 ring-emerald-500/40'
              : 'bg-[#09090b]/70 border-zinc-800'
          }`}>
            <div>
              <div className="text-xs text-zinc-400 mb-1 font-medium flex items-center justify-center gap-1">
                <span>امتیاز ارزش روز</span>
                {computed.score === 10 && <Swords className="w-3.5 h-3.5 text-amber-400" />}
                {computed.isStandard && computed.score < 10 && <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              
              <div className={`text-3xl font-black flex items-center justify-center gap-1.5 ${
                computed.score === 10 
                  ? 'text-amber-300' 
                  : computed.isStandard 
                  ? 'text-emerald-400' 
                  : 'text-zinc-200'
              }`}>
                <span>{toPersianDigits(computed.score)}</span>
                <span className="text-sm font-normal text-zinc-400">از {toPersianDigits(10)}</span>
              </div>

              {/* Status Ribbon with Consistent Slot Height */}
              <div className="min-h-[26px] flex items-center justify-center mt-1">
                {computed.score === 10 ? (
                  <div className="flex items-center justify-center gap-1 text-[11px] font-black text-amber-300 bg-amber-500/20 py-0.5 px-2.5 rounded-lg border border-amber-500/40">
                    <Swords className="w-3 h-3" />
                    <span>کمال تعهد روز (۱۰ از ۱۰)</span>
                  </div>
                ) : computed.isStandard ? (
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 py-0.5 px-2.5 rounded-lg border border-emerald-500/40">
                    <ShieldCheck className="w-3 h-3" />
                    <span>روز استاندارد محقق شد (۸ از ۱۰)</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-zinc-500 font-medium">
                    در انتظار تکمیل پایه‌ها
                  </div>
                )}
              </div>
            </div>

            {/* Precision 10-Segment Discipline Gauge */}
            <div className="mt-3 pt-2 border-t border-zinc-800/80">
              <div className="flex items-center gap-1 w-full justify-center">
                {Array.from({ length: 10 }).map((_, idx) => {
                  const segmentIndex = idx + 1;
                  const isFilled = computed.score >= segmentIndex;
                  return (
                    <div
                      key={idx}
                      className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                        isFilled
                          ? computed.score === 10
                            ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]'
                            : computed.isStandard
                            ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]'
                            : computed.statusType === 'personal_frozen'
                            ? 'bg-blue-400'
                            : 'bg-zinc-300'
                          : 'bg-zinc-800/90'
                      }`}
                      title={`قطعه ${toPersianDigits(segmentIndex)} از ۱۰`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Section A: The 5 Foundation Habits */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
            <Swords className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>۵ رکن تعهد فونداسیون</span>
          </h3>
          <span className="text-xs text-zinc-400 font-mono whitespace-nowrap bg-[#121215]/60 px-2 py-0.5 rounded-lg border border-zinc-800">
            شرط روز استاندارد (۸ از ۱۰)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {FOUNDATION_HABITS.map(h => {
            const isChecked = Boolean(activeLog![h.key]);
            return (
              <button
                type="button"
                key={h.key}
                disabled={isLocked}
                onClick={() => toggleHabit(h.key)}
                className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 group cursor-pointer ${
                  isChecked
                    ? 'bg-[#121215] border-emerald-500/50 text-zinc-100 shadow-md shadow-emerald-950/20'
                    : 'bg-[#121215]/50 border-zinc-800 text-zinc-300 hover:bg-[#121215] hover:border-zinc-700'
                } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                    isChecked
                      ? 'bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
                  }`}>
                    {HABIT_ICONS[h.key]}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-1.5 leading-snug">
                      <span className="truncate">{h.titleFa}</span>
                      <span className="text-[11px] font-normal text-zinc-400 font-en shrink-0">
                        ({h.title})
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed text-right">
                      {h.subtitleFa}
                    </p>
                  </div>
                </div>

                <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
                  isChecked
                    ? 'bg-emerald-500 border-emerald-400 text-black shadow-md shadow-emerald-500/30 scale-105'
                    : 'border-zinc-700 bg-[#09090b]/60 text-transparent group-hover:border-zinc-600'
                }`}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Section B: Special Mission Accelerator (Distinct Dedicated Card) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-bold text-sm text-zinc-200 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-amber-400 shrink-0" />
            <span>ماموریت شتاب‌دهنده روز</span>
          </h4>
          <span className="text-xs text-amber-400/90 font-mono whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            رسیدن به کمال (۱۰ از ۱۰)
          </span>
        </div>

        <button
          type="button"
          disabled={isLocked}
          onClick={toggleSpecialMission}
          className={`w-full p-3.5 sm:p-4 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 group cursor-pointer ${
            activeLog?.specialMission
              ? 'bg-gradient-to-r from-amber-950/40 via-[#121215] to-[#121215] border-amber-500/50 shadow-md shadow-amber-950/20'
              : 'bg-[#121215]/40 border-zinc-800/80 text-zinc-300 hover:bg-[#121215] hover:border-zinc-700'
          } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
              activeLog?.specialMission
                ? 'bg-amber-500/20 text-amber-400 ring-2 ring-amber-500/30'
                : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
            }`}>
              <Target className={`w-5 h-5 ${activeLog?.specialMission ? 'text-amber-400' : 'text-zinc-400 group-hover:text-zinc-200'}`} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="font-bold text-sm sm:text-base text-zinc-100 flex items-center gap-2 leading-snug">
                <span className="truncate">ماموریت ویژه روز</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono border shrink-0 ${
                  activeLog?.specialMission
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}>
                  +{toPersianDigits(2)} امتیاز
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed text-right">
                تکمیل این ماموریت در کنار ۵ رکن فونداسیون، امتیاز روز را به ۱۰ از ۱۰ (کمال تعهد) می‌رساند.
              </p>
            </div>
          </div>

          <div className={`w-7 h-7 rounded-xl border flex items-center justify-center transition-all shrink-0 ${
            activeLog?.specialMission
              ? 'bg-amber-500 border-amber-400 text-black shadow-md shadow-amber-500/30 scale-105'
              : 'border-zinc-700 bg-[#09090b]/60 text-transparent group-hover:border-zinc-600'
          }`}>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* 5. Failure & Autopsy Action Section (If Not Standard) */}
      {!computed.isStandard && !isFuture && (
        <div className={`border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
          activeLog.failureReason === 'دلایل شخصی'
            ? 'bg-blue-950/30 border-blue-500/30'
            : activeLog.failureReason
            ? 'bg-[#121215]/80 border-zinc-800'
            : (isToday ? 'bg-[#121215]/80 border-zinc-800' : 'bg-red-950/30 border-red-500/40')
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeLog.failureReason === 'دلایل شخصی' 
                ? 'bg-blue-500/20 text-blue-400' 
                : activeLog.failureReason 
                ? 'bg-zinc-800 text-zinc-300' 
                : (isToday ? 'bg-zinc-800 text-zinc-300' : 'bg-red-500/20 text-red-400')
            }`}>
              {activeLog.failureReason === 'دلایل شخصی' ? (
                <Snowflake className="w-5 h-5" />
              ) : activeLog.failureReason ? (
                <FileText className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="font-bold text-sm text-zinc-200">
                {activeLog.failureReason 
                  ? `علت ثبت شده: ${activeLog.failureReason}` 
                  : (isToday ? 'ثبت کالبدشکافی یا توقف شخصی (اختیاری)' : 'کالبدشکافی و تسویه بدهی رفتاری')}
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                {activeLog.failureReason
                  ? (activeLog.countermeasure ? `پادزهر: ${activeLog.countermeasure}` : 'پرونده این روز تحلیل و ثبت شده است.')
                  : (isToday 
                      ? 'در صورت مواجهه با مانع غیرمنتظره یا نیاز به فریز، می‌توانید کالبدشکافی را ثبت کنید.' 
                      : 'برای ثبت علت افت و رفع قفل دیسیپلین، کالبدشکافی این روز الزامی است.')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenAutopsy(activeLog!)}
            className={`w-full sm:w-auto font-bold text-xs px-4 py-2.5 rounded-xl inline-flex items-center justify-center gap-2 transition cursor-pointer border shrink-0 whitespace-nowrap ${
              activeLog.failureReason
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700'
                : (isToday 
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700' 
                    : 'bg-red-950/60 hover:bg-red-900/80 text-red-200 border-red-500/50 shadow-md shadow-red-950/40')
            }`}
          >
            <Sparkles className="w-4 h-4 text-zinc-300" />
            <span>{activeLog.failureReason ? 'ویرایش کالبدشکافی' : (isToday ? 'ثبت کالبدشکافی امروز' : 'کالبدشکافی این روز')}</span>
          </button>
        </div>
      )}

      {/* 6. Daily Reflection & Strategy Notes (Untitled UI Auto-Saving Dynamic Form Block) */}
      <div className="bg-[#121215]/70 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="text-xs font-bold text-zinc-200 inline-flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-400" />
            <span>یادداشت و مشاهدات میدان نبرد</span>
          </label>
          <div className="flex items-center gap-2 text-[11px]">
            {isFuture ? (
              <span className="text-zinc-500 bg-[#09090b] px-2 py-0.5 rounded-md border border-zinc-800">
                در روز موعود فعال می‌شود
              </span>
            ) : isCycleArchived ? (
              <span className="text-purple-400 bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-800/50">
                بایگانی (فقط‌خواندنی)
              </span>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 font-medium transition-colors ${
                  isSaved ? 'text-emerald-400/80' : 'text-amber-400/80'
                }`}>
                  {isSaved ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>ذخیره شد</span>
                    </>
                  ) : (
                    <span>در حال ذخیره...</span>
                  )}
                </span>
                <span className="text-zinc-600">|</span>
                <span className="text-zinc-500 font-mono">
                  {notesValue ? `${toPersianDigits(notesValue.length)} کاراکتر` : 'اختیاری'}
                </span>
              </>
            )}
          </div>
        </div>
        
        <textarea
          ref={textareaRef}
          value={notesValue}
          onChange={e => handleNotesChange(e.target.value)}
          onBlur={handleNotesBlur}
          disabled={isFuture || isCycleArchived}
          placeholder={
            isFuture
              ? "ثبت یادداشت‌ها و مشاهدات در روز مقرر فعال خواهد شد..."
              : isCycleArchived
              ? "این چرخه بایگانی شده است و یادداشت‌ها فقط‌خواندنی هستند."
              : "ثبت دستاوردها، درس‌آموخته‌ها، چالش‌ها و بینش‌های استراتژیک امروز..."
          }
          rows={3}
          className={`w-full rounded-xl p-3.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none transition-all leading-relaxed font-sans resize-none overflow-hidden ${
            isFuture || isCycleArchived
              ? 'bg-[#09090b]/40 border border-zinc-800 opacity-60 cursor-not-allowed'
              : 'bg-[#09090b]/90 border border-zinc-800 hover:border-zinc-700 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30'
          }`}
        />
      </div>
    </div>
  );
};
