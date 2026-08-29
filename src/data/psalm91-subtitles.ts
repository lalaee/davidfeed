export interface Subtitle {
  id: number;
  startTime: number; // in seconds
  endTime: number;
  text: string;
}

// Psalm 91 (NIV, licensed). Timing derived from ElevenLabs audio alignment.
// Audio total duration: 101.29s. Voice: rdqhHSd4FCx7W1tinWlb, model: eleven_multilingual_v2.
//
// Split into PHRASES to match the twelve dafod chapters. Unlike those, this
// track has no per-word timings, so each verse is broken at clause boundaries
// and its span divided in proportion to character count — speech rate is close
// enough to uniform for that to track the reader well.
export const psalm91Subtitles: Subtitle[] = [
  { id: 1, startTime: 0.0, endTime: 2.52, text: "Psalm 91" },
  { id: 2, startTime: 2.52, endTime: 5.296, text: "Whoever dwells in the shelter of the Most High" },
  { id: 3, startTime: 5.296, endTime: 7.71, text: "will rest in the shadow of the Almighty." },
  { id: 4, startTime: 7.71, endTime: 9.736, text: "I will say of the LORD," },
  { id: 5, startTime: 9.736, endTime: 13.435, text: "\"He is my refuge and my fortress, my God," },
  { id: 6, startTime: 13.435, endTime: 15.02, text: "in whom I trust.\"" },
  { id: 7, startTime: 15.02, endTime: 17.732, text: "Surely he will save you from the fowler's" },
  { id: 8, startTime: 17.732, endTime: 20.18, text: "snare and from the deadly pestilence." },
  { id: 9, startTime: 20.18, endTime: 22.504, text: "He will cover you with his feathers," },
  { id: 10, startTime: 22.504, endTime: 25.15, text: "and under his wings you will find refuge;" },
  { id: 11, startTime: 25.15, endTime: 29.19, text: "his faithfulness will be your shield and rampart." },
  { id: 12, startTime: 29.19, endTime: 32.002, text: "You will not fear the terror of night," },
  { id: 13, startTime: 32.002, endTime: 34.37, text: "nor the arrow that flies by day," },
  { id: 14, startTime: 34.37, endTime: 37.818, text: "nor the pestilence that stalks in the darkness," },
  { id: 15, startTime: 37.818, endTime: 40.68, text: "nor the plague that destroys at midday." },
  { id: 16, startTime: 40.68, endTime: 42.955, text: "A thousand may fall at your side," },
  { id: 17, startTime: 42.955, endTime: 45.161, text: "ten thousand at your right hand," },
  { id: 18, startTime: 45.161, endTime: 47.23, text: "but it will not come near you." },
  { id: 19, startTime: 47.23, endTime: 50.503, text: "You will only observe with your eyes and see" },
  { id: 20, startTime: 50.503, endTime: 52.66, text: "the punishment of the wicked." },
  { id: 21, startTime: 52.66, endTime: 53.41, text: "If you say," },
  { id: 22, startTime: 53.41, endTime: 57.98, text: "\"The LORD is my refuge,\" and you make the Most High your dwelling," },
  { id: 23, startTime: 57.98, endTime: 60.031, text: "no harm will overtake you," },
  { id: 24, startTime: 60.031, endTime: 62.95, text: "no disaster will come near your tent." },
  { id: 25, startTime: 62.95, endTime: 65.896, text: "For he will command his angels concerning you" },
  { id: 26, startTime: 65.896, endTime: 67.86, text: "to guard you in all your ways;" },
  { id: 27, startTime: 67.86, endTime: 70.186, text: "they will lift you up in their hands," },
  { id: 28, startTime: 70.186, endTime: 73.58, text: "so that you will not strike your foot against a stone." },
  { id: 29, startTime: 73.58, endTime: 76.349, text: "You will tread on the lion and the cobra;" },
  { id: 30, startTime: 76.349, endTime: 79.59, text: "you will trample the great lion and the serpent." },
  { id: 31, startTime: 79.59, endTime: 82.761, text: "\"Because he loves me,\" says the LORD," },
  { id: 32, startTime: 82.761, endTime: 86.013, text: "\"I will rescue him; I will protect him," },
  { id: 33, startTime: 86.013, endTime: 88.29, text: "for he acknowledges my name." },
  { id: 34, startTime: 88.29, endTime: 91.374, text: "He will call on me, and I will answer him;" },
  { id: 35, startTime: 91.374, endTime: 93.577, text: "I will be with him in trouble," },
  { id: 36, startTime: 93.577, endTime: 96.0, text: "I will deliver him and honor him." },
  { id: 37, startTime: 96.0, endTime: 99.642, text: "With long life I will satisfy him and show" },
  { id: 38, startTime: 99.642, endTime: 101.29, text: "him my salvation.\"" },
];
