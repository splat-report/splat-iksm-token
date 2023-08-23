import { $fetch } from "https://esm.sh/ofetch@latest";
import { getF } from "./f.ts";

const NSO_APP_VERSION = "2.6.0";
const IKSM_WEBVIEW_VERSION = "4.0.0-b8c1e0fc";

type User = {
  country: string;
  language: string;
  birthday: string;
  nickname: string;
};

type WebToken = {
  token: string;
  expiresIn: number;
  expiresAt: number;
};

type BulletToken = {
  token: string;
};

export async function fetchBulletFromScratch(sessionToken: string) {
  const apiTokens = await fetchAPITokens(sessionToken);
  const user = await fetchUser(apiTokens.accessToken);
  const idToken = await fetchIdToken(apiTokens.accessToken, user);
  const webToken = await fetchWebToken(idToken.token);
  const bulletToken = await fetchBulletToken(webToken.token, user);

  return {
    webToken,
    bulletToken,
  };
}

async function fetchAPITokens(sessionToken: string) {
  const headers = {
    Accept: "application/json",
    "User-Agent": "Dalvik/2.1.0 (Linux; U; Android 7.1.2)",
  };

  const body = {
    client_id: "71b963c1b7b6d119",
    session_token: sessionToken,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer-session-token",
  };

  const url = "https://accounts.nintendo.com/connect/1.0.0/api/token";

  const data = await $fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (data["token_type"] !== "Bearer") {
    throw new Error("Unexpected token type.");
  }

  return {
    idToken: data["id_token"],
    accessToken: data["access_token"],
  };
}

async function fetchUser(token: string) {
  const headers = {
    "User-Agent": "NASDKAPI; Android",
    Accept: "application/json",
    Authorization: "Bearer " + token,
  };

  const url = "https://api.accounts.nintendo.com/2.0.0/users/me";

  const data = await $fetch(url, {
    method: "GET",
    headers,
  });

  return {
    country: data["country"] as string,
    language: data["language"] as string,
    birthday: data["birthday"] as string,
    nickname: data["nickname"] as string,
  };
}

async function fetchIdToken(idToken: string, user: User) {
  const { f, uuid, timestamp } = await getF(idToken, 1);

  const parameter = {
    f: f,
    language: user.language,
    naBirthday: user.birthday,
    naCountry: user.country,
    naIdToken: idToken,
    requestId: uuid,
    timestamp: timestamp,
  };
  const body = {
    parameter,
  };

  const headers = {
    "X-Platform": "Android",
    "X-ProductVersion": NSO_APP_VERSION,
    "Content-Type": "application/json; charset=utf-8",
    "User-Agent": "com.nintendo.znca/" + NSO_APP_VERSION + "(Android/7.1.2)",
  };

  const url = "https://api-lp1.znc.srv.nintendo.net/v3/Account/Login";
  const data = await $fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (data["errorMessage"]) {
    throw new Error("Failed to fetch web credentials");
  }

  const creds = data["result"]["webApiServerCredential"] as {
    accessToken: string;
    expiresIn: number;
  };

  return {
    token: creds.accessToken,
    expiresIn: creds.expiresIn,
  };
}

async function fetchWebToken(token: string): Promise<WebToken> {
  const { f, uuid, timestamp } = await getF(token, 2);

  const headers = {
    "X-Platform": "Android",
    "X-ProductVersion": NSO_APP_VERSION,
    Authorization: "Bearer " + token,
    "User-Agent": "com.nintendo.znca/" + NSO_APP_VERSION + "(Android/7.1.2)",
  };

  const parameter = {
    f: f,
    id: 4834290508791808,
    registrationToken: token,
    requestId: uuid,
    timestamp: timestamp,
  };

  const body = {
    parameter,
  };

  const url = "https://api-lp1.znc.srv.nintendo.net/v2/Game/GetWebServiceToken";

  const data = await $fetch(url, {
    method: "POST",
    headers,
    body,
  });

  return {
    token: data["result"]["accessToken"] as string,
    expiresIn: data["result"]["expiresIn"],
    expiresAt: calcExpiresAt(data["result"]["expiresIn"] as number),
  };
}

async function fetchBulletToken(
  token: string,
  user: User,
): Promise<BulletToken> {
  const headers = {
    "Content-Length": "0",
    "Content-Type": "application/json",
    "Accept-Language": user.language,
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Mobile Safari/537.36",
    "X-Web-View-Ver": await getWebViewVersion(),
    "X-NACOUNTRY": user.country,
    Accept: "*/*",
    Origin: "https://api.lp1.av5ja.srv.nintendo.net",
    "X-Requested-With": "com.nintendo.znca",
    Cookie: `_gtoken=${token}`, // X-GameWebToken
  };
  const url = "https://api.lp1.av5ja.srv.nintendo.net/api/bullet_tokens";

  const data = await $fetch(url, {
    method: "POST",
    headers,
  });

  const bulletToken = data["bulletToken"];
  return {
    token: bulletToken,
  };
}

function calcExpiresAt(expiresIn: number) {
  return nowInSeconds() + expiresIn;
}

function nowInSeconds() {
  return Math.floor(Date.now() / 1000);
}

export function getWebViewVersion() {
  return IKSM_WEBVIEW_VERSION;
}
