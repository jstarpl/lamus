import { makeAutoObservable } from "mobx";
import { v4 as uuidv4 } from "uuid";
import { dontWait } from "../helpers/utils";
import { DropboxProvider } from "./fileSystem/providers/dropbox";
import { FileSystemStoreClass } from "./FileSystemStore";

const DEVICE_ID_KEY = "deviceId";

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
  showAdminCode = false;
  loggedIn = false;
  settings: ISettings | null = null;
  fileSystem: FileSystemStoreClass = new FileSystemStoreClass();

  constructor() {
    makeAutoObservable(this);
    this.deviceId = localStorage.getItem(DEVICE_ID_KEY) || uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, this.deviceId);
    this.fileSystem.init();
    (window as any)["FileSystem"] = this.fileSystem;
  }

  setShowAdminCode(value: boolean) {
    this.showAdminCode = value;
  }

  async login(): Promise<void> {
    const url = new URL(LAMUS_API + "/login");
    url.searchParams.set("device_id", this.deviceId);
    url.searchParams.set("scopes", REQUIRED_SCOPES.join(","));
    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`Could not log in`);
    const data = await response.json();
    this.settings = data as ISettings;
    this.token = data.token;

    if (this.settings?.cloud_mode === "dropbox") {
      dontWait(async () => {
        const dropboxProvider = new DropboxProvider();
        await dropboxProvider.init();
        this.fileSystem.addProvider("dropbox", dropboxProvider);
      });
    }
  }
}

export const AppStore = new AppStoreClass();
