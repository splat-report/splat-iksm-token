import { fetchBulletFromScratch } from "../src/token.ts";
import {
  asErrRes,
  asStandardHandler,
  parseBody,
} from "../edge-functions-helers/base.ts";

const PARAM_SESSION_TOKEN = "sessionToken";

export default asStandardHandler(async (request, _context) => {
  const body = await parseBody(request);

  const sessionToken = body[PARAM_SESSION_TOKEN];

  if (!sessionToken) {
    return asErrRes(`Parameter missing: [${PARAM_SESSION_TOKEN}]`);
  }

  const data = await fetchBulletFromScratch(sessionToken);
  return Response.json(data);
});
