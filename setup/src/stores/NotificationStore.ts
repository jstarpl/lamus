import { makeAutoObservable } from "mobx";
import { uniqueId } from "lodash";

type Notification = {
  variant?: string;
  message: string;
  persistent?: boolean;
};

const NOTIFICATION_TIMEOUT = 5000;

class NotificationStoreClass {
  notifications = new Map<string, Notification>();
  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
  }
  push(notification: Notification): string {
    const id = uniqueId();
    this.notifications.set(id, notification);
    if (!notification.persistent) {
      setTimeout(() => {
        this.remove(id);
      }, NOTIFICATION_TIMEOUT);
    }
    return id;
  }
  remove(id: string): boolean {
    return this.notifications.delete(id);
  }
}

export const NotificationStore = new NotificationStoreClass();
