# App Review notes — paste into App Store Connect › App Review Information › Notes

Keep this in step with the app. Guideline 2.1 wants a way in for the reviewer;
2.3.1 wants every feature described specifically.

---

Dafod is a feed of short animated Bible films (each with its own narration,
score and burned-in captions) and a Bible reader (NIV, NKJV, NLT, KJV, ASV,
WEB).

NO ACCOUNT IS NEEDED to watch the films or read the Bible. An optional account
keeps saved films and highlighted verses in sync between the app and
dafod.app.

SIGNING IN: tap the bookmark on any film, or open the You tab, and choose
Continue with Apple (any Apple ID works) or Continue with Google. There is no
email/password account to share; Sign in with Apple gives the reviewer full
access. [If you add a dedicated review account, put its details here.]

WHERE THINGS ARE
- Home: the films. Swipe up for the next one. Tap to mute or unmute.
  Bookmark saves a film (asks to sign in first). Share sends the film.
- Bible: the reader. Tap a verse to highlight it (asks to sign in first),
  compare translations or share it.
- You: signed out, the sign-in prompt with links to Privacy and Terms. Signed
  in, Account: Saved (films and highlights), Privacy, Terms, Delete account,
  Sign out.

ACCOUNT DELETION (5.1.1(v)): You › Delete account › Delete account. It deletes
the account and everything saved to it immediately, on every device. For an
account created with Sign in with Apple, the reader confirms with Apple and the
app's Sign in with Apple authorization is revoked through Apple's REST API
before the account is deleted.

BACKGROUND AUDIO: the films carry their narration and music; playback
continues when the screen locks, and the lock screen shows the film and
next/previous controls. This is the reason for UIBackgroundModes: audio.

PERMISSIONS: the only one is "add to Photos", asked by the system if the
reader picks Save Video in the share sheet. No location, camera, microphone,
contacts, notifications or tracking.

NO purchases, subscriptions, ads, tracking, or user-generated content (readers
cannot post or message anything).

CONTENT: the films are Dafod's own, made for the app. Scripture in the films is
the NIV, quoted with Biblica's permission notice (dafod.app/terms). In the reader,
NIV, NKJV and NLT are licensed from API.Bible (American Bible Society) and
fetched from dafod.app, each chapter shown with its publisher's copyright
notice; they need a connection. KJV, ASV and WEB are public domain and bundled,
so they work offline.

Privacy: https://www.dafod.app/privacy   Terms: https://www.dafod.app/terms
Contact: lakesofmotion@gmail.com
