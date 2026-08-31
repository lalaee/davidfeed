/**
 * Psalm 46 in several translations, so the compare card can show the verses a
 * reader actually selected instead of one hard-coded sample.
 *
 * NIV is the default and NIV, NKJV and ASV are what the compare card lists,
 * matching the design. Licensing for NIV and NKJV is being handled separately.
 *
 * ⚠ NIV and NKJV here were TRANSCRIBED FROM MEMORY, not copied from a licensed
 * source. They read correctly and Psalm 46 is well known, but "reads correctly"
 * is not the standard for scripture in a devotional app — proofread both
 * against the official text before launch. WEB, KJV and ASV are public domain
 * and were already verifiable.
 *
 * WEB is kept because it is what the reader shipped until now: its wording was
 * displayed under an "NIV" pill, which it never was. KJV is kept alongside it.
 * Neither is listed in the compare card; both are here so the Versions button
 * has something real to offer once it does something.
 */
export interface Translation {
  id: string;
  label: string;
  /** Keyed by verse number. */
  verses: Record<number, string>;
}

/** ⚠ from memory — proofread against the licensed text. */
const NIV: Record<number, string> = {
  1: "God is our refuge and strength, an ever-present help in trouble.",
  2: "Therefore we will not fear, though the earth give way and the mountains fall into the heart of the sea,",
  3: "though its waters roar and foam and the mountains quake with their surging.",
  4: "There is a river whose streams make glad the city of God, the holy place where the Most High dwells.",
  5: "God is within her, she will not fall; God will help her at break of day.",
  6: "Nations are in uproar, kingdoms fall; he lifts his voice, the earth melts.",
  7: "The LORD Almighty is with us; the God of Jacob is our fortress.",
  8: "Come and see what the LORD has done, the desolations he has brought on the earth.",
  9: "He makes wars cease to the ends of the earth. He breaks the bow and shatters the spear; he burns the shields with fire.",
  10: "He says, \"Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth.\"",
  11: "The LORD Almighty is with us; the God of Jacob is our fortress.",
};

/** ⚠ from memory — proofread against the licensed text. */
const NKJV: Record<number, string> = {
  1: "God is our refuge and strength, A very present help in trouble.",
  2: "Therefore we will not fear, Even though the earth be removed, And though the mountains be carried into the midst of the sea;",
  3: "Though its waters roar and be troubled, Though the mountains shake with its swelling. Selah",
  4: "There is a river whose streams shall make glad the city of God, The holy place of the tabernacle of the Most High.",
  5: "God is in the midst of her, she shall not be moved; God shall help her, just at the break of dawn.",
  6: "The nations raged, the kingdoms were moved; He uttered His voice, the earth melted.",
  7: "The LORD of hosts is with us; The God of Jacob is our refuge. Selah",
  8: "Come, behold the works of the LORD, Who has made desolations in the earth.",
  9: "He makes wars cease to the end of the earth; He breaks the bow and cuts the spear in two; He burns the chariot in the fire.",
  10: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth!",
  11: "The LORD of hosts is with us; The God of Jacob is our refuge. Selah",
};

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

/** What the compare card lists, in the design's order. */
export const PSALM_46_TRANSLATIONS: Translation[] = [
  { id: "niv", label: "NIV", verses: NIV },
  { id: "nkjv", label: "NKJV", verses: NKJV },
  { id: "asv", label: "ASV", verses: ASV },
];

/** Carried but not listed — see the note at the top of this file. */
export const PSALM_46_ALSO_AVAILABLE: Translation[] = [
  { id: "web", label: "WEB", verses: WEB },
  { id: "kjv", label: "KJV", verses: KJV },
];

/** The translation the reader displays. */
export const PSALM_46_PRIMARY = PSALM_46_TRANSLATIONS[0];

export const psalm46Verses = Object.entries(PSALM_46_PRIMARY.verses).map(([number, text]) => ({
  number: Number(number),
  text,
}));
