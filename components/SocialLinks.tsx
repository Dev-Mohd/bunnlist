const socialLinks = [
  {
    label: "X / Twitter",
    href: "https://x.com/bunnlist",
    icon: XIcon,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/bunnlist",
    icon: InstagramIcon,
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@bunnlist",
    icon: TikTokIcon,
  },
];

export function SocialLinks() {
  return (
    <section id="social" className="mx-auto w-full max-w-6xl px-5 py-11 text-center sm:px-6 lg:px-8" aria-labelledby="social-title">
      <div className="rounded-[8px] border border-[#4A3428]/10 bg-white/45 px-5 py-8 shadow-[0_18px_48px_rgba(74,52,40,0.08)] sm:px-8">
        <h2 id="social-title" className="text-2xl font-black text-[#171411]">
          تابع رحلة BunnList
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#4A3428]/70">
          بنشارك تحديثات الإطلاق، المحاصيل، وتجارب المجتمع على حساباتنا الرسمية.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          {socialLinks.map((link) => {
            const Icon = link.icon;
            return (
            <a
              className="inline-flex min-h-14 items-center justify-between gap-5 rounded-2xl border border-[#4A3428]/10 bg-[#fffaf3]/80 px-4 text-sm font-bold text-[#171411] shadow-[0_10px_28px_rgba(74,52,40,0.06)] transition hover:-translate-y-0.5 hover:border-[#6D7B61]/45 hover:bg-white sm:min-w-52"
              href={link.href}
              key={link.label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="inline-flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-[#4A3428]/10 bg-[#EDE3D6] text-[#171411]">
                  <Icon />
                </span>
                <span>{link.label}</span>
              </span>
              <span className="text-[#4A3428]/65" dir="ltr">@bunnlist</span>
            </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="17" cy="7" r="1.2" fill="currentColor" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 4v10.2a4.2 4.2 0 1 1-3.9-4.18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 6.2c1.2 2.2 2.9 3.5 5 3.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
