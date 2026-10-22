/*
 * Sharing the clip itself.
 *
 * What is shared is the video: /assets/share/<post id>.mp4. For the LemoLab
 * films that is the film as LemoLab delivered it with the dafod ending ("See
 * more at: Dafod.app", from lemo-opuscar's Bible/outro), re-encoded for the
 * web with its sound — the feed's own copies are silent and end without it.
 *
 * ShareSheet.tsx is the one way in, on every device. It fetches the file while
 * it is up (fetchShareFile, with progress) and its tiles hand that file to the
 * system share sheet where the browser has one (canShareFiles, asked of the
 * browser rather than guessed from the user agent), or download it.
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

export async function fetchShareFile(
  postId: number,
  title: string,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<File> {
  const res = await fetch(`/assets/share/${postId}.mp4`, { signal });
  if (!res.ok) throw new Error(`share asset ${postId}: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  // Read it in chunks when we can say how far along it is: the films' share
  // files are tens of megabytes, and the sheet shows the wait.
  if (!onProgress || !total || !res.body) {
    return new File([await res.blob()], shareFileName(title), { type: "video/mp4" });
  }
  const reader = res.body.getReader();
  const parts: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    got += value.length;
    onProgress(Math.min(1, got / total));
  }
  return new File(parts as BlobPart[], shareFileName(title), { type: "video/mp4" });
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
