import { app } from "@azure/functions";
import { requireAllowedStaff } from "../lib/auth.js";
import { errorResponse, jsonResponse, readJson } from "../lib/http.js";
import { listCustomRequestTypes, removeCustomRequestType, saveCustomRequestType } from "../lib/storage.js";

app.http("request-types-list", {
  methods: ["GET"],
  route: "request-types",
  authLevel: "anonymous",
  handler: async () => {
    try {
      const requestTypes = await listCustomRequestTypes();
      return jsonResponse(requestTypes);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to load request types.", 500);
    }
  },
});

app.http("request-types-create", {
  methods: ["POST"],
  route: "request-types",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    const requestType = await readJson(request);
    if (!requestType || typeof requestType.id !== "string" || !Array.isArray(requestType.fields)) {
      return errorResponse("Request type payload is invalid.");
    }

    try {
      const saved = await saveCustomRequestType(requestType);
      return jsonResponse(saved, { status: 201 });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to save request type.", 500);
    }
  },
});

app.http("request-types-delete", {
  methods: ["DELETE"],
  route: "request-types/{id}",
  authLevel: "anonymous",
  handler: async (request) => {
    const { response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    if (!request.params.id) {
      return errorResponse("Request type id is required.");
    }

    try {
      await removeCustomRequestType(request.params.id);
      return new Response(null, { status: 204 });
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to delete request type.", 500);
    }
  },
});
