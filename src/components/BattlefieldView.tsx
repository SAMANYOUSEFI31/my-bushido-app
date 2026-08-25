// تعریف وضعیت Swipe Hint با ذخیره‌سازی محلی
const [hasSeenSwipeHint, setHasSeenSwipeHint] = useState<boolean>(() => {
  try {
    return localStorage.getItem('bushido_has_seen_swipe_hint') === 'true';
  } catch (e) {
    return false;
  }
});

const dismissSwipeHint = () => {
  setHasSeenSwipeHint(true);
  try {
    localStorage.setItem('bushido_has_seen_swipe_hint', 'true');
  } catch (e) {}
};

// راهنمای موبایل با قابلیت بستن دستی و حذف خودکار بعد از اولین Swipe
{!hasSeenSwipeHint && (
  <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#121215] border border-zinc-800 rounded-xl text-[10px] text-zinc-400 select-none sm:hidden -my-2 animate-in fade-in slide-in-from-top-1">
    <div className="flex items-center gap-1.5">
      <span className="text-amber-400 font-mono">‹ ›</span>
      <span>برای تغییر سریع روزها، صفحه را به راست یا چپ بکشید (Swipe)</span>
    </div>
    <button
      type="button"
      onClick={dismissSwipeHint}
      className="text-zinc-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
      title="بستن راهنما"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  </div>
)}

// جابه‌جایی اسلاید یکپارچه میدان نبرد
<AnimatePresence mode="wait">
  <motion.div
    key={selectedDate}
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
    drag="x"
    dragConstraints={{ left: 0, right: 0 }}
    dragElastic={0.12}
    onDragEnd={(_, info) => {
      if (Math.abs(info.offset.x) > 30 || Math.abs(info.velocity.x) > 200) {
        dismissSwipeHint();
      }
      if (info.offset.x > 60 || info.velocity.x > 300) {
        soundFX.playCheck();
        onSelectDate(addDaysToDate(selectedDate, -1));
      } else if (info.offset.x < -60 || info.velocity.x < -300) {
        soundFX.playCheck();
        onSelectDate(addDaysToDate(selectedDate, 1));
      }
    }}
    className="space-y-6 touch-pan-y"
  >
    {/* محتوای روز جاری ... */}
  </motion.div>
</AnimatePresence>
