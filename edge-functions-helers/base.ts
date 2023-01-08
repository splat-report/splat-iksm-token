import { Context } from "https://edge.netlify.com/";

type Handler = (request: Request, context: Context) => Promise<Response>;

class BodyError extends Error {}

export function asStandardHandler(rawHandler: Handler): Handler {
  return async function standardizedHandler(
    request: Request,
    context: Context,
  ) {
    const immediateResponse = tryImmediateResponse(request);
    if (immediateResponse) {
      return immediateResponse;
    }

    try {
      const rawResponse = await rawHandler(request, context);
      return withSuccessCommonHeaders(rawResponse);
    } catch (error) {
      if (error instanceof BodyError) {
        return asErrRes("Failed to parse the request body as JSON");
      }
      return asErrRes("Something wrong or network error");
    }
  };
}

function tryImmediateResponse(request: Request) {
  if (["OPTIONS", "HEAD"].includes(request.method)) {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Request-Methods": "OPTIONS,HEAD,POST",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    });
  }

  return null;
}

function withSuccessCommonHeaders(response: Response) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Content-Type", "application/json; charset=utf-8");
  response.headers.set("Cache-Control", "max-age=60, private");
  return response;
}

export async function parseBody(request: Request) {
  try {
    return await request.json();
  } catch (_err) {
    throw new BodyError();
  }
}

export function asErrRes(message: string, status = 400) {
  const data = {
    success: false,
    messages: [message],
  };

  return Response.json(data, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    },
  });
}
