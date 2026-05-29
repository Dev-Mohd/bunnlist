const socialLinks = [
  {
    label: "X / Twitter",
    href: "https://x.com/bunnlist",
  },
  {
    label: "Instagram",
    href: "https://instagram.com/bunnlist",
  },
  {
    label: "TikTok",
    href: "https://tiktok.com/@bunnlist",
  },
];

export function SocialLinks() {
  return (
    <section id="social" className="mx-auto w-full max-w-6xl px-5 py-16 text-center sm:px-6 lg:px-8" aria-labelledby="social-title">
      <div className="rounded-[8px] border border-[#4A3428]/10 bg-white/45 px-5 py-8 shadow-[0_18px_48px_rgba(74,52,40,0.08)] sm:px-8">
        <h2 id="social-title" className="text-2xl font-black text-[#171411]">
          تابع رحلة BunnList
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#4A3428]/70">
          بنشارك التحديثات، المحاصيل، وتجارب المجتمع على حساباتنا الرسمية.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {socialLinks.map((link) => (
            <a
              className="inline-flex min-h-12 items-center justify-between gap-5 rounded-full border border-[#4A3428]/10 bg-white/70 px-5 text-sm font-bold text-[#4A3428] transition hover:-translate-y-0.5 hover:border-[#6D7B61]/40 hover:text-[#171411] sm:min-w-40"
              href={link.href}
              key={link.label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>{link.label}</span>
              <span dir="ltr">@bunnlist</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
