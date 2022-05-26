import { DropboxAuth } from "dropbox";
import { AppStore } from "../../../AppStore";

const TokenExpirationBuffer = 300 * 1000;

export class CustomDropboxAuth extends DropboxAuth {
  checkAndRefreshAccessToken(): Promise<void> {
    const needsRefresh =
      !this.getAccessTokenExpiresAt() ||
      new Date(Date.now() + TokenExpirationBuffer) >=
        this.getAccessTokenExpiresAt();
    const needsToken = !this.getAccessToken();
    if (needsRefresh || needsToken) {
      return this.refreshAccessToken();
    }
    return Promise.resolve();
  }

  async refreshAccessToken(): Promise<void> {
    const resp = await AppStore.apiFetch("/dropbox/accessToken");
    if (!resp.ok) throw new Error("Could not get new access token from API");
    const data = await resp.json();
    this.setAccessToken(data.access_token);
    this.setAccessTokenExpiresAt(new Date(data.expires_at));
  }
}
