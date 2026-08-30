"use client";

import { useCallback, useState, type ReactNode } from "react";

/*
 * An icon button that answers the finger.
 *
 * Two separate pieces of motion, because they mean different things:
 *
 *   PRESS   immediate, while the finger is down. Apple's rule is to respond on
 *           pointer-down rather than on release — a control that does nothing
 *           until the action completes feels dead under the thumb.
 *   COMMIT  plays on release, and is per-button: the share glyph flies off
 *           like a paper plane, the bookmark pops.
 *
 * The press is React state rather than CSS :active. :active never reaches a
 * child element, and on iOS Safari it only fires at all under conditions that
 * are awkward to guarantee — an element or ancestor carrying a touch listener.
 * Since the press IS the feature, it should not depend on that.
 *
 * Every exit releases it — up, leave, out, cancel, blur, and commit. A press
 * that fails to clear leaves the button permanently shrunk once its commit
 * animation ends and the inline transform reappears, which is exactly what
 * happened with only the first three wired up.
 */
interface IconButtonProps {
  onClick: () => void;
  label: string;
  /** Class applied while the commit animation runs. */
  animationClass?: string;
  animating?: boolean;
  children: ReactNode;
}

export default function IconButton({
  onClick,
  label,
  animationClass,
  animating,
  children,
}: IconButtonProps) {
  const [pressed, setPressed] = useState(false);
  const release = useCallback(() => setPressed(false), []);

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => {
        // Release here too. pointerup/leave/cancel cover the normal paths, but
        // if any of them is missed the button would stay shrunk once the
        // commit animation ends and the inline transform reappears.
        release();
        onClick();
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onPointerOut={release}
      onBlur={release}
      className={`flex h-[40px] w-[40px] cursor-pointer items-center justify-center
                  border-none bg-transparent
                  ${animating && animationClass ? animationClass : "icon-press"}`}
      // Inline so it beats the class's resting transform without a second
      // class, and so the commit animation can take over cleanly.
      style={pressed && !animating ? { transform: "scale(0.94)" } : undefined}
    >
      {children}
    </button>
  );
}
