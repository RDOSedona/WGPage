import { app } from "@azure/functions";
import { requireAllowedStaff } from "../lib/auth.js";
import { errorResponse, jsonResponse, readJson } from "../lib/http.js";
import { listRequests, recordRequestSubmissionAttempt, removeRequest, resetRequestSpamFilter, saveRequest, updateRequestStatus } from "../lib/storage.js";

function resolveClientIp(request) {
  const directIp = request.headers.get("x-azure-clientip") || request.headers.get("x-client-ip") || request.headers.get("x-real-ip");
  if (directIp && directIp.trim()) {
    return directIp.trim();
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor && forwardedFor.trim()) {
    return forwardedFor.split(",")[0]?.trim() || "local-development";
  }

  return "local-development";
}

app.http("requests-list", {
  methods: ["GET"],
  route: "requests",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    try {
      const requests = await listRequests();
      return jsonResponse(requests);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to load requests.", 500);
    }
  },
});

app.http("requests-create", {
  methods: ["POST"],
  route: "requests",
  authLevel: "anonymous",
  handler: async (request) => {
    const requestRecord = await readJson(request);
    if (!requestRecord || requestRecord.id === undefined) {
      return errorResponse("Request payload is invalid.");
    }

    try {
      const rateLimitStatus = await recordRequestSubmissionAttempt(resolveClientIp(request));
      if (!rateLimitStatus.allowed) {
        return errorResponse("This network has reached the daily limit of 5 submitted requests. Please contact admin if you need the spam filter reset.", 429);
      }

      const saved = await saveRequest(requestRecord);
      return jsonResponse(saved, { status: 201 });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to save request.", 500);
    }
  },
});

app.http("requests-spam-filter-reset", {
  methods: ["POST"],
  route: "requests/spam-filter/reset",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    try {
      const reset = await resetRequestSpamFilter();
      return jsonResponse(reset);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to reset the spam filter.", 500);
    }
  },
});

app.http("requests-delete", {
  methods: ["DELETE"],
  route: "requests/{id}",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    if (!request.params.id) {
      return errorResponse("Request id is required.");
    }

    try {
      const removed = await removeRequest(request.params.id);
      if (!removed) {
        return errorResponse("Request not found.", 404);
      }
      return jsonResponse(removed);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to delete request.", 500);
    }
  },
});

app.http("requests-status-update", {
  methods: ["PATCH"],
  route: "requests/{id}/status",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    const body = await readJson(request);
    if (!request.params.id || !body || typeof body.status !== "string") {
      return errorResponse("Request status payload is invalid.");
    }

    try {
      const updated = await updateRequestStatus(request.params.id, body.status);
      if (!updated) {
        return errorResponse("Request not found.", 404);
      }
      return jsonResponse(updated);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to update request status.", 500);
    }
  },
});
