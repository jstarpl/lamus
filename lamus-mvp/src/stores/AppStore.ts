import { makeAutoObservable } from "mobx";
import { v4 as uuidv4 } from "uuid";

const DEVICE_ID_KEY = "deviceId";

const LAMUS_API = window.location.origin + "/api";

class AppStoreClass {
  deviceId = "";
  showAdminCode = false;
  loggedIn = false;
  settings = null;

  constructor() {
    makeAutoObservable(this);
    this.deviceId = localStorage.getItem(DEVICE_ID_KEY) || uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, this.deviceId);
  }

  setShowAdminCode(value: boolean) {
    this.showAdminCode = value;
  }

  async login(): Promise<void> {
    const url = new URL(LAMUS_API + "/login");
    url.searchParams.set("deviceId", this.deviceId);
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Could not log in`);
    const settings = await response.json();
    this.settings = settings;
    console.log(settings);
  }
}

export const AppStore = new AppStoreClass();
