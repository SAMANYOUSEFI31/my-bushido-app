// بررسی وضعیت دسترسی مخفی
const [showSecretDev, setShowSecretDev] = useState(false);
const secretClickCountRef = useRef(0);
const secretTimerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (isOpen) {
    try {
      const isSecretUnlocked = localStorage.getItem('bushido_secret_dev_mode') === 'true';
      setShowSecretDev(isSecretUnlocked);
    } catch (e) {
      setShowSecretDev(false);
    }
  }
}, [isOpen]);

const handleSecretIconClick = () => {
  secretClickCountRef.current += 1;
  if (secretTimerRef.current) clearTimeout(secretTimerRef.current);

  if (secretClickCountRef.current >= 5) {
    secretClickCountRef.current = 0;
    const nextVal = !showSecretDev;
    setShowSecretDev(nextVal);
    try {
      localStorage.setItem('bushido_secret_dev_mode', nextVal.toString());
    } catch (e) {}
    return;
  }

  secretTimerRef.current = setTimeout(() => {
    secretClickCountRef.current = 0;
  }, 2000);
};

{/* نمایش منوی ادمین تنها در صورت فعال بودن قفل مخفی */}
{showSecretDev && (
  <div className="pt-4 border-t border-amber-500/30 space-y-2 animate-in fade-in zoom-in-95 duration-200">
    <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between">
      <span className="flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-amber-400" />
        دسترسی مخفی فرمانده ارشد و توسعه:
      </span>
      <button
        type="button"
        onClick={() => {
          setShowSecretDev(false);
          try {
            localStorage.setItem('bushido_secret_dev_mode', 'false');
          } catch (e) {}
        }}
        className="text-[10px] text-zinc-400 hover:text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded cursor-pointer"
      >
        مخفی‌سازی
      </button>
    </div>

    <div className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => handleQuickLogin('admin')}
        disabled={isLoading}
        className="bg-red-950/40 hover:bg-red-900/60 border border-red-500/40 text-red-300 rounded-xl p-2.5 text-right transition cursor-pointer text-xs"
      >
        <div className="flex items-center gap-1.5 font-bold text-red-300">
          <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
          <span>ورود به عنوان مدیر</span>
        </div>
        <span className="text-[10px] text-zinc-400 block mt-0.5">فرمانده ارشد (VIP + Admin)</span>
      </button>

      <button
        type="button"
        onClick={() => handleQuickLogin('test_user')}
        disabled={isLoading}
        className="bg-zinc-800/80 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 rounded-xl p-2.5 text-right transition cursor-pointer text-xs"
      >
        <div className="flex items-center gap-1.5 font-bold text-zinc-200">
          <User className="w-3.5 h-3.5 text-amber-400" />
          <span>ورود کاربر تستی</span>
        </div>
        <span className="text-[10px] text-zinc-400 block mt-0.5">مشاهده از دید کاربر</span>
      </button>
    </div>
  </div>
)}
