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
    <section className="mx-auto w-full max-w-6xl px-5 pb-14 text-center" aria-labelledby="social-title">
      <div className="rounded-[8px] border border-white/10 bg-white/[0.045] px-5 py-8 backdrop-blur sm:px-8">
        <h2 id="social-title" className="text-2xl font-semibold text-porcelain">
          تابع رحلة BunnList
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-oat/62">
          بنشارك التحديثات، المحاصيل، وتجارب المجتمع على حساباتنا الرسمية.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {socialLinks.map((link) => (
            <a
              className="inline-flex min-h-12 items-center justify-between gap-5 rounded-full border border-white/10 bg-[#21140d]/70 px-5 text-sm font-semibold text-porcelain transition hover:-translate-y-0.5 hover:border-crema/40 hover:text-crema sm:min-w-40"
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
