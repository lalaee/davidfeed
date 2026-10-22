import type { Session } from "@supabase/supabase-js";

import { supabase } from "./supabase";
import {
  EMPTY_POSTS,
  EMPTY_STORE,
  highlightStore,
  savedPostStore,
  savedVerseStore,
  type ChapterMap,
  type ChapterStore,
} from "./stores";

/*
 * Accounts, and the Library that belongs to one.
 *
 * Saving and highlighting need a reader who is signed in; everything else —
 * the feed, the Bible, the translation picker — works for anyone. The three
 * Library stores in stores.ts stay exactly as they were and remain what every
 * component reads, so the UI is as instant as it was: they are now a cache of
 * the reader's row in Supabase's `library` table (supabase/migrations), pushed
 * up after each change and pulled down on sign-in and whenever the tab comes
 * back into view.
 *
 * A save made while signed out is not dropped. It is kept as an INTENT — what
 * the reader asked for, not a closure, because signing in leaves the page for
 * Apple or Google and comes back to a fresh one — in sessionStorage, which
 * survives that round trip in the same tab, and applied once the reader is
 * back and their Library has loaded.
 */

/* ── Session ─────────────────────────────────────────────────────────────── */

export interface Reader {
  id: string;
  email: string | null;
  name: string | null;
}

export type AuthState =
  | { status: "loading" }
  | { status: "signedOut" }
  | { status: "signedIn"; reader: Reader };

const LOADING: AuthState = { status: "loading" };
const SIGNED_OUT: AuthState = { status: "signedOut" };

function makeStore<T>(initial: T) {
  const listeners = new Set<() => void>();
  let value = initial;
  return {
    read: () => value,
    serverSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set(next: T) {
      if (Object.is(value, next)) return;
      value = next;
      listeners.forEach((l) => l());
    },
  };
}

export const authStore = makeStore<AuthState>(LOADING);

/** Whether the sign-in sheet is up. */
export const authSheetStore = makeStore(false);

function readerOf(session: Session): Reader {
  const meta = session.user.user_metadata ?? {};
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    name: (meta.full_name as string) || (meta.name as string) || null,
  };
}

/* ── Intents ─────────────────────────────────────────────────────────────── */

/*
 * Each says where the reader wants things to END UP, never "toggle". A toggle
 * replayed after sign-in would land on a Library that may already hold the
 * very card being saved — from another device — and unsave it.
 */
export type Intent =
  | { kind: "savePost"; id: number; on: boolean }
  | { kind: "saveVerses"; chapter: string; verses: number[]; on: boolean }
  | { kind: "highlight"; chapter: string; verses: number[]; colour: string | null };

const PENDING_KEY = "dafod.pendingIntent";

function applyIntent(intent: Intent) {
  switch (intent.kind) {
    case "savePost": {
      const next = { ...savedPostStore.read() };
      if (intent.on) next[intent.id] = true;
      else delete next[intent.id];
      savedPostStore.write(next);
      return;
    }
    case "saveVerses": {
      const all = savedVerseStore.read();
      const next: ChapterMap<true> = { ...(all[intent.chapter] ?? {}) };
      for (const n of intent.verses) {
        if (intent.on) next[n] = true;
        else delete next[n];
      }
      savedVerseStore.write({ ...all, [intent.chapter]: next });
      return;
    }
    case "highlight": {
      const all = highlightStore.read();
      const next: ChapterMap<string> = { ...(all[intent.chapter] ?? {}) };
      for (const n of intent.verses) {
        if (intent.colour) next[n] = intent.colour;
        else delete next[n];
      }
      highlightStore.write({ ...all, [intent.chapter]: next });
      return;
    }
  }
}

/**
 * Do it if the reader is signed in; otherwise hold it and ask them to sign in.
 * Returns whether it was done, so a caller can play its confirmation (the
 * bookmark's pop) only for a save that actually happened.
 */
export function gated(intent: Intent): boolean {
  if (authStore.read().status === "signedIn") {
    applyIntent(intent);
    return true;
  }
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify(intent));
  } catch {}
  authSheetStore.set(true);
  return false;
}

/** The reader dismissed the sheet: what they were about to save goes too. */
export function closeAuthSheet() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  authSheetStore.set(false);
}

function applyPending() {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
  if (!raw) return;
  try {
    applyIntent(JSON.parse(raw) as Intent);
  } catch {}
}

/* ── Signing in and out ──────────────────────────────────────────────────── */

export async function signIn(provider: "apple" | "google") {
  const sb = supabase();
  if (!sb) throw new Error("Sign-in is not configured.");
  // Back to the page they were on, so the save they tapped is applied where
  // they tapped it. The pending intent is already in sessionStorage.
  const redirectTo = window.location.origin + window.location.pathname + window.location.search;
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
  if (error) throw error;
}

export async function signOut() {
  await supabase()?.auth.signOut();
}

/* ── The Library row ─────────────────────────────────────────────────────── */

interface LibraryRow {
  saved_posts: Record<number, true>;
  saved_verses: ChapterStore<true>;
  highlights: ChapterStore<string>;
}

/*
 * Whose Library the local cache holds. Absent means the saves on this device
 * were made before accounts existed — those join whichever account signs in
 * first. A different id means someone else's, which is dropped rather than
 * merged into the new reader's.
 */
const OWNER_KEY = "dafod.libraryOwner";
/* Set from a local change until the server has it, so an offline save is
   pushed on the next load instead of being overwritten by the older row. */
const DIRTY_KEY = "dafod.libraryDirty";

let syncedFor: string | null = null;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function local(): LibraryRow {
  return {
    saved_posts: savedPostStore.read(),
    saved_verses: savedVerseStore.read(),
    highlights: highlightStore.read(),
  };
}

function writeLocal(row: LibraryRow) {
  applyingRemote = true;
  try {
    savedPostStore.write(row.saved_posts ?? EMPTY_POSTS);
    savedVerseStore.write(row.saved_verses ?? EMPTY_STORE);
    highlightStore.write(row.highlights ?? EMPTY_STORE);
  } finally {
    applyingRemote = false;
  }
}

function getItem(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function setItem(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
}

function mergeChapters<T>(a: ChapterStore<T>, b: ChapterStore<T>): ChapterStore<T> {
  const out: ChapterStore<T> = { ...a };
  for (const [chapter, verses] of Object.entries(b)) {
    out[chapter] = { ...(out[chapter] ?? {}), ...verses };
  }
  return out;
}

/* Union of both, the device winning where a verse has two colours: it holds
   what the reader did most recently on the screen in front of them. */
function merge(remote: LibraryRow, device: LibraryRow): LibraryRow {
  return {
    saved_posts: { ...remote.saved_posts, ...device.saved_posts },
    saved_verses: mergeChapters(remote.saved_verses, device.saved_verses),
    highlights: mergeChapters(remote.highlights, device.highlights),
  };
}

async function pull(id: string): Promise<LibraryRow | null | undefined> {
  const sb = supabase();
  if (!sb) return undefined;
  const { data, error } = await sb
    .from("library")
    .select("saved_posts, saved_verses, highlights")
    .eq("user_id", id)
    .maybeSingle();
  // undefined: could not reach it. null: reachable, and this reader has no row.
  if (error) return undefined;
  return (data as LibraryRow | null) ?? null;
}

async function push() {
  const sb = supabase();
  const id = syncedFor;
  if (!sb || !id) return;
  const { error } = await sb.from("library").upsert({ user_id: id, ...local() });
  if (!error && syncedFor === id) setItem(DIRTY_KEY, null);
}

function schedulePush() {
  if (applyingRemote || !syncedFor) return;
  setItem(DIRTY_KEY, "1");
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void push();
  }, 400);
}

async function startSync(id: string) {
  syncedFor = id;
  const remote = await pull(id);
  if (syncedFor !== id) return;
  if (remote === undefined) {
    // Offline or the server is down. Keep what is here; the next focus retries.
    syncedFor = null;
    return;
  }
  const owner = getItem(OWNER_KEY);
  const empty: LibraryRow = { saved_posts: {}, saved_verses: {}, highlights: {} };
  const server = remote ?? empty;
  let next: LibraryRow;
  let send = remote === null;
  if (owner === id) {
    const dirty = getItem(DIRTY_KEY) === "1";
    next = dirty ? local() : server;
    send ||= dirty;
  } else if (!owner) {
    next = merge(server, local());
    send = true;
  } else {
    next = server;
  }
  writeLocal(next);
  setItem(OWNER_KEY, id);
  if (send) await push();
  applyPending();
}

function stopSync() {
  syncedFor = null;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  writeLocal({ saved_posts: EMPTY_POSTS, saved_verses: EMPTY_STORE, highlights: EMPTY_STORE });
  setItem(OWNER_KEY, null);
  setItem(DIRTY_KEY, null);
}

/* ── Start-up ────────────────────────────────────────────────────────────── */

let started = false;

/** Once per page load, from AuthRoot in the root layout. */
export function startAuth() {
  if (started) return;
  started = true;
  const sb = supabase();
  if (!sb) {
    authStore.set(SIGNED_OUT);
    return;
  }

  for (const store of [savedPostStore, savedVerseStore, highlightStore]) {
    store.subscribe(schedulePush);
  }

  sb.auth.onAuthStateChange((event, session) => {
    // Supabase warns against awaiting its own calls inside this callback —
    // they wait on the lock the callback is holding. Deferred a tick instead.
    setTimeout(() => {
      if (!session) {
        authStore.set(SIGNED_OUT);
        // INITIAL_SESSION with nobody signed in is a visitor, whose
        // pre-accounts saves must survive to be merged; only a real sign-out
        // clears the cache.
        if (event === "SIGNED_OUT") stopSync();
        return;
      }
      const reader = readerOf(session);
      const current = authStore.read();
      if (current.status !== "signedIn" || current.reader.id !== reader.id) {
        authStore.set({ status: "signedIn", reader });
      }
      // The Google callback page (/auth/google) is only passed through: it
      // signs in and moves straight on to the page the reader came from. A
      // sync started there would apply the held save and then lose its push
      // to the navigation, so the page they return to does the sync instead.
      if (window.location.pathname.startsWith("/auth/")) return;
      // SIGNED_IN fires again on token refresh and tab refocus; one sync per
      // reader per page is enough, the focus handler covers the rest.
      if (syncedFor !== reader.id) {
        authSheetStore.set(false);
        void startSync(reader.id);
      }
    }, 0);
  });

  // Another device may have changed the Library while this tab was away.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const state = authStore.read();
    if (state.status !== "signedIn") return;
    // The first sync never reached the server: try it again from the top.
    if (syncedFor !== state.reader.id) {
      void startSync(state.reader.id);
      return;
    }
    if (getItem(DIRTY_KEY) === "1") {
      void push();
      return;
    }
    void pull(state.reader.id).then((remote) => {
      if (remote && syncedFor === state.reader.id && getItem(DIRTY_KEY) !== "1") writeLocal(remote);
    });
  });
}
