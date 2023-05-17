import { uniqueId } from "lodash";
import { makeAutoObservable } from "mobx";
import { v4 as uuidv4 } from "uuid";
import { parseToken } from "../helpers/util";
import { DropboxProvider } from "./fileSystem/providers/dropbox";
import { NextcloudProvider } from "./fileSystem/providers/nextcloud";
import { OPFSProvider } from "./fileSystem/providers/opfs";
import { FileSystemStoreClass } from "./FileSystemStore";

const DEVICE_ID_KEY = "deviceId";
const TOKEN_KEY = "token";
const TOKEN_EXPIRES_AT_KEY = "expiresAt";

const TOKEN_GRACE_PERIOD = 30000; // 30s

export const LAMUS_API = window.location.origin + "/api";
export const LAMUS_AGENT_API = "ws://localhost:8888";

// retry with back-off
let AGENT_RECONNECT_PERIOD = 1000; // 5s
const AGENT_RECONNECT_PERIOD_MIN = 5000;
const AGENT_RECONNECT_PERIOD_MAX = 60000;

export interface ISettings {
  cloud_mode: "dropbox" | "nextcloud" | "onedrive" | "gdrive" | null;
  nextcloud_url: string | null;
  nextcloud_user: string | null;
  nextcloud_password: string | null;
}

const REQUIRED_SCOPES = ["dropbox.access_token"];

const OPFS_DRIVE_LETTER = "A";

class AppStoreClass {
  deviceId = "";
  token: string | null = null;
  tokenExpiresAt: Date | null = null;
  showAdminCode = false;
  loggedIn = false;
  settings: ISettings | null = null;
  fileSystem: FileSystemStoreClass = new FileSystemStoreClass();
  isUiReady: boolean = false;
  _busyQueue: Set<string> = new Set();
  _isBusy: boolean = false;

  _agentSocket: WebSocket | undefined;
  _agentReconnect: NodeJS.Timeout | undefined;

  constructor() {
    makeAutoObservable(this, {
      apiFetch: false,
      shouldRefreshToken: false,
      _agentReconnect: false,
      _agentSocket: false,
    });
    this.deviceId = localStorage.getItem(DEVICE_ID_KEY) || uuidv4();
    localStorage.setItem(DEVICE_ID_KEY, this.deviceId);
    this.fileSystem.init();
    (window as any)["FileSystem"] = this.fileSystem;
    this._agentSocket = this.createAgentConnection();
  }

  setShowAdminCode(value: boolean): void {
    this.showAdminCode = value;
  }

  setUIReady(): void {
    this.isUiReady = true;
  }

  get isBusy(): boolean {
    if (this._busyQueue.size > 0) {
      return true;
    }
    return this._isBusy || false;
  }

  set isBusy(value: boolean) {
    this._isBusy = value;
  }

  async login(): Promise<void> {
    try {
      await this.refreshToken();
    } catch {
      console.error('Could not log in')
    }
    await this.createFileSystem();
  }

  private createAgentConnection = () => {
    try {
      const ws = new WebSocket(`${LAMUS_AGENT_API}/events`);
      ws.addEventListener("close", this.reconnectAgent);
      ws.addEventListener("error", this.reconnectAgent);
      ws.addEventListener("message", this.onDataFromAgent);
      ws.addEventListener("open", () => {
        AGENT_RECONNECT_PERIOD = AGENT_RECONNECT_PERIOD_MIN;
      });

      return ws;
    } catch (e) {
      console.error(e);
      return undefined;
    }
  };

  private onDataFromAgent = (e: MessageEvent) => {
    const dataObj = JSON.parse(e.data);
    if (!this._agentSocket) return;
    this._agentSocket.send(JSON.stringify(dataObj));
  };

  private reconnectAgent = () => {
    this._agentReconnect && clearInterval(this._agentReconnect);
    this._agentReconnect = setTimeout(() => {
      this._agentSocket = this.createAgentConnection();
    }, AGENT_RECONNECT_PERIOD);
    AGENT_RECONNECT_PERIOD = Math.min(
      AGENT_RECONNECT_PERIOD_MAX,
      AGENT_RECONNECT_PERIOD * 2
    );
  };

  private async createFileSystem(): Promise<void> {
    if (!this.settings) {
      await this.createLocalFileSystem();
      return;
    }

    await this.createCloudFileSystem();
    await this.createLocalFileSystem();
  }

  private async createCloudFileSystem(): Promise<void> {
    if (!this.settings) return;
    const cloudMode = this.settings.cloud_mode;

    switch (cloudMode) {
      case "dropbox":
        const dropboxProvider = new DropboxProvider();
        await dropboxProvider.init();
        this.fileSystem.addProvider("dropbox", dropboxProvider);
        break;
      case "nextcloud":
        const { nextcloud_user, nextcloud_password, nextcloud_url } =
          this.settings;
        // not properly configured, break
        if (!nextcloud_user || !nextcloud_password || !nextcloud_url) break;

        const nextcloudProvider = new NextcloudProvider(
          nextcloud_user,
          nextcloud_password,
          nextcloud_url
        );
        await nextcloudProvider.init();
        this.fileSystem.addProvider("nextcloud", nextcloudProvider);
        break;
    }
  }

  private async createLocalFileSystem(): Promise<void> {
    if (!OPFSProvider.isSupported()) return

    const opfsProvider = new OPFSProvider(OPFS_DRIVE_LETTER);
    await opfsProvider.init();
    this.fileSystem.addProvider(OPFS_DRIVE_LETTER, opfsProvider);
  }

  async refreshToken(): Promise<void> {
    const url = new URL(LAMUS_API + "/login");
    url.searchParams.set("device_id", this.deviceId);
    url.searchParams.set("scopes", REQUIRED_SCOPES.join(","));
    const response = await fetch(url.href, {
      headers: [["Content-Type", "application/json"]],
    });
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
      headers: [
        ["Authorization", `Bearer ${this.token}`],
        ["Content-Type", "application/json"],
      ],
    });
  }

  async makeBusyWith<T>(promise: Promise<T>): Promise<T> {
    const id = uniqueId();
    try {
      this._busyQueue.add(id);
      const result = await promise;
      this._busyQueue.delete(id);
      return result;
    } catch (e: unknown) {
      this._busyQueue.delete(id);
      throw e;
    }
  }
}

export const AppStore = new AppStoreClass();
