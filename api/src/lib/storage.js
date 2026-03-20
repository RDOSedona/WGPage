import { TableClient } from "@azure/data-tables";

const CUSTOM_REQUEST_TYPES_TABLE = "PortalRequestTypes";
const REQUESTS_TABLE = "PortalRequests";
const STAFF_ACCESS_TABLE = "PortalStaffAccess";
const WORKING_GROUP_PAGES_TABLE = "PortalWorkingGroupPages";
const CUSTOM_REQUEST_TYPE_PARTITION = "request-type";
const REQUEST_PARTITION = "request";
const STAFF_ACCESS_PARTITION = "staff-access";
const WORKING_GROUP_PAGE_PARTITION = "working-group-page";
const DEFAULT_ALLOWED_STAFF = ["rdo@sedonaconference.org", "rmb@sedonaconference.org"];

function getConnectionString() {
  return process.env.PORTAL_STORAGE_CONNECTION_STRING || process.env.AzureWebJobsStorage || "";
}

async function getTableClient(tableName) {
  const connectionString = getConnectionString();
  if (!connectionString) {
    throw new Error("Missing storage connection string. Set PORTAL_STORAGE_CONNECTION_STRING or AzureWebJobsStorage.");
  }

  const client = TableClient.fromConnectionString(connectionString, tableName);
  try {
    await client.createTable();
  } catch (error) {
    if (error?.statusCode !== 409) {
      throw error;
    }
  }
  return client;
}

function safeParse(payload) {
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

function normalizeEmail(email) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeAllowedStaffEntry(value) {
  if (!value || typeof value !== "object") return null;
  const rawEntry = value;
  const email = normalizeEmail(rawEntry.email);
  if (!email) return null;

  return {
    email,
    addedAt: typeof rawEntry.addedAt === "string" ? rawEntry.addedAt : "",
  };
}

async function listPayloads(tableName) {
  const client = await getTableClient(tableName);
  const results = [];

  for await (const entity of client.listEntities()) {
    if (typeof entity.payload !== "string") continue;
    const parsed = safeParse(entity.payload);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

async function upsertPayload(tableName, partitionKey, rowKey, payload, extraFields = {}) {
  const client = await getTableClient(tableName);
  const entity = {
    partitionKey,
    rowKey,
    payload: JSON.stringify(payload),
    updatedAt: new Date().toISOString(),
    ...extraFields,
  };

  await client.upsertEntity(entity, "Replace");
  return payload;
}

async function getPayload(tableName, partitionKey, rowKey) {
  const client = await getTableClient(tableName);

  try {
    const entity = await client.getEntity(partitionKey, rowKey);
    return typeof entity.payload === "string" ? safeParse(entity.payload) : null;
  } catch (error) {
    if (error?.statusCode === 404) {
      return null;
    }
    throw error;
  }
}

async function deletePayload(tableName, partitionKey, rowKey) {
  const client = await getTableClient(tableName);

  try {
    await client.deleteEntity(partitionKey, rowKey);
  } catch (error) {
    if (error?.statusCode !== 404) {
      throw error;
    }
  }
}

export async function listCustomRequestTypes() {
  const requestTypes = await listPayloads(CUSTOM_REQUEST_TYPES_TABLE);
  return requestTypes.sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")));
}

export async function saveCustomRequestType(requestType) {
  return upsertPayload(CUSTOM_REQUEST_TYPES_TABLE, CUSTOM_REQUEST_TYPE_PARTITION, requestType.id, requestType);
}

export async function removeCustomRequestType(requestTypeId) {
  await deletePayload(CUSTOM_REQUEST_TYPES_TABLE, CUSTOM_REQUEST_TYPE_PARTITION, requestTypeId);
}

function normalizeWorkingGroupPageView(view) {
  const normalized = String(view ?? "").trim().toLowerCase();
  if (!/^[a-z0-9-]{1,64}$/.test(normalized)) {
    throw new Error("Working group page view is invalid.");
  }
  return normalized;
}

export async function getWorkingGroupPage(view) {
  const normalizedView = normalizeWorkingGroupPageView(view);
  return getPayload(WORKING_GROUP_PAGES_TABLE, WORKING_GROUP_PAGE_PARTITION, normalizedView);
}

export async function saveWorkingGroupPage(view, pageContent, updatedBy = "") {
  const normalizedView = normalizeWorkingGroupPageView(view);
  const normalizedUpdatedBy = normalizeEmail(updatedBy);

  return upsertPayload(
    WORKING_GROUP_PAGES_TABLE,
    WORKING_GROUP_PAGE_PARTITION,
    normalizedView,
    pageContent,
    normalizedUpdatedBy ? { updatedBy: normalizedUpdatedBy } : {},
  );
}

export async function listRequests() {
  const requests = await listPayloads(REQUESTS_TABLE);
  return requests.sort((left, right) => String(right.submittedAt ?? "").localeCompare(String(left.submittedAt ?? "")));
}

export async function saveRequest(request) {
  return upsertPayload(REQUESTS_TABLE, REQUEST_PARTITION, String(request.id), request);
}

export async function updateRequestStatus(requestId, nextStatus) {
  const existing = await getPayload(REQUESTS_TABLE, REQUEST_PARTITION, String(requestId));
  if (!existing) {
    return null;
  }

  const updated = {
    ...existing,
    status: nextStatus,
  };

  return upsertPayload(REQUESTS_TABLE, REQUEST_PARTITION, String(requestId), updated);
}

async function ensureAllowedStaffSeeded() {
  const storedEntries = (await listPayloads(STAFF_ACCESS_TABLE))
    .map((entry) => normalizeAllowedStaffEntry(entry))
    .filter((entry) => entry !== null);

  if (storedEntries.length > 0) {
    return storedEntries;
  }

  const seededEntries = [];
  for (const email of DEFAULT_ALLOWED_STAFF) {
    const entry = {
      email,
      addedAt: new Date().toISOString(),
    };
    await upsertPayload(STAFF_ACCESS_TABLE, STAFF_ACCESS_PARTITION, email, entry);
    seededEntries.push(entry);
  }

  return seededEntries;
}

export async function listAllowedStaff() {
  const entries = await ensureAllowedStaffSeeded();
  return entries
    .map((entry) => normalizeAllowedStaffEntry(entry))
    .filter((entry) => entry !== null)
    .sort((left, right) => left.email.localeCompare(right.email));
}

export async function isAllowedStaff(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return false;

  const allowedStaff = await listAllowedStaff();
  return allowedStaff.some((entry) => entry.email === normalizedEmail);
}

export async function saveAllowedStaff(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email address is required.");
  }

  const allowedStaff = await listAllowedStaff();
  const existingEntry = allowedStaff.find((entry) => entry.email === normalizedEmail);
  if (existingEntry) {
    return existingEntry;
  }

  const entry = {
    email: normalizedEmail,
    addedAt: new Date().toISOString(),
  };

  return upsertPayload(STAFF_ACCESS_TABLE, STAFF_ACCESS_PARTITION, normalizedEmail, entry);
}

export async function removeAllowedStaff(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error("Email address is required.");
  }

  const allowedStaff = await listAllowedStaff();
  const existingEntry = allowedStaff.find((entry) => entry.email === normalizedEmail);
  if (!existingEntry) {
    return;
  }

  if (allowedStaff.length <= 1) {
    throw new Error("At least one approved staff login must remain.");
  }

  await deletePayload(STAFF_ACCESS_TABLE, STAFF_ACCESS_PARTITION, normalizedEmail);
}
