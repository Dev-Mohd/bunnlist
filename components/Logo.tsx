type BunnListLogoProps = {
  showWordmark?: boolean;
  className?: string;
};

/** The BunnList mark (the app icon's B, drawn from the same vector outlines as the apps) and the wordmark. */
export function BunnListLogo({ showWordmark = true, className = "" }: BunnListLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LayeredBMark />
      {showWordmark ? (
        <span className="text-[1.7rem] font-black leading-none tracking-normal text-[#171411]" dir="ltr">
          BunnList
        </span>
      ) : null}
    </span>
  );
}

export function LayeredBMark({ className = "h-11 w-[35px]" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/brand/mark.svg" alt="" aria-hidden="true" width={35} height={44} className={`shrink-0 ${className}`} />;
}
