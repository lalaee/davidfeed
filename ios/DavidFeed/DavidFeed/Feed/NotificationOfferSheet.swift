import SwiftUI

/// What the 6am notification brings, offered before the system asks.
///
/// iOS lets an app show its notification prompt once, ever; a reader who
/// says no to a bare "Dafod would like to send you notifications" on a first
/// launch is lost to it. So Home waits until the day's film has played
/// through (VerseNotifications.shouldOffer), then shows this: the
/// notification itself as it will arrive, and what it
/// is for. "Turn on notifications" raises the system prompt; "Not now" puts
/// the offer off. The sign-in sheet's look (SignInSheet): its surface, its
/// type, the Share pill's blue for the yes.
struct NotificationOfferSheet: View {
    let onAccept: () -> Void
    let onDecline: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            preview

            Text("Start tomorrow with hope")
                .font(.system(size: 28, weight: .bold))
                .tracking(-0.6)
                .foregroundStyle(DF.ink)
                .padding(.top, 28)
            Text("Wake up to a new verse tomorrow morning. One notification a day, nothing else.")
                .font(.system(size: 17))
                .foregroundStyle(DF.ink.opacity(0.7))
                .fixedSize(horizontal: false, vertical: true)
                .padding(.top, 8)

            Button(action: onAccept) {
                Text("Turn on notifications")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Color.black)
                    .frame(maxWidth: .infinity, minHeight: 54)
                    .background(Color(hex: "#8CE4FF"), in: .capsule)
                    .contentShape(.capsule)
            }
            .buttonStyle(.plain)
            .padding(.top, 28)

            Button(action: onDecline) {
                Text("Not now")
                    .font(.system(size: 17, weight: .medium))
                    .foregroundStyle(DF.ink.opacity(0.7))
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .padding(.top, 8)
        }
        .padding(.horizontal, 24)
        .padding(.top, 32)
        .padding(.bottom, 12)
        .frame(maxHeight: .infinity, alignment: .top)
        .presentationDetents([.height(430)])
        .presentationDragIndicator(.visible)
        .presentationBackground(DF.surface)
    }

    /// The notification as it will look on the lock screen: the words
    /// VerseNotifications.schedule books, under the app's icon and name.
    private var preview: some View {
        HStack(alignment: .top, spacing: 12) {
            // The app icon, as a plain image: an app icon set can't be drawn
            // with Image, so DafodIcon is the same art at 38pt.
            Image("DafodIcon")
                .resizable()
                .frame(width: 38, height: 38)
            .clipShape(.rect(cornerRadius: 9, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline) {
                    Text(VerseNotifications.title)
                        .font(.system(size: 15, weight: .semibold))
                    Spacer(minLength: 8)
                    Text("6:00")
                        .font(.system(size: 13))
                        .foregroundStyle(DF.ink.opacity(0.55))
                }
                Text(VerseNotifications.body)
                    .font(.system(size: 15))
                    .fixedSize(horizontal: false, vertical: true)
            }
            .foregroundStyle(DF.ink)
        }
        .padding(14)
        .background(DF.surfaceRaised, in: .rect(cornerRadius: 22, style: .continuous))
        .accessibilityElement(children: .combine)
    }
}
