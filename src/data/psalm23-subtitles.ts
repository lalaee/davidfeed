export interface Subtitle {
  id: number;
  startTime: number; // in seconds
  endTime: number;
  text: string;
}

// Psalm 23 NIV - Subtitles with accurate timing from audio transcription
export const psalm23Subtitles: Subtitle[] = [
  { id: 1, startTime: 0, endTime: 9, text: "Psalm 23" },
  { id: 2, startTime: 9, endTime: 14, text: "The Lord is my shepherd, I lack nothing." },
  { id: 3, startTime: 14, endTime: 17, text: "He makes me lie down in green pastures." },
  { id: 4, startTime: 17, endTime: 20, text: "He leads me beside quiet waters." },
  { id: 5, startTime: 20, endTime: 24, text: "He refreshes my soul." },
  { id: 6, startTime: 24, endTime: 29, text: "He guides me along the right paths for his name's sake." },
  { id: 7, startTime: 29, endTime: 34, text: "Even though I walk through the darkest valley, I will fear no evil." },
  { id: 8, startTime: 34, endTime: 37, text: "For you are with me." },
  { id: 9, startTime: 37, endTime: 42, text: "Your rod and your staff, they comfort me." },
  { id: 10, startTime: 42, endTime: 47, text: "You prepare a table before me in the presence of my enemies." },
  { id: 11, startTime: 47, endTime: 54, text: "You anoint my head with oil, my cup overflows." },
  { id: 12, startTime: 54, endTime: 62, text: "Surely, your goodness and love will follow me all the days of my life." },
  { id: 13, startTime: 62, endTime: 70, text: "And I will dwell in the house of the Lord forever." },
];
