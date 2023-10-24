import { GeneralIORouter, InOutRequest } from "@lamus/qbasic-vm";

const REDIRECT_URI = new URL("/code/io/oauth2", window.location.href);

export const OAUTH2_CODE_BCHANNEL_NAME = "oauth2_code";

export default function setup(router: GeneralIORouter) {
  let lastToken = "";
  let lastCode = "";
  let lastCodeVerifier = "";
  let lastClientId = "";
  let codeRequestPromises: (() => void)[] = [];
  let abortController: AbortController | null = null;

  function onOAuth2Message(e: MessageEvent) {
    lastCode = e.data;
    codeRequestPromises.map((resolve) => resolve());
    codeRequestPromises.length = 0;
  }

  const codeChannel = new BroadcastChannel(OAUTH2_CODE_BCHANNEL_NAME);
  codeChannel.addEventListener("message", onOAuth2Message);

  async function beginOAuth2Handler(req: InOutRequest) {
    let oauth2Request: OAuth2Request;

    try {
      oauth2Request = JSON.parse(req.data ?? "") as OAuth2Request;
    } catch (e) {
      console.error("Could not parse OAuth2 request: ", req.data);
      return;
    }

    if (oauth2Request.base_url === undefined) return;
    if (oauth2Request.client_id === undefined) return;

    lastClientId = oauth2Request.client_id;

    const targetUrl = new URL(oauth2Request.base_url);
    targetUrl.searchParams.set("client_id", lastClientId);
    if (oauth2Request.scope)
      targetUrl.searchParams.set("scope", oauth2Request.scope);

    lastCodeVerifier = generateRandomString(64);
    const hashed = await sha256(lastCodeVerifier);
    const codeChallenge = base64encode(hashed);

    targetUrl.searchParams.set("response_type", "code");
    targetUrl.searchParams.set("code_challenge_method", "S256");
    targetUrl.searchParams.set("code_challenge", codeChallenge);
    targetUrl.searchParams.set("redirect_uri", REDIRECT_URI.toString());
    window.open(targetUrl, "_blank");

    return new Promise<void>((resolve) => {
      codeRequestPromises.push(resolve);
    });
  }

  async function getTokenOAuth2Handler(req: InOutRequest) {
    let oauth2Request: OAuth2TokenRequest;

    try {
      oauth2Request = JSON.parse(req.data ?? "") as OAuth2TokenRequest;
    } catch (e) {
      console.error("Could not parse OAuth2 request: ", req.data);
      return;
    }

    if (oauth2Request.base_url === undefined) return;
    if (oauth2Request.client_id === undefined) return;
    if (oauth2Request.code === undefined) return;
    if (oauth2Request.code_verifier === undefined) return;

    const requestBody = new URLSearchParams({
      code: oauth2Request.code,
      client_id: oauth2Request.client_id,
      grant_type: "authorization_code",
      redirect_uri: REDIRECT_URI.toString(),
      code_verifier: oauth2Request.code_verifier,
    });

    if (oauth2Request.client_secret !== undefined)
      requestBody.set("client_secret", oauth2Request.client_secret);

    abortController = new AbortController();
    const tokenResponse = await fetch(oauth2Request.base_url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: requestBody,
      signal: abortController.signal,
    });
    abortController = null;
    if (!tokenResponse.ok) {
      console.error(await tokenResponse.text());
      lastToken = "";
      return;
    }
    lastToken = await tokenResponse.text();
    return;
  }

  function getLastCode(): string {
    return JSON.stringify({
      client_id: lastClientId,
      code_verifier: lastCodeVerifier,
      code: lastCode,
    });
  }

  router.insertRoute("/oauth2/begin", async (req) => {
    if (req.method !== "out") return;
    return beginOAuth2Handler(req);
  });

  router.insertRoute("/oauth2/code", async (req) => {
    if (req.method !== "in") return;
    return getLastCode();
  });

  router.insertRoute("/oauth2/token", async (req) => {
    if (req.method !== "out") return lastToken;
    return getTokenOAuth2Handler(req);
  });

  return () => {
    codeChannel.close();
    abortController?.abort();
  };
}

interface OAuth2Request {
  base_url: string;
  client_id: string;
  scope?: string;
}

interface OAuth2TokenRequest {
  base_url: string;
  code: string;
  client_id: string;
  client_secret?: string;
  code_verifier: string;
}

function generateRandomString(length: number) {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest("SHA-256", data);
}

function base64encode(input: ArrayBuffer): string {
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(input))))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
