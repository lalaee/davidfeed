/*
 * Sharing the clip itself.
 *
 * There are two worlds and they want opposite things.
 *
 * On a phone the operating system already has the menu the reader wants —
 * WhatsApp Status, Instagram Feed, Instagram Story, Messages, Save to Photos —
 * populated from what they actually have installed. Putting our own menu in
 * front of that is a tap in the way of the thing they were reaching for, so the
 * share button goes straight to the system sheet with the video attached.
 *
 * On a desktop browser there is usually no such sheet, and no way to hand over
 * a file at all. That is the only place our own menu earns its place, and there
 * it offers what the platform genuinely can do: save the video, or copy a link.
 *
 * canShareFiles is the line between them, and it is asked of the browser rather
 * than guessed from the user agent.
 */

/** The verdict never changes after load, so there is nothing to subscribe to. */
export const subscribeNever = () => () => {};

/**
 * Whether this browser will hand a video file to a native share sheet.
 *
 * Probed with a real one-byte File, because canShare inspects the type of what
 * it is given — asking with an empty list, or with only a string, answers a
 * different question. Must return a stable primitive: useSyncExternalStore
 * re-reads it on every render.
 */
export const readCanShareFiles = (): boolean => {
  if (typeof navigator === "undefined" || !navigator.canShare || !navigator.share) return false;
  try {
    const probe = new File([new Blob([new Uint8Array(1)])], "probe.mp4", { type: "video/mp4" });
    return navigator.canShare({ files: [probe] });
  } catch {
    return false;
  }
};

/** Assume the phone case on the server, and reconcile on the client. */
export const serverCanShareFiles = () => true;

export const shareFileName = (title: string) =>
  `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-dafod.mp4`;

export async function fetchShareFile(postId: number, title: string): Promise<File> {
  const res = await fetch(`/assets/share/${postId}.mp4`);
  if (!res.ok) throw new Error(`share asset ${postId}: ${res.status}`);
  return new File([await res.blob()], shareFileName(title), { type: "video/mp4" });
}

/**
 * Hand the clip to the system sheet. Resolves true if it got there.
 *
 * The file goes ALONE, with no text or url beside it. { files, text } is valid
 * but narrows the field: several iOS share extensions — Instagram's among them
 * — accept a share that is purely media and refuse or flatten one that mixes
 * media with a string. The target list is worth more than a caption.
 *
 * The await before share() is deliberate and safe. User activation is
 * TRANSIENT, ~5s in both WebKit and Chromium, so a same-origin fetch of a few
 * megabytes lands inside it. Prefetching on dwell was the alternative and would
 * pull megabytes per card for a button most readers never press.
 */
export async function shareVideoFile(postId: number, title: string): Promise<boolean> {
  try {
    const file = await fetchShareFile(postId, title);
    if (!navigator.canShare?.({ files: [file] })) return false;
    await navigator.share({ files: [file] });
    return true;
  } catch (err) {
    // Dismissing the sheet throws AbortError. That is the reader answering, not
    // a failure, and it must not fall through to some other kind of share.
    if ((err as Error)?.name === "AbortError") return true;
    return false;
  }
}
