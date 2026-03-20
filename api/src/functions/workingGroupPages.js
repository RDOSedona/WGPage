import { app } from "@azure/functions";
import { requireAllowedStaff } from "../lib/auth.js";
import { errorResponse, jsonResponse, readJson } from "../lib/http.js";
import { getWorkingGroupPage, saveWorkingGroupPage } from "../lib/storage.js";

function isValidWorkingGroupContent(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.hero &&
      Array.isArray(value.hero.highlights) &&
      Array.isArray(value.hero.actions) &&
      value.sections &&
      value.sections.activities &&
      Array.isArray(value.sections.activities.items) &&
      value.sections.meetings &&
      Array.isArray(value.sections.meetings.tracks) &&
      value.sections.resources &&
      Array.isArray(value.sections.resources.cards) &&
      value.sections.committee &&
      Array.isArray(value.sections.committee.groups),
  );
}

app.http("working-group-pages-get", {
  methods: ["GET"],
  route: "working-group-pages/{view}",
  authLevel: "anonymous",
  handler: async (request) => {
    if (!request.params.view) {
      return errorResponse("Working group page view is required.");
    }

    try {
      const page = await getWorkingGroupPage(request.params.view);
      if (!page) {
        return errorResponse("Working group page not found.", 404);
      }

      return jsonResponse(page);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to load working group page.", 500);
    }
  },
});

app.http("working-group-pages-save", {
  methods: ["PUT"],
  route: "working-group-pages/{view}",
  authLevel: "anonymous",
  handler: async (request) => {
    const { access, response } = await requireAllowedStaff(request);
    if (response) {
      return response;
    }

    if (!request.params.view) {
      return errorResponse("Working group page view is required.");
    }

    const pageContent = await readJson(request);
    if (!isValidWorkingGroupContent(pageContent)) {
      return errorResponse("Working group page payload is invalid.");
    }

    try {
      const saved = await saveWorkingGroupPage(request.params.view, pageContent, access.email);
      return jsonResponse(saved);
    } catch (error) {
      return errorResponse(error instanceof Error ? error.message : "Unable to save working group page.", 500);
    }
  },
});
