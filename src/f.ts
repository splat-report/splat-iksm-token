import { $fetch } from "https://esm.sh/ofetch";

export async function getF(idToken: string, step: 1 | 2) {
  const headers = {
    "User-Agent": "Splatoon 3 Local Tool",
    "Content-Type": "application/json; charset=utf-8",
  };
  const body = {
    token: idToken,
    hashMethod: step,
  };

  const url = "https://api.imink.app/f";

  const data = await $fetch(url, {
    method: "POST",
    headers,
    body,
  });

  return {
    f: data["f"] as string,
    uuid: data["request_id"] as string,
    timestamp: data["timestamp"] as number,
  };
}
