import Foundation
import UserNotifications

/// "Verse of the day" at 6am, the reader's own 6am, every day.
///
/// Local notifications, not push: the phone already knows which dates have
/// a film (FilmCatalog's schedule, else the rotation), so it books a month of
/// mornings itself and books them again whenever the app comes to the front.
/// The notification doesn't name the passage -- "Your verse of the day is
/// here", then "Tap to watch." -- so the film is what the tap opens. Calendar triggers carry no time
/// zone, so 6:00 follows the phone wherever it goes. Someone who doesn't open
/// the app for a month stops hearing from it, rather than being nagged about
/// films that may since have changed.
enum VerseNotifications {
    private static let hour = 6
    private static let daysAhead = 30
    private static let prefix = "verse-of-the-day-"
    /// The notification's words, shown as they are in NotificationOfferSheet.
    static let title = "Your verse of the day is here"
    static let body = "Tap to watch."

    /// Whether to offer the 6am notification now. Not on a first launch: the
    /// offer (NotificationOfferSheet) waits until someone has watched the day's
    /// film through, so it names something they have just seen. Only while
    /// the system has never asked -- its prompt comes once in an app's life,
    /// and spending it on someone who would say no loses them for good.
    /// "Not now" puts it off three days, and after three offers it stops;
    /// Settings > Notifications > Dafod still turns it on.
    static func shouldOffer(now: Date = Date()) async -> Bool {
        let d = UserDefaults.standard
        guard d.integer(forKey: offersKey) < maxOffers else { return false }
        if let last = d.object(forKey: offeredAtKey) as? Date,
           now.timeIntervalSince(last) < snooze { return false }
        return await UNUserNotificationCenter.current().notificationSettings().authorizationStatus == .notDetermined
    }

    /// The offer was shown.
    static func didOffer(now: Date = Date()) {
        let d = UserDefaults.standard
        d.set(now, forKey: offeredAtKey)
        d.set(d.integer(forKey: offersKey) + 1, forKey: offersKey)
    }

    /// The system's own prompt, after the reader said yes to the offer.
    /// Whether they then allowed it.
    static func requestPermission() async -> Bool {
        (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound])) ?? false
    }

    private static let offersKey = "notificationOffers"
    private static let offeredAtKey = "notificationOfferedAt"
    private static let maxOffers = 3
    private static let snooze: TimeInterval = 3 * 24 * 60 * 60

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
                  fire > now, film(day) != nil else { continue }
            let content = UNMutableNotificationContent()
            content.title = Self.title
            // Not the passage: the film is the surprise the tap opens.
            content.body = Self.body
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
