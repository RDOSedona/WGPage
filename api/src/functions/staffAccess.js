import { app } from "@azure/functions";
import { getStaffAccessState, requireAllowedStaff } from "../lib/auth.js";
import { errorResponse, jsonResponse, readJson } from "../lib/http.js";
import { listAllowedStaff, removeAllowedStaff, saveAllowedStaff } from "../lib/storage.js";

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

app.http("staff-access-self", {
  methods: ["GET"],
  route: "staff-access/self",
  authLevel: "anonymous",
  handler: async (request) => {
    const access = await getStaffAccessState(request);
    if (!access.authenticated) {
      return errorResponse("Staff sign-in is required.", 401);
    }

    return jsonResponse({
      email: access.email,
      userDetails: access.userDetails,
      authorized: access.authorized,
    });
  },
});

app.http("staff-access-list", {
  methods: ["GET"],
  route: "staff-access",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    try {
      const allowedStaff = await listAllowedStaff();
      return jsonResponse(allowedStaff);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to load approved staff logins.", 500);
    }
  },
});

app.http("staff-access-create", {
  methods: ["POST"],
  route: "staff-access",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    const body = await readJson(request);
    const email = normalizeEmail(body?.email);
    if (!isValidEmail(email)) {
      return errorResponse("Email address is invalid.");
    }

    try {
      const saved = await saveAllowedStaff(email);
      return jsonResponse(saved, { status: 201 });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to save approved staff login.", 500);
    }
  },
});

app.http("staff-access-delete", {
  methods: ["DELETE"],
  route: "staff-access/{email}",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    const email = normalizeEmail(decodeURIComponent(request.params.email ?? ""));
    if (!isValidEmail(email)) {
      return errorResponse("Email address is invalid.");
    }

    try {
      await removeAllowedStaff(email);
      return new Response(null, { status: 204 });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to remove approved staff login.", 500);
    }
  },
});
