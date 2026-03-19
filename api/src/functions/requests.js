import { app } from "@azure/functions";
import { requireAllowedStaff } from "../lib/auth.js";
import { errorResponse, jsonResponse, readJson } from "../lib/http.js";
import { listRequests, saveRequest, updateRequestStatus } from "../lib/storage.js";

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
      const saved = await saveRequest(requestRecord);
      return jsonResponse(saved, { status: 201 });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to save request.", 500);
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
