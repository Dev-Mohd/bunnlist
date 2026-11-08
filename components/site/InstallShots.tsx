import type { ReactNode } from "react";

// Drawn Android screens for the install guide (/android). They're illustrations made here in code, not
// screenshots: the wording follows Android's own Arabic messages, and the button to press is ringed in gold.
// Real screens differ a little from phone to phone, which the page says.

/** A plain Android phone: thin bezel, punch-hole camera, status bar. */
function Phone({ children, dim = false }: { children: ReactNode; dim?: boolean }) {
  return (
    <div className="relative mx-auto aspect-[9/17] w-[168px] shrink-0 rounded-[26px] bg-[#1b1a19] p-[6px] shadow-[0_18px_40px_rgba(74,52,40,0.22)] sm:w-[188px]">
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[21px] bg-[#f3f1ee] text-[#1b1a19]" dir="rtl">
        <div className="flex items-center justify-between px-3 pt-1.5 text-[8px] font-semibold" dir="ltr">
          <span>9:41</span>
          <span className="h-[7px] w-[7px] rounded-full bg-[#1b1a19]" />
          <span className="tracking-tighter">▂▄▆ ▮</span>
        </div>
        <div className="relative flex-1">{children}</div>
        {dim ? null : <div className="mx-auto mb-1.5 h-[3px] w-12 rounded-full bg-[#1b1a19]/30" />}
      </div>
    </div>
  );
}

/** What to press: a gold ring that breathes. */
function Tap({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span className="pointer-events-none absolute -inset-[5px] animate-pulse rounded-full border-2 border-[#c89a3e]" />
      {children}
    </span>
  );
}

/** A dialog over a dimmed screen. */
function Dialog({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-end bg-black/45 p-2 pb-3">
      <div className="w-full rounded-[18px] bg-white p-3 text-[9px] leading-[1.5] shadow-lg">{children}</div>
    </div>
  );
}

function Buttons({ cancel, ok, tapOk = true }: { cancel: string; ok: string; tapOk?: boolean }) {
  return (
    <div className="mt-3 flex justify-start gap-3 text-[9px] font-semibold text-[#1a5fb4]">
      {tapOk ? <Tap><span className="px-1">{ok}</span></Tap> : <span className="px-1">{ok}</span>}
      <span className="px-1 text-[#1b1a19]/60">{cancel}</span>
    </div>
  );
}

function AppBadge({ size = 30 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/site/app-icon.png" alt="" width={size} height={size} className="rounded-[8px]" style={{ width: size, height: size }} />;
}

function Browser({ children }: { children?: ReactNode }) {
  return (
    <div className="absolute inset-0">
      <div className="mx-2 mt-1 rounded-full bg-white px-3 py-1 text-[8px] text-[#1b1a19]/60" dir="ltr">bunnlist.com/android</div>
      <div className="mt-4 flex flex-col items-center gap-2 px-3 text-center">
        <AppBadge size={34} />
        <p className="text-[11px] font-bold">BunnList على جوالك.</p>
        <span className="rounded-full bg-[#171411] px-3 py-1.5 text-[8.5px] font-medium text-[#f7f1e8]">حمّل ملف التطبيق</span>
        <div className="mt-2 w-full space-y-1.5">
          <div className="h-1.5 rounded bg-[#1b1a19]/10" />
          <div className="h-1.5 w-4/5 rounded bg-[#1b1a19]/10" />
        </div>
      </div>
      {children}
    </div>
  );
}

// Step 1: the browser asks whether to keep the file.
export function ShotDownload() {
  return (
    <Phone>
      <Browser>
        <div className="absolute inset-x-0 bottom-0 rounded-t-[16px] bg-white p-3 text-[9px] leading-[1.5] shadow-[0_-6px_18px_rgba(0,0,0,0.12)]">
          <p>قد يضرّ هذا النوع من الملفات بجهازك. هل تريد تنزيل <b dir="ltr">BunnList.apk</b> على أي حال؟</p>
          <Buttons cancel="إلغاء" ok="تنزيل على أي حال" />
        </div>
      </Browser>
    </Phone>
  );
}

// Step 2: open it from the notification.
export function ShotOpen() {
  return (
    <Phone>
      <div className="absolute inset-0 bg-[#2a2a2c] p-2 text-white">
        <p className="px-1 pt-1 text-[16px] font-light" dir="ltr">9:41</p>
        <p className="px-1 text-[8px] opacity-70">الإشعارات</p>
        <Tap className="mt-2 block w-full rounded-[14px]">
          <div className="flex w-full items-center gap-2 rounded-[14px] bg-[#3a3a3d] p-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1a73e8] text-[10px]">↓</span>
            <div className="text-[8.5px] leading-[1.4]">
              <p className="font-semibold" dir="ltr">BunnList.apk</p>
              <p className="opacity-70">اكتمل التنزيل · اضغط للفتح</p>
            </div>
          </div>
        </Tap>
        <div className="mt-2 rounded-[14px] bg-[#3a3a3d]/60 p-2 text-[8px] opacity-60">
          <p>أو: ملفاتي ← التنزيلات</p>
        </div>
      </div>
    </Phone>
  );
}

// Step 3a: Android blocks the source the first time.
export function ShotBlocked() {
  return (
    <Phone>
      <Browser />
      <Dialog>
        <p className="font-semibold">تم حظر التثبيت</p>
        <p className="mt-1 text-[#1b1a19]/75">لأسباب أمنية، لا يُسمح لهاتفك بتثبيت تطبيقات غير معروفة من هذا المصدر.</p>
        <Buttons cancel="إلغاء" ok="الإعدادات" />
      </Dialog>
    </Phone>
  );
}

// Step 3b: allow it.
export function ShotAllow() {
  return (
    <Phone>
      <div className="absolute inset-0 px-3 pt-2">
        <p className="text-[8px] text-[#1b1a19]/60">→</p>
        <p className="mt-1 text-[12px] font-bold leading-tight">تثبيت تطبيقات غير معروفة</p>
        <div className="mt-3 flex items-center gap-2 rounded-[12px] bg-white p-2">
          <span className="h-5 w-5 rounded-full bg-[conic-gradient(#ea4335_0_33%,#fbbc04_0_66%,#34a853_0)]" />
          <span className="text-[9px] font-semibold">المتصفح</span>
        </div>
        <div className="mt-2 flex items-center justify-between rounded-[12px] bg-white p-2.5">
          <span className="text-[9px]">السماح من هذا المصدر</span>
          <Tap>
            <span className="flex h-[14px] w-[26px] items-center justify-end rounded-full bg-[#536344] px-[2px]" dir="ltr">
              <span className="h-[10px] w-[10px] rounded-full bg-white" />
            </span>
          </Tap>
        </div>
        <p className="mt-2 text-[7.5px] leading-[1.5] text-[#1b1a19]/55">فعّله ثم ارجع بزر الرجوع.</p>
      </div>
    </Phone>
  );
}

// Step 4a: install.
export function ShotInstall() {
  return (
    <Phone>
      <Browser />
      <Dialog>
        <div className="flex items-center gap-2">
          <AppBadge size={24} />
          <b className="text-[10px]">BunnList</b>
        </div>
        <p className="mt-2 text-[#1b1a19]/75">هل تريد تثبيت هذا التطبيق؟</p>
        <Buttons cancel="إلغاء" ok="تثبيت" />
      </Dialog>
    </Phone>
  );
}

// Step 4b: Play Protect hasn't seen the app yet.
export function ShotProtect() {
  return (
    <Phone>
      <Browser />
      <Dialog>
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#e8f0fe] text-[9px] text-[#1a73e8]">⛨</span>
          <b className="text-[9.5px]">Play Protect</b>
        </div>
        <p className="mt-1.5 text-[#1b1a19]/75">لم يسبق أن رصد Play Protect مطوّر هذا التطبيق.</p>
        <p className="mt-1 text-[8px] text-[#1b1a19]/55">مزيد من التفاصيل ⌄</p>
        <div className="mt-2.5 flex justify-start gap-3 text-[9px] font-semibold text-[#1a5fb4]">
          <Tap><span className="px-1">التثبيت على أي حال</span></Tap>
          <span className="px-1 text-[#1b1a19]/60">موافق</span>
        </div>
      </Dialog>
    </Phone>
  );
}

// Step 5: open it.
export function ShotDone() {
  return (
    <Phone>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
        <AppBadge size={44} />
        <p className="text-[11px] font-bold">BunnList</p>
        <p className="text-[9px] text-[#1b1a19]/70">✓ تم تثبيت التطبيق.</p>
        <div className="mt-4 flex w-full justify-between gap-2 text-[9px] font-semibold">
          <span className="flex-1 rounded-full border border-[#1b1a19]/15 py-1.5">تم</span>
          <Tap className="flex-1 rounded-full">
            <span className="w-full rounded-full bg-[#536344] py-1.5 text-white">فتح</span>
          </Tap>
        </div>
      </div>
    </Phone>
  );
}

// Samsung: Auto Blocker.
export function ShotAutoBlocker() {
  return (
    <Phone>
      <div className="absolute inset-0 px-3 pt-2">
        <p className="text-[7.5px] text-[#1b1a19]/55">الإعدادات ← الأمان والخصوصية</p>
        <p className="mt-1 text-[12px] font-bold">الحظر التلقائي</p>
        <div className="mt-3 flex items-center justify-between rounded-[14px] bg-white p-2.5">
          <span className="text-[9.5px] font-semibold">إيقاف</span>
          <Tap>
            <span className="flex h-[14px] w-[26px] items-center justify-start rounded-full bg-[#1b1a19]/25 px-[2px]" dir="ltr">
              <span className="h-[10px] w-[10px] rounded-full bg-white" />
            </span>
          </Tap>
        </div>
        <p className="mt-2 text-[7.5px] leading-[1.5] text-[#1b1a19]/55">يمنع تثبيت التطبيقات من خارج المتاجر. أوقفه وقت التثبيت، وشغّله بعدها إذا تبي.</p>
      </div>
    </Phone>
  );
}
