import Foundation
import UserNotifications

/// "Verse of the day" at 6am, the reader's own 6am, every day.
///
/// Local notifications, not push: the phone already knows which film each
/// date gets (FilmCatalog's schedule, else the rotation), so it books a
/// month of mornings itself, each naming that day's passage, and books them
/// again whenever the app comes to the front -- which also picks up any change
/// made to the schedule in Supabase since. Calendar triggers carry no time
/// zone, so 6:00 follows the phone wherever it goes. Someone who doesn't open
/// the app for a month stops hearing from it, rather than being nagged about
/// films that may since have changed.
enum VerseNotifications {
    private static let hour = 6
    private static let daysAhead = 30
    private static let prefix = "verse-of-the-day-"

    /// Asks once, the first time Home has a film to show. Declined, it never
    /// asks again; Settings > Notifications > Dafod turns it on later.
    static func requestPermissionIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        guard await center.notificationSettings().authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .sound])
    }

    /// Replaces the booked mornings with the next month's, from `film(on:)`.
    static func schedule(film: (Date) -> Post?) async {
        let center = UNUserNotificationCenter.current()
        let status = await center.notificationSettings().authorizationStatus
        guard status == .authorized || status == .provisional || status == .ephemeral else { return }

        let booked = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(prefix) }
        center.removePendingNotificationRequests(withIdentifiers: booked)

        let cal = Calendar.current, now = Date(), today = cal.startOfDay(for: now)
        for offset in 0..<daysAhead {
            guard let day = cal.date(byAdding: .day, value: offset, to: today),
                  let fire = cal.date(bySettingHour: hour, minute: 0, second: 0, of: day),
                  fire > now, let post = film(day) else { continue }
            let content = UNMutableNotificationContent()
            content.title = "Verse of the day"
            content.body = "\(post.title) is today's film. Tap to watch."
            content.sound = .default
            var when = cal.dateComponents([.year, .month, .day], from: day)
            when.hour = hour
            when.minute = 0
            let request = UNNotificationRequest(
                identifier: prefix + FilmCatalog.dayKey(day), content: content,
                trigger: UNCalendarNotificationTrigger(dateMatching: when, repeats: false))
            try? await center.add(request)
        }
    }
}
