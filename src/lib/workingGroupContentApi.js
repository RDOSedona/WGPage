function hasJsonContentType(response) {
  const contentType = response.headers.get('content-type') ?? '';
  return contentType.includes('application/json');
}

async function readJsonIfPresent(response) {
  if (!hasJsonContentType(response)) {
    return null;
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function parseClientPrincipal(payload) {
  if (!payload) {
    return null;
  }

  if (Array.isArray(payload)) {
    const firstEntry = payload.find((entry) => entry?.clientPrincipal);
    return firstEntry?.clientPrincipal ?? null;
  }

  return payload.clientPrincipal ?? null;
}

export async function fetchWorkingGroupContentFromApi(view) {
  try {
    const response = await fetch(`/api/working-group-pages/${encodeURIComponent(view)}`, {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
      },
    });
    const body = await readJsonIfPresent(response);

    if (response.status === 404 && body?.error) {
      return {
        available: true,
        content: null,
      };
    }

    if (!response.ok) {
      if (!body) {
        return {
          available: false,
          content: null,
        };
      }

      throw new Error(body.error || 'Unable to load working group page.');
    }

    return {
      available: true,
      content: body,
    };
  } catch {
    return {
      available: false,
      content: null,
    };
  }
}

export async function getWorkingGroupAdminAccess() {
  try {
    const authResponse = await fetch('/.auth/me', {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
      },
    });
    const authBody = await readJsonIfPresent(authResponse);

    if (!authResponse.ok || !authBody) {
      return {
        available: false,
        authenticated: false,
        authorized: false,
      };
    }

    const clientPrincipal = parseClientPrincipal(authBody);
    if (!clientPrincipal) {
      return {
        available: true,
        authenticated: false,
        authorized: false,
      };
    }

    const accessResponse = await fetch('/api/staff-access/self', {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
      },
    });
    const accessBody = await readJsonIfPresent(accessResponse);

    if (!accessResponse.ok || !accessBody) {
      return {
        available: true,
        authenticated: true,
        authorized: false,
      };
    }

    return {
      available: true,
      authenticated: Boolean(accessBody.authenticated),
      authorized: Boolean(accessBody.authorized),
      email: accessBody.email ?? '',
      userDetails: accessBody.userDetails ?? '',
    };
  } catch {
    return {
      available: false,
      authenticated: false,
      authorized: false,
    };
  }
}

export async function saveWorkingGroupContentToApi(view, content) {
  const response = await fetch(`/api/working-group-pages/${encodeURIComponent(view)}`, {
    method: 'PUT',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      accept: 'application/json',
    },
    body: JSON.stringify(content),
  });

  const body = await readJsonIfPresent(response);

  if (!response.ok) {
    throw new Error(body?.error || 'Unable to save working group page.');
  }

  return body;
}
