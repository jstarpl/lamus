import { DropboxAuth } from "dropbox";
import { AppStore, LAMUS_API } from "../../../AppStore";

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
    const resp = await fetch(LAMUS_API + "/dropbox/accessToken", {
      credentials: "include",
      headers: [["Authorization", `Bearer ${AppStore.token}`]],
    });
    if (!resp.ok) throw new Error("Could not get new access token from API");
    const data = await resp.json();
    this.setAccessToken(data.access_token);
    this.setAccessTokenExpiresAt(new Date(data.expires_at));
  }
}
