import BibleReader from "@/components/BibleReader";
import { PSALM_46_PRIMARY, PSALM_46_TRANSLATIONS, psalm46Verses } from "@/data/psalm46";

export default function BiblePage() {
  return (
    <main className="h-[100dvh] bg-black">
      <BibleReader
        chapterTitle="Psalm 46"
        artworkSrc="/assets/feed-poster-frame.jpg"
        version={PSALM_46_PRIMARY.label}
        verses={psalm46Verses}
        translations={PSALM_46_TRANSLATIONS}
      />
    </main>
  );
}
