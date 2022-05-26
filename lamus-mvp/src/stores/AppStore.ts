import { makeAutoObservable } from "mobx";
import { v4 as uuidv4 } from "uuid";
import { dontWait, parseToken } from "../helpers/util";
import { DropboxProvider } from "./fileSystem/providers/dropbox";
import { FileSystemStoreClass } from "./FileSystemStore";

const DEVICE_ID_KEY = "deviceId";
const TOKEN_KEY = "token";
const TOKEN_EXPIRES_AT_KEY = "expiresAt";

const TOKEN_GRACE_PERIOD = 30000; // 30s

export const LAMUS_API = window.location.origin + "/api";

export interface ISettings {
  cloud_mode: "dropbox" | "webdav" | null;
  webdav_url: string | null;
  webdav_user: string | null;
  webdav_password: string | null;
}

const REQUIRED_SCOPES = ["dropbox.access_token"];

export class AppStoreClass {
  deviceId = "";
  token: string | null = null;
  tokenExpiresAt: Date | null = null;
  showAdminCode = false;
  loggedIn = false;
  settings: ISettings | null = null;
  fileSystem: FileSystemStoreClass = new FileSystemStoreClass();

  constructor() {
    makeAutoObservable(this, {
      apiFetch: false,
      shouldRefreshToken: false,
    });
    this.deviceId = localStorage.getItem(DEVICE_ID_KEY) || uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, this.deviceId);
    this.fileSystem.init();
    (window as any)["FileSystem"] = this.fileSystem;
  }

  setShowAdminCode(value: boolean) {
    this.showAdminCode = value;
  }

  async login(): Promise<void> {
    await this.refreshToken();

    if (this.settings?.cloud_mode === "dropbox") {
      dontWait(async () => {
        const dropboxProvider = new DropboxProvider();
        await dropboxProvider.init();
        this.fileSystem.addProvider("dropbox", dropboxProvider);
      });
    }
  }

  async refreshToken(): Promise<void> {
    const url = new URL(LAMUS_API + "/login");
    url.searchParams.set("device_id", this.deviceId);
    url.searchParams.set("scopes", REQUIRED_SCOPES.join(","));
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Could not log in`);
    const data = await response.json();
    this.settings = data as ISettings;

    if (!data.token) throw new Error("Did not receive token");

    const token = data.token;
    this.token = token;

    const { payload } = parseToken(token);

    const expiresAt = new Date(payload.exp * 1000);

    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(
      TOKEN_EXPIRES_AT_KEY,
      expiresAt.getTime().toString()
    );
  }

  shouldRefreshToken(): boolean {
    if (
      !this.tokenExpiresAt ||
      this.tokenExpiresAt > new Date(Date.now() - TOKEN_GRACE_PERIOD)
    ) {
      return true;
    }
    return false;
  }

  async apiFetch(
    path: string,
    init?: RequestInit | undefined
  ): Promise<Response> {
    if (this.shouldRefreshToken()) {
      await this.refreshToken();
    }

    return fetch(LAMUS_API + path, {
      ...init,
      credentials: "include",
      headers: [["Authorization", `Bearer ${this.token}`]],
    });
  }
}

export const AppStore = new AppStoreClass();
