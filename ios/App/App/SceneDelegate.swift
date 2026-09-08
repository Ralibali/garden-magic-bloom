import UIKit
import Capacitor
import UserNotifications

// UIKit can deliver a cold-start response through both the notification delegate
// and scene connection. Retain it until Capacitor's plugins exist, then route once.
final class NotificationLaunchRelay: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationLaunchRelay()
    private weak var router: NotificationRouter?
    private var pending: [UNNotificationResponse] = []
    private var seen = Set<String>()
    private var order: [String] = []

    func attach(_ router: NotificationRouter) {
        self.router = router
        UNUserNotificationCenter.current().delegate = self
        let responses = pending
        pending.removeAll()
        responses.forEach { receive($0) }
    }

    func receive(_ response: UNNotificationResponse) {
        guard let router else {
            pending.append(response)
            return
        }
        let notification = response.notification
        let key = "\(notification.request.identifier)|\(notification.date.timeIntervalSince1970)|\(response.actionIdentifier)"
        guard seen.insert(key).inserted else { return }
        order.append(key)
        if order.count > 128 { seen.remove(order.removeFirst()) }
        router.userNotificationCenter(UNUserNotificationCenter.current(), didReceive: response, withCompletionHandler: {})
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        DispatchQueue.main.async {
            self.receive(response)
            completionHandler()
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        DispatchQueue.main.async {
            guard let router = self.router else { completionHandler([]); return }
            router.userNotificationCenter(center, willPresent: notification, withCompletionHandler: completionHandler)
        }
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let controller = CAPBridgeViewController()
        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = controller
        controller.loadViewIfNeeded()
        if let router = controller.bridge?.notificationRouter {
            NotificationLaunchRelay.shared.attach(router)
        }
        if let response = connectionOptions.notificationResponse {
            NotificationLaunchRelay.shared.receive(response)
        }
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
