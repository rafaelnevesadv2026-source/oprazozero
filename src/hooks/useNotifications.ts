import { useCallback, useEffect, useRef } from "react";
import { SmartAlert } from "@/hooks/useSmartAlerts";

const NOTIFICATION_COOLDOWN = 10 * 60 * 1000; // 10 min between same-type notifications

export function useNotifications() {
  const lastNotified = useRef<Record<string, number>>({});

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;
    const result = await Notification.requestPermission();
    return result === "granted";
  }, []);

  const isSupported = "Notification" in window;
  const permission = isSupported ? Notification.permission : "denied";

  const notify = useCallback((title: string, body: string, icon?: string, tag?: string) => {
    if (!isSupported || Notification.permission !== "granted") return;

    const key = tag || title;
    const now = Date.now();
    if (lastNotified.current[key] && now - lastNotified.current[key] < NOTIFICATION_COOLDOWN) return;
    lastNotified.current[key] = now;

    const notification = new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      tag: key,
      badge: "/favicon.ico",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 8s
    setTimeout(() => notification.close(), 8000);
  }, [isSupported]);

  const notifyCriticalAlerts = useCallback((alerts: SmartAlert[]) => {
    const critical = alerts.filter(a => a.level === "critical");
    if (critical.length === 0) return;

    if (critical.length === 1) {
      notify(
        `🔴 ${critical[0].title}`,
        critical[0].description,
        undefined,
        `alert-${critical[0].type}`
      );
    } else {
      notify(
        `🔴 ${critical.length} alertas críticos`,
        critical.map(a => a.title).join(", "),
        undefined,
        "critical-batch"
      );
    }
  }, [notify]);

  return { requestPermission, notify, notifyCriticalAlerts, isSupported, permission };
}
