type BunnListLogoProps = {
  showWordmark?: boolean;
  className?: string;
};

export function BunnListLogo({ showWordmark = true, className = "" }: BunnListLogoProps) {
  return (
    <span className={`inline-flex items-center gap-3.5 ${className}`}>
      <LayeredBMark />
      {showWordmark ? (
        <span className="text-[1.7rem] font-black leading-none tracking-normal text-[#171411]" dir="ltr">
          BunnList
        </span>
      ) : null}
    </span>
  );
}

export function LayeredBMark() {
  return (
    <svg
      className="h-11 w-11 shrink-0"
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="BunnList mark"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M8 8h18.5C34.5 8 40 13 40 20c0 6.9-5.5 12-13.5 12H8V8Z"
        fill="#171411"
      />
      <path
        d="M8 21.5h18c6.7 0 11 3.6 11 9.2C37 36.5 32.4 40 25.6 40H8V21.5Z"
        fill="#4A3428"
      />
      <path
        d="M8 14.2c7.7-3.4 14.5-3.5 22.4.1 3.6 1.7 6.4 1.5 9.6-.2v8.2c-3.9 2.1-7.8 2-12.4-.1-6-2.8-11.9-2.8-19.6.7v-8.7Z"
        fill="#6D7B61"
      />
      <path
        d="M8 28.4c7.2-3.2 13.4-3.2 20.8-.1 3.4 1.4 6.1 1.4 8.9.1v7.4c-3.5 1.7-7.1 1.6-11.1-.1-5.7-2.4-10.8-2.4-18.6.7v-8Z"
        fill="#EDE3D6"
      />
      <circle cx="39" cy="26" r="5" fill="#D6A84F" />
    </svg>
  );
}
