import React, { useState, useRef } from 'react';
import { UserProfile, SystemSettings } from '../types';
import { toPersianDigits } from '../utils/numberUtils';
import { formatPersianDate, daysBetween } from '../utils/dateUtils';
import { BUSHIDO_CRIMSON_THEME } from '../utils/themeUtils';
import { soundFX } from '../utils/audioEffects';
import { 
  User, 
  Crown, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  LogIn, 
  LogOut, 
  ChevronLeft,
  Moon,
  Database,
  AlertTriangle,
  CheckCircle2,
  Settings
} from 'lucide-react';

interface ProfileSettingsViewProps {
  userProfile: UserProfile;
  settings: SystemSettings;
  onUpdateUserProfile: (updated: UserProfile) => void;
  onUpdateSettings: (updated: SystemSettings) => void;
  onOpenPaymentModal: () => void;
  onOpenAuthModal: () => void;
  onLogout: () => void;
  onResetData: () => void;
  onImportData: (jsonStr: string) => void;
  onExportData: () => void;
  onNavigateToAdmin: () => void;
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  userProfile,
  settings,
  onUpdateUserProfile,
  onUpdateSettings,
  onOpenPaymentModal,
  onOpenAuthModal,
  onLogout,
  onResetData,
  onImportData,
  onExportData,
  onNavigateToAdmin
}) => {
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const themeConfig = BUSHIDO_CRIMSON_THEME;
  const currentCutoff = userProfile.nightOwlCutoffHour ?? settings.nightOwlCutoffHour ?? 4;

  const handleSelectCutoffHour = (hour: number) => {
    soundFX.playCheck();
    const updatedProfile = { ...userProfile, nightOwlCutoffHour: hour };
    const updatedSettings = { ...settings, nightOwlCutoffHour: hour };
    onUpdateUserProfile(updatedProfile);
    onUpdateSettings(updatedSettings);
    showNotice(`مهلت پایانی شبانه روی ساعت ${toPersianDigits(hour)}:۰۰ بامداد تنظیم شد.`);
  };

  const showNotice = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => {
      setSaveSuccessMsg(null);
    }, 4000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const content = event.target?.result as string;
      if (content) {
        onImportData(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Calculate remaining VIP days
  let vipDaysRemaining = 0;
  if (userProfile.isVip && userProfile.vipExpiresAt) {
    const todayStr = new Date().toISOString().split('T')[0];
    const expiryStr = userProfile.vipExpiresAt.split('T')[0];
    vipDaysRemaining = Math.max(0, daysBetween(todayStr, expiryStr));
  }

  const cutoffHoursList = [
    { hour: 2, label: 'تا ۲:۰۰ بامداد' },
    { hour: 3, label: 'تا ۳:۰۰ بامداد' },
    { hour: 4, label: 'تا ۴:۰۰ بامداد (پیش‌فرض بوشیدو)' },
    { hour: 5, label: 'تا ۵:۰۰ بامداد' },
    { hour: 6, label: 'تا ۶:۰۰ صبح' }
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200" dir="rtl">
      {/* Toast Notice */}
      {saveSuccessMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 border border-emerald-500/50 text-emerald-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Level 1 Hero Section Header */}
      <div className="bg-[#121215]/80 border border-zinc-800 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shadow-md shrink-0">
            <Settings className="w-6 h-6 text-zinc-200" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black text-zinc-100">
              حساب کاربری و تنظیمات سامانه
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 leading-relaxed">
              مدیریت اشتراک جنگجو، تنظیم مهلت‌های زمانی، پالت تم و پایگاه داده بوشیدو
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Account Card & Logic Customization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Warrior Account Card (5 Columns on Desktop) */}
        <div className="lg:col-span-5 bg-[#121215]/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
          {/* Subtle Background Glow */}
          <div 
            className="absolute -top-12 -left-12 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
            style={{ backgroundColor: themeConfig.colorHex }}
          />

          <div className="space-y-5 relative z-10">
            {/* User Identity Row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center text-zinc-200 text-lg font-black shadow-inner shrink-0">
                  {userProfile.name ? userProfile.name.charAt(0) : '武'}
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-black text-zinc-100 flex items-center gap-2 truncate">
                    <span className="truncate">{userProfile.name || 'جنگجوی بوشیدو'}</span>
                    {userProfile.isAdmin && (
                      <span className="bg-red-500/20 border border-red-500/40 text-red-400 text-[10px] px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0">
                        مدیر
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate">
                    {userProfile.phoneNumber 
                      ? toPersianDigits(userProfile.phoneNumber) 
                      : userProfile.email || 'حساب کاربری محلی (مهمان)'}
                  </p>
                </div>
              </div>

              {userProfile.isVip ? (
                <span className="bg-amber-500/15 border border-amber-500/40 text-amber-300 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <span>VIP</span>
                </span>
              ) : (
                <span className="bg-zinc-800 border border-zinc-700 text-zinc-400 px-2.5 py-1 rounded-xl text-xs font-bold whitespace-nowrap shrink-0">
                  طرح استاندارد
                </span>
              )}
            </div>

            {/* VIP & Access Status Details */}
            <div className="bg-[#09090b]/70 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">سطح دسترسی:</span>
                <span className="font-bold text-zinc-200">
                  {userProfile.isVip ? 'سامورایی ویژه VIP (دسترسی کامل)' : 'رونین (طرح رایگان/استاندارد)'}
                </span>
              </div>

              {userProfile.isVip && userProfile.vipExpiresAt && (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">تاریخ پایان اشتراک:</span>
                    <span className="font-bold text-amber-300">
                      {formatPersianDate(userProfile.vipExpiresAt.split('T')[0])}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-zinc-800">
                    <span className="text-zinc-400">اعتبار باقی‌مانده:</span>
                    <span className="font-black text-emerald-400">
                      {toPersianDigits(vipDaysRemaining)} روز
                    </span>
                  </div>
                </>
              )}

              {!userProfile.isVip && (
                <p className="text-[11px] text-zinc-400 leading-relaxed bg-[#121215]/50 p-3 rounded-xl border border-zinc-800/50 text-right">
                  با فعال‌سازی اشتراک ویژه VIP، قابلیت ثبت چرخه‌های نامحدود، گزارش‌های تحلیلی سنتسی و همگام‌سازی بین دستگاه‌ها در اختیارتان قرار می‌گیرد.
                </p>
              )}
            </div>
          </div>

          {/* Account Actions & Subscriptions */}
          <div className="pt-5 mt-4 border-t border-zinc-800/80 space-y-2.5">
            {/* VIP CTA */}
            {userProfile.isVip ? (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="w-full bg-zinc-800 hover:bg-zinc-700 hover:border-amber-500/50 border border-amber-500/30 text-amber-300 font-bold text-xs py-2.5 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98] shadow-md whitespace-nowrap"
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>تمدید اشتراک سامورایی ویژه</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenPaymentModal}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer active:scale-[0.98] whitespace-nowrap"
              >
                <Crown className="w-4 h-4" />
                <span>ارتقا به حساب سامورایی ویژه (VIP)</span>
              </button>
            )}

            {/* Auth Action (Login or Logout) inside Account Card */}
            {userProfile.id ? (
              <button
                type="button"
                onClick={onLogout}
                className="w-full bg-[#09090b]/80 hover:bg-zinc-900 hover:text-red-400 hover:border-red-500/30 border border-zinc-800 text-zinc-400 text-xs font-bold py-2 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98] whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>خروج از حساب کاربری</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 text-xs font-bold py-2 rounded-2xl flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-[0.98] whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-400" />
                <span>ورود به حساب یا ثبت‌نام جنگجو</span>
              </button>
            )}
          </div>
        </div>

        {/* Discipline & Customization Settings (7 Columns on Desktop) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Nightly Cutoff Hour Card */}
          <div className="bg-[#121215]/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shrink-0 shadow-inner">
                <Moon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-zinc-100">
                  مهلت پایانی شبانه (مرز جابجایی روز)
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
                  حداکثر زمان بیداری در نیمه‌شب که ثبت عادات در آن برای روز قبل محاسبه می‌شود
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#09090b]/60 p-3.5 rounded-2xl border border-zinc-800/80 text-right">
              اگر شب‌ها تا دیروقت بیدار هستید، ثبت عادات تا قبل از این ساعت کماکان برای روز گذشته لحاظ می‌شود تا روز تقویمی شما قبل از خوابیدن از دست نرود.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
              {cutoffHoursList.map(item => {
                const isSelected = currentCutoff === item.hour;
                return (
                  <button
                    key={item.hour}
                    type="button"
                    onClick={() => handleSelectCutoffHour(item.hour)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between border transition cursor-pointer active:scale-[0.98] ${
                      isSelected
                        ? 'bg-zinc-800 border-emerald-500/50 text-white shadow-md'
                        : 'bg-[#09090b]/50 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <span className="whitespace-nowrap">{item.label}</span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* Data Management & Vault Controls */}
      <div className="bg-[#121215]/90 border border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/90 border border-zinc-700/80 flex items-center justify-center text-zinc-200 shrink-0 shadow-inner">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm sm:text-base font-bold text-zinc-100">
              مدیریت و پایگاه داده محلی (Data Vault)
            </h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
              خروجی گرفتن، بازیابی فایل پشتیبان یا بازنشانی داده‌های سیستم
            </p>
          </div>
        </div>

        {/* Standard Safe Operations: Export & Import (Clean Unified Neutral Palette) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Export JSON Card */}
          <button
            type="button"
            onClick={() => {
              soundFX.playCheck();
              onExportData();
              showNotice('فایل پشتیبان داده‌های بوشیدو با موفقیت ذخیره شد.');
            }}
            className="bg-[#09090b]/70 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 text-right transition cursor-pointer active:scale-[0.98] group shadow-sm"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-zinc-100 group-hover:border-zinc-600 transition shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-zinc-100">خروجی پشتیبان (فایل JSON)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed text-right">
                دریافت فایل پشتیبان کامل و ساختاریافته از تمامی چرخه‌ها، عادات و لاگ‌های دادگاه
              </p>
            </div>
          </button>

          {/* Import JSON Card */}
          <label className="bg-[#09090b]/70 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 text-zinc-200 p-4 sm:p-5 rounded-2xl flex items-start gap-3.5 text-right transition cursor-pointer active:scale-[0.98] group shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:text-zinc-100 group-hover:border-zinc-600 transition shrink-0">
              <Upload className="w-5 h-5" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs sm:text-sm text-zinc-100">بازیابی نسخه پشتیبان (JSON)</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed text-right">
                بارگذاری فایل پشتیبان و بازنشانی امن داده‌ها به ساختار سامانه
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        {/* Dedicated Danger Zone: Reset Data */}
        <div className="bg-red-950/15 border border-red-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-0.5 text-right">
              <h4 className="font-bold text-xs sm:text-sm text-red-200">
                منطقه حساس: بازنشانی کل داده‌های سامانه
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                تمامی لاگ‌ها، چرخه‌ها و سوابق پاک شده و سامانه به وضعیت اولیه بازمی‌گردد.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundFX.playSlash();
              onResetData();
            }}
            className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 hover:border-red-500/60 text-red-300 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] transition whitespace-nowrap shrink-0 shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            <span>بازنشانی به تنظیمات کارخانه</span>
          </button>
        </div>
      </div>

      {/* Secure Admin Dashboard Link (Rendered ONLY if userProfile.isAdmin === true) */}
      {userProfile.isAdmin && (
        <div className="bg-gradient-to-r from-red-950/40 via-zinc-900 to-amber-950/40 border-2 border-red-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/10 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-100">
                    مرکز فرماندهی و مدیریت سامانه بوشیدو (/admin)
                  </h3>
                  <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black tracking-wide whitespace-nowrap">
                    ADMIN
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  مشاهده کاربران ثبت‌نامی، گزارش تراکنش‌های درگاه بانکی، آمار تفکیکی و ارتقای دستی دسترسی‌ها
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playCheck();
                onNavigateToAdmin();
              }}
              className="bg-red-500 hover:bg-red-600 text-white font-black text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition cursor-pointer active:scale-[0.98] shrink-0 whitespace-nowrap"
            >
              <span>ورود به پنل مدیریت</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
