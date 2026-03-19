import { TableClient } from "@azure/data-tables";

const CUSTOM_REQUEST_TYPES_TABLE = "PortalRequestTypes";
const REQUESTS_TABLE = "PortalRequests";
const STAFF_ACCESS_TABLE = "PortalStaffAccess";
const REQUEST_SPAM_FILTER_TABLE = "PortalRequestSpamFilter";
const CUSTOM_REQUEST_TYPE_PARTITION = "request-type";
const REQUEST_PARTITION = "request";
const STAFF_ACCESS_PARTITION = "staff-access";
const REQUEST_SPAM_PARTITION = "request-spam";
const REQUEST_SPAM_SETTINGS_PARTITION = "request-spam-settings";
const DEFAULT_ALLOWED_STAFF = ["rdo@sedonaconference.org", "rmb@sedonaconference.org"];
const REQUIRED_ALLOWED_STAFF = ["rdo@sedonaconference.org"];
const REQUEST_SPAM_SETTINGS_ROW_KEY = "global";
const REQUEST_SPAM_LIMIT = 5;
const REQUEST_SPAM_WINDOW_MS = 24 * 60 * 60 * 1000;

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

function normalizeIpAddress(ipAddress) {
  const rawValue = String(ipAddress ?? "").trim();
  if (!rawValue) {
    return "local-development";
  }

  if (rawValue.startsWith("[") && rawValue.includes("]")) {
    return rawValue.slice(1, rawValue.indexOf("]")).trim() || "local-development";
  }

  const colonSegments = rawValue.split(":");
  if (colonSegments.length === 2 && /^\d+$/.test(colonSegments[1])) {
    return colonSegments[0].trim() || "local-development";
  }

  return rawValue;
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

function normalizeSpamFilterSettings(value) {
  if (!value || typeof value !== "object") return { resetAt: "" };
  const rawValue = value;
  return {
    resetAt: typeof rawValue.resetAt === "string" ? rawValue.resetAt : "",
  };
}

function normalizeSpamFilterEntry(value) {
  if (!value || typeof value !== "object") return null;
  const rawValue = value;
  const ipAddress = normalizeIpAddress(rawValue.ipAddress);
  const attempts = Array.isArray(rawValue.attempts)
    ? rawValue.attempts.filter((attempt) => typeof attempt === "string" && !Number.isNaN(new Date(attempt).getTime()))
    : [];

  return {
    ipAddress,
    attempts,
  };
}

function createRequestSpamRowKey(ipAddress) {
  return Buffer.from(normalizeIpAddress(ipAddress), "utf8").toString("base64url") || "local-development";
}

function isRequiredAllowedStaff(email) {
  return REQUIRED_ALLOWED_STAFF.includes(normalizeEmail(email));
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

async function upsertPayload(tableName, partitionKey, rowKey, payload) {
  const client = await getTableClient(tableName);
  const entity = {
    partitionKey,
    rowKey,
    payload: JSON.stringify(payload),
    updatedAt: new Date().toISOString(),
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

export async function listRequests() {
  const requests = await listPayloads(REQUESTS_TABLE);
  return requests.sort((left, right) => String(right.submittedAt ?? "").localeCompare(String(left.submittedAt ?? "")));
}

export async function saveRequest(request) {
  return upsertPayload(REQUESTS_TABLE, REQUEST_PARTITION, String(request.id), request);
}

export async function removeRequest(requestId) {
  const existing = await getPayload(REQUESTS_TABLE, REQUEST_PARTITION, String(requestId));
  if (!existing) {
    return null;
  }

  await deletePayload(REQUESTS_TABLE, REQUEST_PARTITION, String(requestId));
  return existing;
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

  const entriesByEmail = new Map(storedEntries.map((entry) => [entry.email, entry]));
  const emailsToEnsure = storedEntries.length > 0 ? REQUIRED_ALLOWED_STAFF : DEFAULT_ALLOWED_STAFF;

  for (const email of emailsToEnsure) {
    if (entriesByEmail.has(email)) {
      continue;
    }

    const entry = {
      email,
      addedAt: new Date().toISOString(),
    };
    await upsertPayload(STAFF_ACCESS_TABLE, STAFF_ACCESS_PARTITION, email, entry);
    entriesByEmail.set(email, entry);
  }

  return Array.from(entriesByEmail.values());
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

  if (isRequiredAllowedStaff(normalizedEmail)) {
    throw new Error(`${normalizedEmail} must always remain approved for staff access.`);
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

async function getRequestSpamFilterSettings() {
  const stored = await getPayload(REQUEST_SPAM_FILTER_TABLE, REQUEST_SPAM_SETTINGS_PARTITION, REQUEST_SPAM_SETTINGS_ROW_KEY);
  return normalizeSpamFilterSettings(stored);
}

export async function getRequestSpamStatus(ipAddress) {
  const normalizedIp = normalizeIpAddress(ipAddress);
  const entry = normalizeSpamFilterEntry(await getPayload(REQUEST_SPAM_FILTER_TABLE, REQUEST_SPAM_PARTITION, createRequestSpamRowKey(normalizedIp))) ?? {
    ipAddress: normalizedIp,
    attempts: [],
  };
  const settings = await getRequestSpamFilterSettings();
  const resetAtMs = settings.resetAt ? new Date(settings.resetAt).getTime() : 0;
  const cutoffMs = Math.max(Date.now() - REQUEST_SPAM_WINDOW_MS, resetAtMs || 0);
  const activeAttempts = entry.attempts.filter((attempt) => new Date(attempt).getTime() > cutoffMs);

  return {
    ipAddress: normalizedIp,
    count: activeAttempts.length,
    limit: REQUEST_SPAM_LIMIT,
    resetAt: settings.resetAt,
    remaining: Math.max(REQUEST_SPAM_LIMIT - activeAttempts.length, 0),
  };
}

export async function recordRequestSubmissionAttempt(ipAddress, submittedAt = new Date()) {
  const normalizedIp = normalizeIpAddress(ipAddress);
  const rowKey = createRequestSpamRowKey(normalizedIp);
  const settings = await getRequestSpamFilterSettings();
  const resetAtMs = settings.resetAt ? new Date(settings.resetAt).getTime() : 0;
  const nowMs = submittedAt.getTime();
  const cutoffMs = Math.max(nowMs - REQUEST_SPAM_WINDOW_MS, resetAtMs || 0);
  const existingEntry = normalizeSpamFilterEntry(await getPayload(REQUEST_SPAM_FILTER_TABLE, REQUEST_SPAM_PARTITION, rowKey)) ?? {
    ipAddress: normalizedIp,
    attempts: [],
  };
  const activeAttempts = existingEntry.attempts.filter((attempt) => new Date(attempt).getTime() > cutoffMs);

  if (activeAttempts.length >= REQUEST_SPAM_LIMIT) {
    return {
      allowed: false,
      count: activeAttempts.length,
      limit: REQUEST_SPAM_LIMIT,
      remaining: 0,
      resetAt: settings.resetAt,
    };
  }

  const nextAttempts = [...activeAttempts, submittedAt.toISOString()];
  await upsertPayload(REQUEST_SPAM_FILTER_TABLE, REQUEST_SPAM_PARTITION, rowKey, {
    ipAddress: normalizedIp,
    attempts: nextAttempts,
  });

  return {
    allowed: true,
    count: nextAttempts.length,
    limit: REQUEST_SPAM_LIMIT,
    remaining: Math.max(REQUEST_SPAM_LIMIT - nextAttempts.length, 0),
    resetAt: settings.resetAt,
  };
}

export async function resetRequestSpamFilter() {
  const payload = {
    resetAt: new Date().toISOString(),
  };

  await upsertPayload(REQUEST_SPAM_FILTER_TABLE, REQUEST_SPAM_SETTINGS_PARTITION, REQUEST_SPAM_SETTINGS_ROW_KEY, payload);
  return payload;
}
