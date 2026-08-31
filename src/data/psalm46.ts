/**
 * Psalm 46 in three translations, so the compare card can show the verses a
 * reader actually selected instead of one hard-coded sample.
 *
 * All three are public domain. That is not an aesthetic choice — the compare
 * card's design names NIV and NKJV, and both are licensed texts that cannot be
 * reproduced here from memory without risking a misquotation. Scripture that is
 * subtly wrong is worse than scripture that is absent, so the app ships
 * translations that can be rendered exactly:
 *
 *   WEB  World English Bible — public domain
 *   KJV  King James Version — public domain
 *   ASV  American Standard Version — public domain
 *
 * WEB is the text the reader itself has always displayed. It was labelled
 * "NIV" in the page, which it is not: NIV 46:2 reads "though the earth give
 * way", NIV 46:5 "God is within her, she will not fall". The wording shipped
 * here is WEB's, so the label now says so.
 *
 * Swap in licensed texts by replacing a block's verses and label; nothing else
 * needs to change.
 */
export interface Translation {
  id: string;
  label: string;
  /** Keyed by verse number. */
  verses: Record<number, string>;
}

const WEB: Record<number, string> = {
  1: "God is our refuge and strength, a very present help in trouble.",
  2: "Therefore we won't be afraid, though the earth changes, though the mountains are shaken into the heart of the seas;",
  3: "Though its waters roar and foam and the mountains quake with their surging.",
  4: "There is a river, the streams of which make the city of God glad, the holy place of the tents of the Most High.",
  5: "God is in the middle of her. She shall not be moved. God will help her at dawn.",
  6: "The nations raged. The kingdoms were moved. He lifted his voice and the earth melted.",
  7: "The LORD of Hosts is with us. The God of Jacob is our refuge.",
  8: "Come, see the LORD's works, what desolations he has made in the earth.",
  9: "He makes wars cease to the end of the earth. He breaks the bow, and shatters the spear. He burns the chariots in the fire.",
  10: "\"Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.\"",
  11: "The LORD of Hosts is with us. The God of Jacob is our refuge.",
};

const KJV: Record<number, string> = {
  1: "God is our refuge and strength, a very present help in trouble.",
  2: "Therefore will not we fear, though the earth be removed, and though the mountains be carried into the midst of the sea;",
  3: "Though the waters thereof roar and be troubled, though the mountains shake with the swelling thereof. Selah.",
  4: "There is a river, the streams whereof shall make glad the city of God, the holy place of the tabernacles of the most High.",
  5: "God is in the midst of her; she shall not be moved: God shall help her, and that right early.",
  6: "The heathen raged, the kingdoms were moved: he uttered his voice, the earth melted.",
  7: "The LORD of hosts is with us; the God of Jacob is our refuge. Selah.",
  8: "Come, behold the works of the LORD, what desolations he hath made in the earth.",
  9: "He maketh wars to cease unto the end of the earth; he breaketh the bow, and cutteth the spear in sunder; he burneth the chariot in the fire.",
  10: "Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.",
  11: "The LORD of hosts is with us; the God of Jacob is our refuge. Selah.",
};

const ASV: Record<number, string> = {
  1: "God is our refuge and strength, A very present help in trouble.",
  2: "Therefore will we not fear, though the earth do change, And though the mountains be shaken into the heart of the seas;",
  3: "Though the waters thereof roar and be troubled, Though the mountains tremble with the swelling thereof. Selah",
  4: "There is a river, the streams whereof make glad the city of God, The holy place of the tabernacles of the Most High.",
  5: "God is in the midst of her; she shall not be moved: God will help her, and that right early.",
  6: "The nations raged, the kingdoms were moved: He uttered his voice, the earth melted.",
  7: "Jehovah of hosts is with us; The God of Jacob is our refuge. Selah",
  8: "Come, behold the works of Jehovah, What desolations he hath made in the earth.",
  9: "He maketh wars to cease unto the end of the earth; He breaketh the bow, and cutteth the spear in sunder; He burneth the chariots in the fire.",
  10: "Be still, and know that I am God: I will be exalted among the nations, I will be exalted in the earth.",
  11: "Jehovah of hosts is with us; The God of Jacob is our refuge. Selah",
};

export const PSALM_46_TRANSLATIONS: Translation[] = [
  { id: "web", label: "WEB", verses: WEB },
  { id: "kjv", label: "KJV", verses: KJV },
  { id: "asv", label: "ASV", verses: ASV },
];

/** The translation the reader displays. */
export const PSALM_46_PRIMARY = PSALM_46_TRANSLATIONS[0];

export const psalm46Verses = Object.entries(WEB).map(([number, text]) => ({
  number: Number(number),
  text,
}));
