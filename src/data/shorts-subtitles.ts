import type { Subtitle } from "./psalm23-subtitles";

/*
 * Captions for the Shorts narrations, force-aligned to the audio.
 *
 * The shorts play their own recordings (public/assets/shorts), not slices of
 * the chapter mp3s. Those are separate, slower readings — cross-correlating a
 * clip against its chapter peaks at only 0.28-0.44 — so the chapter caption
 * timings do not transfer by any offset and had to be rebuilt.
 *
 * Built by whisper.cpp (ggml-base.en) for word timings, then Needleman-Wunsch
 * alignment of the KNOWN verse text onto those words. Only the timestamps come
 * from the transcript; the wording is still the NIV text from
 * chapter-subtitles.ts, so ASR mistakes cannot reach the screen. Word match was
 * 97-100% per clip.
 *
 * Each clip opens with a spoken reference ("Psalm 23, verse 1 to 3") and a
 * ~1s gap, which is why the first caption starts around 3-5s rather than 0.
 *
 * Regenerate with scripts/align-shorts.py when the audio changes.
 */

export const shortSubtitles: Record<string, Subtitle[]> = {
  // psalm23-v1-3.mp3 — 16.76s, 7 captions
  psalm23: [
    { id: 1, startTime: 3.06, endTime: 5.21, text: "The LORD is my shepherd," },
    { id: 2, startTime: 5.21, endTime: 6.62, text: "I lack nothing." },
    { id: 3, startTime: 6.62, endTime: 8.98, text: "He makes me lie down in green pastures," },
    { id: 4, startTime: 8.98, endTime: 10.94, text: "he leads me beside quiet waters," },
    { id: 5, startTime: 10.94, endTime: 12.4, text: "he refreshes my soul." },
    { id: 6, startTime: 12.4, endTime: 15.45, text: "He guides me along the right paths for" },
    { id: 7, startTime: 15.45, endTime: 16.48, text: "his name's sake." },
  ],
  // psalm27-v1.mp3 — 14.86s, 4 captions
  psalm27: [
    { id: 1, startTime: 4.0, endTime: 8.04, text: "The LORD is my light and my salvation—" },
    { id: 2, startTime: 8.04, endTime: 10.36, text: "whom shall I fear?" },
    { id: 3, startTime: 10.36, endTime: 12.73, text: "The LORD is the stronghold of my life—" },
    { id: 4, startTime: 12.73, endTime: 14.68, text: "of whom shall I be afraid?" },
  ],
  // psalm91-v4.mp3 — 11.19s, 3 captions
  psalm91: [
    { id: 1, startTime: 3.34, endTime: 5.6, text: "He will cover you with his feathers," },
    { id: 2, startTime: 5.6, endTime: 8.42, text: "and under his wings you will find refuge;" },
    { id: 3, startTime: 8.42, endTime: 11.02, text: "his faithfulness will be your shield and rampart." },
  ],
  // psalm5-v1-3.mp3 — 20.11s, 9 captions
  psalm5: [
    { id: 1, startTime: 3.67, endTime: 4.74, text: "Listen to my words," },
    { id: 2, startTime: 4.74, endTime: 7.56, text: "LORD, consider my lament." },
    { id: 3, startTime: 7.56, endTime: 9.04, text: "Hear my cry for help," },
    { id: 4, startTime: 9.04, endTime: 11.03, text: "my King and my God," },
    { id: 5, startTime: 11.03, endTime: 13.08, text: "for to you I pray." },
    { id: 6, startTime: 13.08, endTime: 14.77, text: "In the morning, LORD," },
    { id: 7, startTime: 14.77, endTime: 16.2, text: "you hear my voice;" },
    { id: 8, startTime: 16.2, endTime: 18.3, text: "in the morning I lay my requests before" },
    { id: 9, startTime: 18.3, endTime: 19.92, text: "you and wait expectantly." },
  ],
  // psalm7-v1-2.mp3 — 16.72s, 5 captions
  psalm7: [
    { id: 1, startTime: 3.92, endTime: 8.48, text: "LORD my God, I take refuge in you;" },
    { id: 2, startTime: 8.48, endTime: 11.39, text: "save and deliver me from all who pursue me," },
    { id: 3, startTime: 11.39, endTime: 13.32, text: "or they will tear me apart like a" },
    { id: 4, startTime: 13.32, endTime: 15.72, text: "lion and rip me to pieces with no" },
    { id: 5, startTime: 15.72, endTime: 16.48, text: "one to rescue me." },
  ],
  // psalm16-v11.mp3 — 12.17s, 3 captions
  psalm16: [
    { id: 1, startTime: 4.72, endTime: 6.12, text: "You make known to me the path of" },
    { id: 2, startTime: 6.12, endTime: 8.8, text: "life; you will fill me with joy in" },
    { id: 3, startTime: 8.8, endTime: 11.92, text: "your presence, with eternal pleasures at your right hand." },
  ],
  // psalm20-v7-8.mp3 — 16.81s, 4 captions
  psalm20: [
    { id: 1, startTime: 5.29, endTime: 8.47, text: "Some trust in chariots and some in horses," },
    { id: 2, startTime: 8.47, endTime: 12.04, text: "but we trust in the name of the LORD our God." },
    { id: 3, startTime: 12.04, endTime: 14.6, text: "They are brought to their knees and fall," },
    { id: 4, startTime: 14.6, endTime: 16.6, text: "but we rise up and stand firm." },
  ],
  // psalm25-v4-5.mp3 — 15.98s, 5 captions
  psalm25: [
    { id: 1, startTime: 4.19, endTime: 5.83, text: "Show me your ways," },
    { id: 2, startTime: 5.83, endTime: 8.72, text: "LORD, teach me your paths." },
    { id: 3, startTime: 8.72, endTime: 10.84, text: "Guide me in your truth and teach me," },
    { id: 4, startTime: 10.84, endTime: 12.87, text: "for you are God my Savior," },
    { id: 5, startTime: 12.87, endTime: 15.76, text: "and my hope is in you all day long." },
  ],
  // psalm3-v1-3.mp3 — 20.43s, 6 captions
  psalm3: [
    { id: 1, startTime: 3.64, endTime: 8.2, text: "Lord, how many are my foes!" },
    { id: 2, startTime: 8.2, endTime: 10.88, text: "How many rise up against me!" },
    { id: 3, startTime: 10.88, endTime: 12.35, text: "Many are saying of me," },
    { id: 4, startTime: 12.35, endTime: 14.36, text: "\"God will not deliver him.\"" },
    { id: 5, startTime: 14.36, endTime: 17.26, text: "But you, Lord, are a shield around me," },
    { id: 6, startTime: 17.26, endTime: 20.2, text: "my glory, the One who lifts my head high." },
  ],
  // psalm45-v6-8.mp3 — 31.90s, 11 captions
  psalm45: [
    { id: 1, startTime: 3.6, endTime: 4.86, text: "Your throne, O God," },
    { id: 2, startTime: 4.86, endTime: 7.2, text: "will last for ever and ever;" },
    { id: 3, startTime: 7.2, endTime: 10.21, text: "a scepter of justice will be the scepter" },
    { id: 4, startTime: 10.21, endTime: 12.06, text: "of your kingdom." },
    { id: 5, startTime: 12.06, endTime: 15.13, text: "You love righteousness and hate wickedness;" },
    { id: 6, startTime: 15.13, endTime: 16.94, text: "therefore God, your God," },
    { id: 7, startTime: 16.94, endTime: 20.48, text: "has set you above your companions by anointing" },
    { id: 8, startTime: 20.48, endTime: 22.14, text: "you with the oil of joy." },
    { id: 9, startTime: 22.14, endTime: 25.3, text: "All your robes are fragrant with myrrh and" },
    { id: 10, startTime: 25.3, endTime: 29.51, text: "aloes and cassia; from palaces adorned with ivory" },
    { id: 11, startTime: 29.51, endTime: 31.68, text: "the music of the strings makes you glad." },
  ],
  // psalm44-v25-26.mp3 — 16.39s, 4 captions
  psalm44: [
    { id: 1, startTime: 5.55, endTime: 7.97, text: "We are brought down to the dust;" },
    { id: 2, startTime: 7.97, endTime: 11.16, text: "our bodies cling to the ground." },
    { id: 3, startTime: 11.16, endTime: 13.28, text: "Rise up and help us;" },
    { id: 4, startTime: 13.28, endTime: 16.16, text: "rescue us because of your unfailing love." },
  ],
  // psalm51-v10-12.mp3 — 22.24s, 7 captions
  psalm51: [
    { id: 1, startTime: 3.85, endTime: 6.53, text: "Create in me a pure heart," },
    { id: 2, startTime: 6.53, endTime: 10.84, text: "O God, and renew a steadfast spirit within me." },
    { id: 3, startTime: 10.84, endTime: 13.62, text: "Do not cast me from your presence or" },
    { id: 4, startTime: 13.62, endTime: 16.08, text: "take your Holy Spirit from me." },
    { id: 5, startTime: 16.08, endTime: 18.77, text: "Restore to me the joy of your salvation" },
    { id: 6, startTime: 18.77, endTime: 20.8, text: "and grant me a willing spirit," },
    { id: 7, startTime: 20.8, endTime: 22.04, text: "to sustain me." },
  ],
  // psalm4-v6-8.mp3 — 23.64s, 8 captions
  psalm4: [
    { id: 1, startTime: 5.33, endTime: 6.52, text: "Many, Lord, are asking," },
    { id: 2, startTime: 6.52, endTime: 9.64, text: "\"Who will bring us prosperity?\" Let the light" },
    { id: 3, startTime: 9.64, endTime: 11.62, text: "of your face shine on us." },
    { id: 4, startTime: 11.62, endTime: 14.62, text: "Fill my heart with joy when their grain" },
    { id: 5, startTime: 14.62, endTime: 16.9, text: "and new wine abound." },
    { id: 6, startTime: 16.9, endTime: 19.6, text: "In peace I will lie down and sleep," },
    { id: 7, startTime: 19.6, endTime: 21.31, text: "for you alone, Lord," },
    { id: 8, startTime: 21.31, endTime: 23.4, text: "make me dwell in safety." },
  ],
};
