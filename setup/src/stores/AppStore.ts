import { makeAutoObservable } from "mobx";

const LAMUS_API = process.env.API_URI;

class AppStoreClass {
  loggedIn: boolean = false;
  deviceId: string | null = null;
  token: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  async login(deviceId: string): Promise<boolean> {
    this.deviceId = deviceId;
    const res = await fetch(`${LAMUS_API}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        device_id: deviceId,
        scopes: ["dropbox.connect"],
      }),
    });
    if (!res.ok) return false;
    const result = await res.json();
    console.log(result);
    if (result.token) {
      this.token = result.token;
      this.loggedIn = true;
      return true;
    }
    return false;
  }

  async logout(): Promise<void> {
    this.loggedIn = false;
    this.deviceId = null;
    this.token = null;
  }
}

export const AppStore = new AppStoreClass();
