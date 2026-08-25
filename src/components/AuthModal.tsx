import React, { useState } from 'react';
import { UserProfile } from '../types';
import { toPersianDigits, formatPersianNumber } from '../utils/numberUtils';
import { 
  ShieldCheck, 
  Smartphone, 
  Mail, 
  KeyRound, 
  User, 
  LogOut, 
  Crown, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  Database
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAuthSuccess: (token: string, user: UserProfile) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout
}) => {
  const [identifier, setIdentifier] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setServerMessage('');
    setDebugOtp(null);

    const clean = identifier.trim();
    if (!clean) {
      setErrorMessage('لطفاً شماره موبایل یا ایمیل خود را وارد نمایید.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: clean })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ارسال کد تایید');
      }

      setServerMessage(data.message || 'کد تایید ارسال شد.');
      if (data.debugCode) {
        setDebugOtp(data.debugCode);
        setOtpCode(data.debugCode); // Auto-fill for ultra smooth testing
      }
      setStep('otp');
    } catch (err: any) {
      setErrorMessage(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!otpCode.trim()) {
      setErrorMessage('لطفاً کد تایید ۵ رقمی را وارد نمایید.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          code: otpCode.trim(),
          name: name.trim() || undefined
        })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'کد تایید اشتباه است.');
      }

      const userProfile: UserProfile = {
        id: data.user.id,
        name: data.user.name || 'سامورایی دیسیپلین',
        email: data.user.email || undefined,
        phoneNumber: data.user.phoneNumber || undefined,
        tier: data.user.tier || 'free',
        isVip: !!data.user.isVip,
        vipSince: data.user.vipSince,
        vipExpiresAt: data.user.vipExpiresAt,
        paymentRefId: data.user.paymentRefId,
        activeCycleLimit: data.user.isVip ? 999 : 1
      };

      onAuthSuccess(data.token, userProfile);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در تایید کد');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4" dir="rtl">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-[#09090b]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-black font-black shadow-lg shadow-amber-500/20">
              <KeyRound className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">
                {currentUser?.id ? 'پروفایل و حساب کاربری' : 'ورود / عضویت سامورایی'}
              </h2>
              <p className="text-xs text-zinc-400">
                سیستم احراز هویت مستقل و دیتابیس اختصاصی
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentUser?.id ? (
            /* Logged in state */
            <div className="space-y-5">
              <div className="bg-[#09090b]/80 border border-zinc-800/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-amber-400 font-bold">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-zinc-100">{currentUser.name}</div>
                      <div className="text-xs text-zinc-400 font-mono">
                        {currentUser.phoneNumber || currentUser.email || `کاربر: ${toPersianDigits(currentUser.id.slice(0, 8))}`}
                      </div>
                    </div>
                  </div>

                  {currentUser.isVip ? (
                    <span className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-400" />
                      VIP
                    </span>
                  ) : (
                    <span className="bg-zinc-800 text-zinc-400 text-[11px] px-2 py-0.5 rounded-lg">
                      رایگان
                    </span>
                  )}
                </div>

                <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-[#121215]/90 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">وضعیت داده‌ها</span>
                    <span className="text-emerald-400 font-bold flex items-center justify-center gap-1">
                      <Database className="w-3.5 h-3.5" />
                      دیتابیس ابری
                    </span>
                  </div>
                  <div className="bg-[#121215]/90 rounded-xl p-2.5 text-center">
                    <span className="text-[10px] text-zinc-400 block mb-0.5">سطح دسترسی</span>
                    <span className="text-amber-400 font-bold">
                      {currentUser.isVip ? 'سامورایی ویژه VIP' : 'کاربر عادی'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 font-bold text-sm py-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  خروج از حساب کاربری
                </button>
              </div>
            </div>
          ) : (
            /* Auth Forms */
            <div>
              {step === 'input' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      شماره موبایل یا ایمیل
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="مثال: 09121234567 یا user@example.com"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition"
                        dir="ltr"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      نام یا لقب سامورایی (اختیاری)
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="مثال: رستم، سهراب، یا نام شما"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500 transition"
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-red-950/60 border border-red-800/50 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  >
                    {isLoading ? (
                      <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    ) : (
                      <>
                        <span>دریافت کد تایید امن</span>
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-zinc-500 text-center leading-relaxed">
                    با ورود به سیستم، داده‌های میدان نبرد و چرخه‌های ۹۰ روزه شما به‌صورت کاملاً ایزوله در دیتابیس امن PostgreSQL ذخیره خواهند شد.
                  </p>
                </form>
              ) : (
                /* OTP Verification Step */
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-3.5 text-xs text-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="font-bold">کد تایید ارسال شد به:</span>
                    </div>
                    <span className="font-mono text-amber-300 block text-left" dir="ltr">
                      {identifier}
                    </span>
                    {debugOtp && (
                      <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between text-[11px]">
                        <span className="text-amber-400/80">کد آزمایشی تست سریع:</span>
                        <span className="font-mono font-black text-amber-300 bg-amber-900/60 px-2 py-0.5 rounded-md">
                          {toPersianDigits(debugOtp)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-300 mb-1.5">
                      کد تایید ۵ رقمی را وارد کنید
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value)}
                      placeholder="_____ "
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3.5 text-center text-xl tracking-[0.5em] font-mono text-amber-400 placeholder:text-zinc-700 focus:outline-none focus:border-amber-500 transition"
                      dir="ltr"
                      autoFocus
                    />
                  </div>

                  {errorMessage && (
                    <div className="bg-red-950/60 border border-red-800/50 rounded-xl p-3 text-xs text-red-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="w-1/3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold py-3.5 rounded-2xl transition cursor-pointer"
                    >
                      تغییر شماره
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-2/3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-sm py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                    >
                      {isLoading ? (
                        <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <span>تایید و ورود به سیستم</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
