export function jsonResponse(body, init = {}) {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, { status });
}
