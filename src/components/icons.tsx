/*
 * Every feed icon, inline.
 *
 * They were <img src> files until a load hiccup rendered the saved bookmark as
 * a broken-image box. Inline there is no request to fail, nothing to cache
 * stale, and — the quieter win — colour actually works: the exported files
 * carry fill="var(--fill-0, …)", and CSS custom properties do not cross the
 * <img> boundary, so those variables never resolved to anything. Here every
 * path takes currentColor and the caller decides.
 *
 * Playback and audio icons are Figma exports (2633:1089 / 1100 / 1104 / 1122,
 * 48x48, stroked 3 round or filled). They replace hand-drawn stand-ins.
 * Bookmarks are 2634:1154 (filled #EAC72C) and 2634:1156 (stroked 2.4).
 * Send is the local 40x40 export, two filled paths.
 *
 * All are stroke-free of their own colour so a parent can set it, and all use
 * a viewBox rather than fixed geometry so one component serves every size.
 */
interface IconProps {
  size?: number;
  className?: string;
}

export function AudioOnIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <path d="M38.8711 11.5488C43.8583 18.9888 43.8729 28.8069 38.8711 36.2633" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M33.9775 16.4346C36.5411 21.08 36.5411 26.7492 33.9775 31.3782" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.36474 23.906C5.35928 26.3986 5.36474 29.3222 7.42292 31.0696C9.48292 32.8186 11.1156 32.0968 13.7793 32.9732C16.4447 33.8514 20.1774 39.266 24.301 36.8204C26.5302 35.2368 27.581 32.2478 27.581 23.906C27.581 15.5641 26.5774 12.6077 24.301 10.9914C20.1774 8.54772 16.4447 13.9623 13.7793 14.8386C11.1156 15.7168 9.48292 14.995 7.42292 16.7423C5.36474 18.4895 5.35928 21.4132 5.36474 23.906Z"
        stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

export function AudioOffIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <path d="M16.8065 33.1066C14.6412 32.6056 13.1739 32.9992 11.3665 31.4782C9.34439 29.7604 9.32651 26.8792 9.34439 24.4276C9.32651 21.9762 9.34439 19.095 11.3665 17.3771C13.3886 15.6592 14.9991 16.3571 17.6297 15.4982C20.2423 14.6392 23.9107 9.30659 27.9729 11.7045C29.6191 12.8677 30.5855 14.7645 30.9791 18.934" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31.1586 27.3438C30.926 33.3563 29.8882 35.7721 27.9734 37.1321C25.8976 38.3669 23.9112 37.5618 22.1396 36.3628" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40.5703 9.3418L9.88086 40.0314" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        d="M37.5859 24.0193C37.5859 25.0003 37.2772 25.9851 36.6596 26.7737C36.5438 26.9284 36.0035 27.5661 35.5789 27.9812L35.3473 28.2076C32.1052 31.645 24.0386 36.8143 19.9474 38.4707C19.9474 38.5084 17.5158 39.4932 16.3579 39.5272H16.2035C14.4281 39.5272 12.7684 38.5499 11.9193 36.9652C11.4562 36.0936 11.0316 33.5655 10.993 33.5316C10.6456 31.2639 10.4141 27.7925 10.4141 23.9816C10.4141 19.9857 10.6456 16.3597 11.0702 14.1335C11.0702 14.0957 11.4948 12.0582 11.7649 11.379C12.1895 10.4017 12.9614 9.56787 13.9263 9.03962C14.6983 8.66607 15.5088 8.47363 16.3579 8.47363C17.2456 8.51514 18.9053 9.07735 19.5614 9.34147C23.8842 11.0017 32.1438 16.4351 35.3087 19.7555C35.8491 20.2838 36.428 20.929 36.5824 21.0762C37.2386 21.9063 37.5859 22.9251 37.5859 24.0193Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function PauseIcon({ size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <path d="M27.4141 34.2646V13.7354" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5859 34.2646V13.7354" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SendIcon({ size = 40, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M21.5425 8.60312C15.6669 10.2209 9.55105 12.3934 6.88548 13.932C6.24878 14.2996 6.10819 14.5448 6.08308 14.5988C6.09492 14.6402 6.14131 14.7397 6.30305 14.9113C6.59953 15.2257 7.12187 15.5945 7.87446 15.9908C8.61096 16.3785 9.49708 16.7562 10.4583 17.1135C12.3804 17.8281 14.5215 18.4317 16.1956 18.8588C17.0297 19.0714 17.7417 19.2388 18.2442 19.3529C18.4953 19.4098 18.6938 19.4533 18.8289 19.4826L18.9825 19.5154L19.0207 19.5234L19.0319 19.5258C19.5006 19.6228 19.8673 19.989 19.9642 20.4578L19.9666 20.4693L19.9746 20.5076L20.0074 20.6612C20.0367 20.7962 20.0802 20.9948 20.1372 21.2458C20.2513 21.7484 20.4186 22.4604 20.6313 23.2945C21.0583 24.9685 21.662 27.1097 22.3764 29.0317C22.7338 29.993 23.1114 30.8791 23.4993 31.6156C23.8956 32.3682 24.2644 32.8905 24.5788 33.1869C24.7503 33.3487 24.8498 33.3951 24.8913 33.4069C24.9454 33.3818 25.1905 33.2412 25.558 32.6045C27.0967 29.9389 29.2692 23.8231 30.887 17.9476C31.6903 15.0297 32.342 12.2247 32.7034 9.99874C32.8846 8.88306 32.9881 7.94167 33.007 7.21791C33.0146 6.92938 33.0082 6.69044 32.9916 6.49848C32.7996 6.48186 32.5607 6.47549 32.2721 6.48304C31.5484 6.50199 30.607 6.60544 29.4913 6.78661C27.2654 7.1481 24.4604 7.79975 21.5425 8.60312ZM24.9142 33.41C24.9142 33.41 24.909 33.4113 24.898 33.4087C24.9084 33.4077 24.9142 33.41 24.9142 33.41ZM17.7814 21.7087C17.759 21.7037 17.7364 21.6986 17.7132 21.6933C17.1938 21.5756 16.4607 21.4033 15.6024 21.1842C13.8916 20.7479 11.6582 20.1202 9.62201 19.3631C8.60412 18.9847 7.61516 18.5666 6.75635 18.1145C5.91361 17.6706 5.12041 17.1554 4.55681 16.5577C3.99515 15.9619 3.49638 15.0929 3.74353 14.0541C3.97284 13.0904 4.76048 12.3875 5.68564 11.8534C8.63952 10.1484 15.0166 7.91061 20.9054 6.28924C23.8697 5.47306 26.7649 4.79792 29.1066 4.41765C30.2748 4.22796 31.3342 4.10677 32.2094 4.08388C32.647 4.07242 33.0622 4.08479 33.4348 4.13269C33.793 4.17876 34.1895 4.26679 34.541 4.45397C34.7516 4.56612 34.9239 4.73847 35.0361 4.94903C35.2233 5.3005 35.3113 5.69696 35.3574 6.05524C35.4054 6.42794 35.4177 6.84308 35.4062 7.28069C35.3833 8.15586 35.2622 9.21525 35.0724 10.3834C34.6921 12.7252 34.017 15.6203 33.2009 18.5847C31.5794 24.4735 29.3417 30.8505 27.6366 33.8044C27.1026 34.7295 26.3998 35.5172 25.4359 35.7465C24.3972 35.9937 23.5281 35.4949 22.9324 34.9332C22.3346 34.3697 21.8193 33.5764 21.3756 32.7337C20.9234 31.8749 20.5054 30.886 20.127 29.8681C19.3698 27.8319 18.7422 25.5985 18.3058 23.8877C18.0868 23.0293 17.9145 22.2962 17.7967 21.7769C17.7914 21.7537 17.7863 21.7311 17.7814 21.7087ZM6.08011 14.5759C6.08011 14.5759 6.08227 14.5816 6.08134 14.592C6.07876 14.581 6.08011 14.5759 6.08011 14.5759Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M34.8256 4.66452C35.2942 5.13314 35.2942 5.89295 34.8256 6.36157L19.6377 21.5494C19.1691 22.0181 18.4092 22.0181 17.9406 21.5494C17.472 21.0808 17.472 20.3209 17.9406 19.8523L33.1284 4.66452C33.5971 4.19589 34.3569 4.19589 34.8256 4.66452Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BookmarkIcon({ filled, size = 40, className }: IconProps & { filled: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={className}
    >
      {filled ? (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M25.083 16.7488H14.115C13.4526 16.7488 12.915 16.2112 12.915 15.5488C12.915 14.8864 13.4526 14.3488 14.115 14.3488H25.083C25.7454 14.3488 26.283 14.8864 26.283 15.5488C26.283 16.2112 25.7454 16.7488 25.083 16.7488ZM32.3502 21.584L32.3454 18.2864C32.3454 6.136 30.4398 4 19.5998 4C8.75979 4 6.85419 6.136 6.85419 18.2864L6.84939 21.584C6.83499 30.584 6.82859 33.9536 8.20299 35.328C8.64779 35.7744 9.23819 36 9.95659 36C11.4846 36 13.1838 34.5488 14.9838 33.0112C16.5774 31.6496 18.3838 30.1072 19.5998 30.1072C20.8158 30.1072 22.6222 31.6496 24.2158 33.0112C26.0158 34.5488 27.715 36 29.243 36C29.9614 36 30.5518 35.7744 30.9966 35.328C32.371 33.9536 32.3646 30.584 32.3502 21.584Z"
          fill="currentColor"
        />
      ) : (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M19.5519 4.7998C9.3328 4.7998 7.6064 6.291 7.6064 18.2862C7.6064 31.715 7.3552 35.1998 9.9088 35.1998C12.4608 35.1998 16.6287 29.3054 19.5519 29.3054C22.4751 29.3054 26.6431 35.1998 29.1951 35.1998C31.7487 35.1998 31.4975 31.715 31.4975 18.2862C31.4975 6.291 29.7711 4.7998 19.5519 4.7998Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

/*
 * Icons/compare — Figma "Icons/compare" 2642:2102, rebuilt from its geometry
 * rather than guessed. Two overlapping rounded squares with a filled sliver
 * where they meet; the first version of this shipped the old action sheet's
 * bookmark path by mistake, which is a different glyph entirely.
 *
 * A 14.7 box sits at (2.39, 2.27) in the 20 frame, and the parts are placed
 * relative to it: right 10 x 10.3 at (4.7, -0.43), left 9.7 x 10.4 at
 * (0, 5.58), fill 5 x 4.44 at (4.7, 5.58). Strokes are 1.3, radii 2.8 and 0.8.
 * Coordinates below are those sums, so the drawing is checkable against Figma.
 */
export function CompareIcon({ size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
      className={className}
    >
      <rect
        x="7.09" y="1.84" width="10" height="10.3" rx="2.8"
        stroke="currentColor" strokeWidth="1.3"
      />
      <rect
        x="2.39" y="7.85" width="9.7" height="10.4" rx="2.8"
        stroke="currentColor" strokeWidth="1.3"
      />
      <rect
        x="7.09" y="7.85" width="5" height="4.44" rx="0.8"
        fill="currentColor"
      />
    </svg>
  );
}
