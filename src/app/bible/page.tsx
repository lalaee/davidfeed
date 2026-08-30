import BibleReader from "@/components/BibleReader";

// Psalm 46 verses
const psalm46Verses = [
  {
    number: 1,
    text: "God is our refuge and strength, a very present help in trouble.",
  },
  {
    number: 2,
    text: "Therefore we won't be afraid, though the earth changes, though the mountains are shaken into the heart of the seas;",
  },
  {
    number: 3,
    text: "Though its waters roar and foam and the mountains quake with their surging.",
  },
  {
    number: 4,
    text: "There is a river, the streams of which make the city of God glad, the holy place of the tents of the Most High.",
  },
  {
    number: 5,
    text: "God is in the middle of her. She shall not be moved. God will help her at dawn.",
  },
  {
    number: 6,
    text: "The nations raged. The kingdoms were moved. He lifted his voice and the earth melted.",
  },
  {
    number: 7,
    text: "The LORD of Hosts is with us. The God of Jacob is our refuge.",
  },
  {
    number: 8,
    text: "Come, see the LORD's works, what desolations he has made in the earth.",
  },
  {
    number: 9,
    text: "He makes wars cease to the end of the earth. He breaks the bow, and shatters the spear. He burns the chariots in the fire.",
  },
  {
    number: 10,
    text: "\"Be still, and know that I am God. I will be exalted among the nations. I will be exalted in the earth.\"",
  },
  {
    number: 11,
    text: "The LORD of Hosts is with us. The God of Jacob is our refuge.",
  },
];

export default function BiblePage() {
  return (
    <main className="h-[100dvh] bg-black">
      <BibleReader
        chapterTitle="Psalm 46"
        artworkSrc="/assets/feed-poster-frame.jpg"
        version="NIV"
        verses={psalm46Verses}
      />
    </main>
  );
}
