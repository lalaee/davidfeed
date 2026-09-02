import type { CoverEffect } from "@/components/FeedItem";
import { psalm91Subtitles, type Subtitle } from "@/data/psalm91-subtitles";
import { chapterSubtitles } from "@/data/chapter-subtitles";

export interface Post {
  id: number;
  title: string;
  backgroundImage: string;
  videoSrc?: string;
  posterVideoSrc?: string;
  audioSrc?: string;
  subtitles?: Subtitle[];
  effect?: CoverEffect;
  /**
   * Seconds of silence at the head of the narration, measured off the file.
   * The card seeks here on entry and loops back here, so the reader is audible
   * as soon as the artwork lands. Captions are absolute-timed and all begin
   * well after this point, so they are unaffected.
   */
  startAt?: number;
}

// ARTWORK NO LONGER MATCHES ITS FILENAME. The covers were reassigned to the
// verses each card actually speaks, so e.g. Psalm 20 — "some trust in chariots
// and some in horses" — now uses psalm3.jpg, which is the horse photograph.
// Seven cards moved, in two cycles: 3 -> 20 -> 44 -> 3, and 27 -> 16 -> 7 -> 5
// -> 27. Nothing was renamed on disk, because renaming would touch 14 assets
// and the shorts feed that reads through this file; the paths here are the
// single source of truth for which cover belongs to which psalm.
//
// The audio and subtitles were NOT moved. They belong to the psalm, not to the
// picture.
//
// Psalms 5 and 7 now carry NEW paintings rather than reassigned ones, because
// no image in the original set served them: 5 needs morning prayer and "will
// look up", 7 needs pursuit, and the pool held neither. Both carry no
// posterVideoSrc — their parallax loops have not been rendered yet, and
// pointing at the old loop would animate a different picture than the still
// shows. Run the cover-parallax skill to generate them.
//
// The hero is the sheep footage, and it now carries Psalm 23 — "The LORD is my
// shepherd" over grazing sheep. That makes the deer-in-shrubs cover redundant as
// a separate Psalm 23 card, so it is gone; Psalm 7 is now its only user.
// Psalm 91 becomes an ordinary chapter card with its own artwork.
//
// Every other chapter carries a depth-parallax loop generated from its own cover
// (Depth Anything V2 -> displacement along a closed elliptical camera path). The
// still stays as the fallback beneath and shows until the video decodes.
export const chapterPosts: Post[] = [
  {
    id: 23,
    title: "Psalm 23",
    backgroundImage: "/assets/feed-poster-frame.jpg",
    videoSrc: "/assets/feed-video.mp4",
    posterVideoSrc: "/assets/feed-poster-video-loop.mp4",
    audioSrc: "/assets/chapters/psalm23.mp3",
    startAt: 0.28,
    subtitles: chapterSubtitles.psalm23,
  },
  { id: 27, title: "Psalm 27", backgroundImage: "/assets/chapters/psalm5.jpg", posterVideoSrc: "/assets/chapters/psalm5-loop.mp4", audioSrc: "/assets/chapters/psalm27.mp3", subtitles: chapterSubtitles.psalm27 },
  { id: 91, title: "Psalm 91", backgroundImage: "/assets/chapters/psalm91.jpg", posterVideoSrc: "/assets/chapters/psalm91-loop.mp4", audioSrc: "/assets/psalm91.mp3", subtitles: psalm91Subtitles },
  { id: 5,  title: "Psalm 5",  backgroundImage: "/assets/chapters/figure-looking-up.jpg",  audioSrc: "/assets/chapters/psalm5.mp3", subtitles: chapterSubtitles.psalm5  },
  { id: 7,  title: "Psalm 7",  backgroundImage: "/assets/chapters/figure-running-rain.jpg",  audioSrc: "/assets/chapters/psalm7.mp3", startAt: 0.27, subtitles: chapterSubtitles.psalm7  },
  { id: 16, title: "Psalm 16", backgroundImage: "/assets/chapters/psalm27.jpg", posterVideoSrc: "/assets/chapters/psalm27-loop.mp4", audioSrc: "/assets/chapters/psalm16.mp3", startAt: 1.27, subtitles: chapterSubtitles.psalm16 },
  { id: 20, title: "Psalm 20", backgroundImage: "/assets/chapters/psalm3.jpg", posterVideoSrc: "/assets/chapters/psalm3-loop.mp4", audioSrc: "/assets/chapters/psalm20.mp3", subtitles: chapterSubtitles.psalm20 },
  { id: 25, title: "Psalm 25", backgroundImage: "/assets/chapters/psalm25.jpg", posterVideoSrc: "/assets/chapters/psalm25-loop.mp4", audioSrc: "/assets/chapters/psalm25.mp3", startAt: 1.02, subtitles: chapterSubtitles.psalm25 },
  { id: 3,  title: "Psalm 3",  backgroundImage: "/assets/chapters/psalm44.jpg",  posterVideoSrc: "/assets/chapters/psalm44-loop.mp4",  audioSrc: "/assets/chapters/psalm3.mp3", subtitles: chapterSubtitles.psalm3  },
  { id: 45, title: "Psalm 45", backgroundImage: "/assets/chapters/psalm45.jpg", posterVideoSrc: "/assets/chapters/psalm45-loop.mp4", audioSrc: "/assets/chapters/psalm45.mp3", subtitles: chapterSubtitles.psalm45 },
  { id: 44, title: "Psalm 44", backgroundImage: "/assets/chapters/psalm20.jpg", posterVideoSrc: "/assets/chapters/psalm20-loop.mp4", audioSrc: "/assets/chapters/psalm44.mp3", subtitles: chapterSubtitles.psalm44 },
  { id: 51, title: "Psalm 51", backgroundImage: "/assets/chapters/psalm51.jpg", posterVideoSrc: "/assets/chapters/psalm51-loop.mp4", audioSrc: "/assets/chapters/psalm51.mp3", subtitles: chapterSubtitles.psalm51 },
  { id: 4,  title: "Psalm 4",  backgroundImage: "/assets/chapters/psalm4.jpg",  posterVideoSrc: "/assets/chapters/psalm4-loop.mp4",  audioSrc: "/assets/chapters/psalm4.mp3", startAt: 1.07, subtitles: chapterSubtitles.psalm4  },
];
