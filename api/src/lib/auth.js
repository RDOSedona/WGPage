import { errorResponse } from "./http.js";
import { isAllowedStaff } from "./storage.js";

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function parseClientPrincipal(request) {
  const principalHeader = request.headers.get("x-ms-client-principal");
  if (!principalHeader) {
    return null;
  }

  try {
    const decoded = Buffer.from(principalHeader, "base64").toString("utf8");
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function getAuthUserFromRequest(request) {
  const principal = parseClientPrincipal(request);
  if (!principal || typeof principal !== "object") {
    return null;
  }

  const userDetails = typeof principal.userDetails === "string" ? principal.userDetails.trim() : "";
  const email = normalizeEmail(userDetails);
  const userRoles = Array.isArray(principal.userRoles) ? principal.userRoles.filter((role) => typeof role === "string") : [];

  return {
    email,
    userDetails: userDetails || email || "Signed-in staff member",
    userRoles,
  };
}

export async function getStaffAccessState(request) {
  const user = getAuthUserFromRequest(request);
  if (!user || !user.email) {
    return {
      authenticated: false,
      authorized: false,
      email: "",
      userDetails: "",
      userRoles: [],
    };
  }

  const authorized = await isAllowedStaff(user.email);
  return {
    authenticated: true,
    authorized,
    email: user.email,
    userDetails: user.userDetails,
    userRoles: user.userRoles,
  };
}

export async function requireAllowedStaff(request) {
  const access = await getStaffAccessState(request);
  if (!access.authenticated) {
    return {
      access,
      response: errorResponse("Staff sign-in is required.", 401),
    };
  }

  if (!access.authorized) {
    return {
      access,
      response: errorResponse("This Microsoft account is not approved for staff access.", 403),
    };
  }

  return {
    access,
    response: null,
  };
}
