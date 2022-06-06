import { makeAutoObservable, runInAction } from "mobx";
import { NotificationStore } from "./NotificationStore";

const LAMUS_API = process.env.REACT_APP_API_URI;

class AppStoreClass {
  loggedIn: boolean = false;
  token: string | null = null;

  constructor() {
    makeAutoObservable(this);

    const storedToken = sessionStorage.getItem("token");
    console.log(storedToken);
    if (storedToken) {
      this.token = storedToken;
      console.log("Logged in");
      this.loggedIn = true;
    }
  }

  async login(deviceId: string): Promise<boolean> {
    const res = await fetch(`${LAMUS_API}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        device_id: deviceId,
        scopes: ["dropbox.connect", "onedrive.connect"],
        no_create: true,
      }),
      mode: "cors",
      cache: "no-cache",
    });

    if (!res.ok) {
      console.log(await res.text());
      runInAction(() => {
        NotificationStore.push({
          message: `Login failed: ${res.status}`,
          variant: "danger",
        });
      });
      return false;
    }

    const result = await res.json();
    console.log(result);
    if (result.token) {
      runInAction(() => {
        this.token = result.token;
        sessionStorage.setItem("token", result.token);
        this.loggedIn = true;
      });
      return true;
    }
    return false;
  }

  async logout(): Promise<void> {
    sessionStorage.removeItem("token");
    this.loggedIn = false;
    this.token = null;
  }

  private apiFetch(
    path: string,
    init?: RequestInit | undefined
  ): Promise<Response> {
    return fetch(`${LAMUS_API}${path}`, {
      method: "POST",
      credentials: "include",
      headers: {
        authorization: `Bearer ${this.token}`,
      },
      redirect: "follow",
      ...init,
    });
  }

  async connectToDropbox(): Promise<boolean> {
    const res = await this.apiFetch(`/dropbox/connect`);

    if (!res.ok && res.status !== 303) {
      console.log(await res.text());
      console.log(res.status, res.statusText);
      console.log(res);
      runInAction(() => {
        NotificationStore.push({
          message: `Connection to Dropbox failed: ${res.status}`,
          variant: "danger",
        });
      });
      return false;
    }

    const result = await res.json();
    window.open(result.url, "_blank");
    return true;
  }

  async connectToOneDrive(): Promise<boolean> {
    const res = await this.apiFetch(`/onedrive/connect`);

    if (!res.ok && res.status !== 303) {
      console.log(await res.text());
      console.log(res.status, res.statusText);
      console.log(res);
      runInAction(() => {
        NotificationStore.push({
          message: `Connection to OneDrive failed: ${res.status}`,
          variant: "danger",
        });
      });
      return false;
    }

    const result = await res.json();
    window.open(result.url, "_blank");
    return true;
  }
}

export const AppStore = new AppStoreClass();
