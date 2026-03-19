import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Eye,
  FileText,
  Inbox,
  Mail,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  type LucideIcon,
} from "lucide-react";

const BRAND_ORANGE = "#FD5702";
const BRAND_PURPLE = "#563B97";
const WORKING_GROUP_OPTIONS = ["1", "6", "7", "10", "11", "12", "13"] as const;
const STATUS_OPTIONS = ["New", "In Review", "Completed"] as const;
const REQUESTS_STORAGE_KEY = "tsc-request-records";
const REQUEST_TYPES_STORAGE_KEY = "tsc-request-type-definitions";
const LAST_NOTIFIED_REQUEST_KEY = "tsc-last-notified-request-id";
const TSC_LOGO_SRC = "/tsc-logo.svg";
const PORTAL_VERSION = "0.2.39";
const REQUEST_TYPES_API_ENDPOINT = "/api/request-types";
const REQUESTS_API_ENDPOINT = "/api/requests";
const REQUESTS_SPAM_FILTER_RESET_API_ENDPOINT = "/api/requests/spam-filter/reset";
const STAFF_ACCESS_API_ENDPOINT = "/api/staff-access";
const REQUIRED_ALLOWED_STAFF = ["rdo@sedonaconference.org"] as const;

const REQUEST_TYPE_ICONS = {
  mail: Mail,
  page: FileText,
  clipboard: ClipboardList,
  sparkles: Sparkles,
} as const;

const FIELD_TYPE_OPTIONS = [
  { value: "shortText", label: "Short text" },
  { value: "longText", label: "Long text" },
  { value: "richText", label: "Rich text" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown" },
  { value: "radio", label: "Radio buttons" },
] as const;

const ICON_OPTIONS = [
  { value: "mail", label: "Mail" },
  { value: "page", label: "Page" },
  { value: "clipboard", label: "Checklist" },
  { value: "sparkles", label: "Custom" },
] as const;

type RequestStatus = (typeof STATUS_OPTIONS)[number];
type RequestIconKey = keyof typeof REQUEST_TYPE_ICONS;
type FieldInputType = (typeof FIELD_TYPE_OPTIONS)[number]["value"];
type FieldLayout = "half" | "full";
type View = "home" | "form" | "inbox" | "admin";
type FormValues = Record<string, string>;
type StorageMode = "session" | "shared";
type AuthStatus = "checking" | "anonymous" | "allowed" | "denied";

type RequestFieldDefinition = {
  id: string;
  key: string;
  label: string;
  type: FieldInputType;
  required: boolean;
  layout: FieldLayout;
  options?: string[];
  defaultValue?: string;
};

type RequestTypeDefinition = {
  id: string;
  name: string;
  description: string;
  badge: string;
  icon: RequestIconKey;
  previewHeading: string;
  titleFieldId: string | null;
  summaryFieldId: string | null;
  fields: RequestFieldDefinition[];
  locked?: boolean;
};

type RequestDetail = {
  key: string;
  label: string;
  value: string;
  isRich?: boolean;
  fullWidth?: boolean;
};

type RequestRecord = {
  id: number;
  requestTypeId: string | null;
  type: string;
  title: string;
  requesterInitials: string;
  submittedAt: string;
  status: RequestStatus;
  workingGroup: string;
  summary: string;
  details: RequestDetail[];
};

type AllowedStaffEntry = {
  email: string;
  addedAt: string;
};

type AuthUser = {
  email: string;
  userDetails: string;
  userRoles: string[];
  authorized: boolean;
};

type StaffAccessSelf = {
  email: string;
  userDetails: string;
  authorized: boolean;
};

type CardProps = {
  className?: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary" | "danger";
};

type NativeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
};

type PreviewField = {
  label: string;
  value: string;
  isRich?: boolean;
};

type RequestTypeDraft = {
  name: string;
  description: string;
  badge: string;
  previewHeading: string;
  icon: RequestIconKey;
  titleFieldId: string;
  summaryFieldId: string;
  fields: RequestFieldDefinition[];
};

type RequestFieldDraft = {
  label: string;
  type: FieldInputType;
  required: boolean;
  layout: FieldLayout;
  optionsInput: string;
  defaultValue: string;
};

type ImageRequestMode = "designersChoice" | "provideDescription";

type ImageRequestSelection = {
  mode: ImageRequestMode;
  description: string;
};

type HyperlinkPair = {
  text: string;
  url: string;
};

const seedRequestTypes: RequestTypeDefinition[] = [
  {
    id: "eblast",
    name: "eBlast",
    description: "Request a marketing email with copy, approvals, scheduling, and distribution details.",
    badge: "eBlast request",
    icon: "mail",
    previewHeading: "eBlast Template Request",
    titleFieldId: "mailingName",
    summaryFieldId: "emailSubjectLine",
    locked: true,
    fields: [
      { id: "mailingName", key: "mailingName", label: "Mailing Name", type: "shortText", required: true, layout: "half" },
      { id: "distributionList", key: "distributionList", label: "Distribution List", type: "shortText", required: false, layout: "half", defaultValue: "Everyone" },
      { id: "emailSubjectLine", key: "emailSubjectLine", label: "Email Subject Line", type: "shortText", required: true, layout: "half" },
      { id: "bannerHeadline", key: "bannerHeadline", label: "Banner Headline", type: "shortText", required: true, layout: "half" },
      { id: "bodyCopy", key: "bodyCopy", label: "Body Copy", type: "richText", required: true, layout: "full", defaultValue: "<p></p>" },
      { id: "cleAvailable", key: "cleAvailable", label: "CLE Available?", type: "radio", required: false, layout: "half", options: ["Yes", "No"], defaultValue: "No" },
      { id: "hyperlinks", key: "hyperlinks", label: "Hyperlinks", type: "longText", required: false, layout: "full" },
      { id: "imagesGraphics", key: "imagesGraphics", label: "Images / Graphics", type: "longText", required: false, layout: "full" },
      { id: "approvals", key: "approvals", label: "Approvals", type: "longText", required: true, layout: "half" },
      { id: "exampleOfSimilar", key: "exampleOfSimilar", label: "Example of Similar", type: "shortText", required: false, layout: "half" },
      { id: "dateOfDistribution", key: "dateOfDistribution", label: "Date of Distribution", type: "date", required: true, layout: "half" },
    ],
  },
  {
    id: "program-page",
    name: "Program Page",
    description: "Request a new or updated program page with content, approvals, and publish timing.",
    badge: "Page request",
    icon: "page",
    previewHeading: "Program Page Template Request",
    titleFieldId: "programName",
    summaryFieldId: "bodyCopy",
    locked: true,
    fields: [
      { id: "programName", key: "programName", label: "Program Name", type: "shortText", required: true, layout: "half" },
      { id: "bodyCopy", key: "bodyCopy", label: "Body Copy", type: "richText", required: true, layout: "full", defaultValue: "<p></p>" },
      { id: "date", key: "date", label: "Date", type: "shortText", required: false, layout: "half" },
      { id: "location", key: "location", label: "Location", type: "shortText", required: false, layout: "half" },
      { id: "cleAvailable", key: "cleAvailable", label: "CLE Available?", type: "select", required: false, layout: "half", options: ["Yes", "No"], defaultValue: "No" },
      { id: "imagesGraphics", key: "imagesGraphics", label: "Images / Graphics", type: "longText", required: false, layout: "full" },
      { id: "approvals", key: "approvals", label: "Approvals", type: "longText", required: true, layout: "half" },
      { id: "exampleOfSimilar", key: "exampleOfSimilar", label: "Example of Similar", type: "shortText", required: false, layout: "half" },
      { id: "publishDate", key: "publishDate", label: "Publish Date", type: "date", required: true, layout: "half" },
    ],
  },
  {
    id: "linkedin-post",
    name: "LinkedIn Post",
    description: "Request a LinkedIn post with messaging, assets, approvals, and a preferred publish date.",
    badge: "Social request",
    icon: "sparkles",
    previewHeading: "LinkedIn Post Request",
    titleFieldId: "headlineHook",
    summaryFieldId: "postObjective",
    locked: true,
    fields: [
      { id: "postObjective", key: "postObjective", label: "Post Objective", type: "shortText", required: true, layout: "half" },
      {
        id: "postType",
        key: "postType",
        label: "Post Type",
        type: "select",
        required: true,
        layout: "half",
        options: ["Standard Post", "Carousel (PDF/Slides)", "Image Post", "Video Post", "Article/Newsletter"],
      },
      { id: "postCopy", key: "postCopy", label: "Post Copy", type: "richText", required: true, layout: "full", defaultValue: "<p></p>" },
      { id: "headlineHook", key: "headlineHook", label: "Headline / Hook", type: "shortText", required: true, layout: "half" },
      { id: "callToAction", key: "callToAction", label: "Call to Action (CTA)", type: "shortText", required: true, layout: "half" },
      { id: "taggingMentions", key: "taggingMentions", label: "Tagging / Mentions", type: "longText", required: false, layout: "half" },
      { id: "linksUrls", key: "linksUrls", label: "Links / URLs", type: "longText", required: false, layout: "half" },
      { id: "mediaDescription", key: "mediaDescription", label: "Images / Graphics / Video Description", type: "longText", required: false, layout: "full" },
      { id: "approvals", key: "approvals", label: "Approvals", type: "longText", required: true, layout: "half" },
      { id: "exampleSimilarPost", key: "exampleSimilarPost", label: "Example of Similar Post", type: "shortText", required: false, layout: "half" },
      { id: "preferredPostingDate", key: "preferredPostingDate", label: "Preferred Date of Posting", type: "date", required: true, layout: "half" },
    ],
  },
  {
    id: "online-meetings",
    name: "Online Meetings",
    description: "Request webinar, town hall, or virtual forum support with copy, links, speakers, and approvals.",
    badge: "Meeting request",
    icon: "clipboard",
    previewHeading: "Online Meetings Request",
    titleFieldId: "title",
    summaryFieldId: "bodyCopy",
    locked: true,
    fields: [
      {
        id: "meetingType",
        key: "meetingType",
        label: "Meeting Type",
        type: "select",
        required: true,
        layout: "half",
        options: ["Webinar", "Town Hall", "Virtual Forum"],
      },
      { id: "url", key: "url", label: "URL", type: "shortText", required: false, layout: "half" },
      { id: "title", key: "title", label: "Title", type: "shortText", required: true, layout: "half" },
      { id: "date", key: "date", label: "Date", type: "date", required: true, layout: "half" },
      { id: "timeAndTimeZone", key: "timeAndTimeZone", label: "Time and Time Zone", type: "shortText", required: true, layout: "half" },
      { id: "duration", key: "duration", label: "Duration", type: "shortText", required: false, layout: "half" },
      { id: "bodyCopy", key: "bodyCopy", label: "Body Copy", type: "richText", required: true, layout: "full", defaultValue: "<p></p>" },
      { id: "hyperlinks", key: "hyperlinks", label: "Hyperlinks (if any)", type: "longText", required: false, layout: "full" },
      { id: "image", key: "image", label: "Image (if any)", type: "longText", required: false, layout: "full" },
      { id: "host", key: "host", label: "Host", type: "shortText", required: false, layout: "half" },
      { id: "moderator", key: "moderator", label: "Moderator", type: "shortText", required: false, layout: "half" },
      { id: "panelists", key: "panelists", label: "Panelists", type: "longText", required: false, layout: "full" },
      { id: "registrationFees", key: "registrationFees", label: "Registration Fees", type: "shortText", required: false, layout: "half" },
      { id: "cleLanguage", key: "cleLanguage", label: "CLE Language", type: "longText", required: false, layout: "half" },
      { id: "approvals", key: "approvals", label: "Approvals", type: "longText", required: true, layout: "half" },
      { id: "exampleOfSimilar", key: "exampleOfSimilar", label: "Example of Similar", type: "shortText", required: false, layout: "half" },
    ],
  },
];

const seedRequestTypeMap = Object.fromEntries(seedRequestTypes.map((requestType) => [requestType.id, requestType])) as Record<string, RequestTypeDefinition>;

const seedRequests: RequestRecord[] = [
  buildRequestRecord(
    seedRequestTypeMap.eblast,
    {
      requesterInitials: "JL",
      workingGroup: "6",
      mailingName: "Spring CLE Update",
      distributionList: "Everyone",
      emailSubjectLine: "Spring CLE opportunities are here",
      bannerHeadline: "Build your CLE credits this spring",
      bodyCopy: "<p>Please promote the upcoming spring CLE programs and registration links.</p><ul><li>Update registration links</li><li>Use spring hero</li></ul>",
      cleAvailable: "Yes",
      hyperlinks: JSON.stringify([
        { text: "Spring CLE registration page", url: "https://thesedonaconference.org/spring-cle" },
        { text: "Program landing page", url: "https://thesedonaconference.org/programs" },
      ]),
      imagesGraphics: "Spring event hero image",
      approvals: "Approved by Director of Marketing",
      dateOfDistribution: "2026-03-12",
      exampleOfSimilar: "Winter CLE round-up",
    },
    {
      id: 1001,
      submittedAt: "2026-03-07T10:30:00",
      status: "New",
      summary: "Distribution to everyone with updated CLE messaging and registration links.",
    }
  ),
  buildRequestRecord(
    seedRequestTypeMap["program-page"],
    {
      requesterInitials: "AM",
      workingGroup: "10",
      programName: "Leadership Summit Program Page",
      bodyCopy: "<p>Create a program page featuring agenda, speakers, venue, and registration details.</p><ol><li>Agenda</li><li>Speakers</li><li>Venue</li></ol>",
      date: "April 18, 2026",
      location: "Phoenix Convention Center",
      cleAvailable: "No",
      imagesGraphics: "Summit hero graphic and speaker headshots",
      approvals: "Approved by Programs Director",
      publishDate: "2026-03-20",
      exampleOfSimilar: "2025 Annual Summit page",
    },
    {
      id: 1002,
      submittedAt: "2026-03-08T14:15:00",
      status: "In Review",
      summary: "New event page with registration CTA, venue info, and downloadable agenda.",
    }
  ),
  buildRequestRecord(
    seedRequestTypeMap["linkedin-post"],
    {
      requesterInitials: "RD",
      workingGroup: "1",
      postObjective: "Promote the 2026 Annual Meeting and drive registrations.",
      postType: "Standard Post",
      postCopy:
        "<p>Registration is now open for the 2026 Annual Meeting. Join us for practical dialogue, timely insights, and connections across the community.</p><ul><li>Highlight keynote sessions</li><li>Link to registration</li><li>Tag featured partners</li></ul>",
      headlineHook: "Registration is open for the 2026 Annual Meeting",
      callToAction: "Register now",
      taggingMentions: "@The Sedona Conference, keynote speakers, sponsoring partners",
      linksUrls: "https://thesedonaconference.org/annual-meeting",
      mediaDescription: "Use the event hero graphic with speaker collage for the main image.",
      approvals: "Approved by Marketing Director and Events Team",
      exampleSimilarPost: "https://www.linkedin.com/company/example-post",
      preferredPostingDate: "2026-03-25",
    },
    {
      id: 1003,
      submittedAt: "2026-03-09T09:00:00",
      status: "New",
      summary: "Promote annual meeting registration with partner tags, a hero graphic, and a registration link.",
    }
  ),
  buildRequestRecord(
    seedRequestTypeMap["online-meetings"],
    {
      requesterInitials: "KM",
      workingGroup: "12",
      meetingType: "Webinar",
      url: "https://thesedonaconference.org/webinars/privacy-briefing",
      title: "Privacy Litigation Update",
      date: "2026-04-09",
      timeAndTimeZone: "11:00 AM PT / 2:00 PM ET",
      duration: "60 minutes",
      bodyCopy:
        "<p>Please build a webinar request for our spring privacy litigation update.</p><ul><li>Highlight practical takeaways</li><li>Use speaker credentials in the copy</li><li>Drive registrations from the landing page</li></ul>",
      hyperlinks: JSON.stringify([
        { text: "Register here", url: "https://thesedonaconference.org/webinars/privacy-briefing/register" },
        { text: "Speaker bios", url: "https://thesedonaconference.org/webinars/privacy-briefing/speakers" },
      ]),
      image: JSON.stringify({ mode: "provideDescription", description: "Use a clean webinar title slide with speaker headshots and a privacy-themed background." }),
      host: "The Sedona Conference",
      moderator: "Jane Smith",
      panelists: "Alex Johnson\nPriya Patel\nMorgan Lee",
      registrationFees: "$99 member / $149 non-member",
      cleLanguage: "CLE credit pending in select jurisdictions.",
      approvals: "Approved by Programs Director and Marketing Director",
      exampleOfSimilar: "2025 Data Governance Webinar",
    },
    {
      id: 1004,
      submittedAt: "2026-03-10T11:20:00",
      status: "New",
      summary: "Webinar request with registration links, speaker info, and a custom webinar hero image.",
    }
  ),
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.28, ease: "easeOut" },
};

const softScale = {
  whileHover: { y: -4, scale: 1.01 },
  whileTap: { scale: 0.995 },
  transition: { duration: 0.18, ease: "easeOut" },
};

const celebrationColors = ["#FD5702", "#563B97", "#f59e0b", "#10b981", "#3b82f6", "#ef4444"];

const styles = {
  page: {
    minHeight: "100vh",
    width: "100vw",
    background:
      "radial-gradient(circle at top left, rgba(253,87,2,0.14), transparent 22%), radial-gradient(circle at top right, rgba(86,59,151,0.18), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 52%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    overflowX: "hidden",
    position: "relative",
  },
  orbA: {
    position: "fixed",
    top: -120,
    left: -80,
    width: 340,
    height: 340,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(253,87,2,0.14) 0%, rgba(253,87,2,0.04) 48%, transparent 72%)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  orbB: {
    position: "fixed",
    top: 40,
    right: -110,
    width: 360,
    height: 360,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(86,59,151,0.18) 0%, rgba(86,59,151,0.05) 48%, transparent 72%)",
    filter: "blur(10px)",
    pointerEvents: "none",
  },
  shell: {
    width: "100%",
    maxWidth: 1540,
    margin: "0 auto",
    padding: "36px 24px 56px",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 20,
    flexWrap: "wrap",
    marginBottom: 28,
  },
  heroPanel: {
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(255,255,255,0.78)",
    backdropFilter: "blur(14px)",
    borderRadius: 32,
    boxShadow: "0 20px 60px rgba(15,23,42,0.08)",
    padding: 24,
  },
  pageTitle: {
    fontSize: "clamp(2.2rem, 4.8vw, 3.5rem)",
    lineHeight: 0.98,
    fontWeight: 800,
    letterSpacing: "-0.05em",
    margin: 0,
  },
  subtext: {
    marginTop: 14,
    maxWidth: 760,
    color: "#64748b",
    fontSize: 15,
    lineHeight: 1.75,
  },
  card: {
    width: "100%",
    background: "#ffffff",
    border: "1px solid rgba(226,232,240,0.92)",
    borderRadius: 30,
    boxShadow: "0 18px 45px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
    overflow: "hidden",
    position: "relative",
  },
  cardHeader: {
    padding: 28,
    paddingBottom: 0,
    display: "grid",
    gap: 10,
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },
  cardContent: {
    padding: 28,
    boxSizing: "border-box",
    position: "relative",
    zIndex: 1,
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    padding: "8px 13px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.01em",
    width: "fit-content",
    boxSizing: "border-box",
  },
  iconTile: {
    width: 56,
    height: 56,
    borderRadius: 22,
    background: "linear-gradient(135deg, #6f50c5 0%, #563B97 72%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
    boxShadow: "0 14px 30px rgba(86,59,151,0.28)",
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 30,
    lineHeight: 1.08,
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.03em",
  },
  sectionDesc: {
    fontSize: 14,
    lineHeight: 1.75,
    color: "#64748b",
    margin: 0,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 24,
    width: "100%",
    alignItems: "stretch",
  },
  formLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.7fr) minmax(360px, 1fr)",
    gap: 28,
    width: "100%",
    alignItems: "start",
  },
  adminLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(360px, 0.95fr)",
    gap: 28,
    width: "100%",
    alignItems: "start",
  },
  inboxLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(420px, 1fr) minmax(0, 1.5fr)",
    gap: 28,
    width: "100%",
    alignItems: "start",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 18,
    width: "100%",
    alignItems: "start",
  },
  field: {
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box",
  },
  sidebar: {
    position: "sticky",
    top: 24,
    width: "100%",
  },
  softBox: {
    border: "1px solid rgba(226,232,240,0.96)",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    borderRadius: 22,
    padding: 16,
    boxSizing: "border-box",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92)",
  },
  tintedBox: {
    border: `1px solid ${BRAND_PURPLE}24`,
    background: `linear-gradient(135deg, ${BRAND_ORANGE}10 0%, ${BRAND_PURPLE}12 100%)`,
    borderRadius: 24,
    padding: 18,
    boxSizing: "border-box",
  },
  preview: {
    maxHeight: 460,
    overflow: "auto",
    border: "1px solid rgba(226,232,240,0.95)",
    background: "#ffffff",
    borderRadius: 22,
    padding: 16,
    boxSizing: "border-box",
  },
  richContent: {
    lineHeight: 1.7,
    color: "#475569",
  },
  bellButton: {
    position: "relative",
    width: 62,
    height: 62,
    borderRadius: 999,
    border: "1px solid rgba(226,232,240,0.95)",
    background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
    color: "#334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 16px 34px rgba(15,23,42,0.12)",
    cursor: "pointer",
    flexShrink: 0,
  },
  noticeDot: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    background: "linear-gradient(135deg, #ff625a 0%, #ef4444 100%)",
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 6px",
    boxSizing: "border-box",
    boxShadow: "0 10px 18px rgba(239,68,68,0.35)",
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 190px 190px",
    gap: 14,
    width: "100%",
  },
  requestCard: {
    width: "100%",
    textAlign: "left",
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    borderRadius: 24,
    padding: 18,
    cursor: "pointer",
    transition: "all 0.18s ease",
    boxSizing: "border-box",
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
    width: "100%",
  },
};

function runSelfChecks(): void {
  console.assert(seedRequestTypes.length === 4, "Expected starter request types.");
  console.assert(seedRequestTypes.every((requestType) => requestType.fields.length > 0), "Each starter type should include fields.");
  console.assert(seedRequests.length === 4, "Expected starter requests to exist.");
  console.assert(seedRequests.some((request) => request.details.some((detail) => detail.isRich)), "Seed requests should cover rich field rendering.");
  console.assert(seedRequestTypes.every((requestType) => requestType.fields.some((field) => field.id === requestType.titleFieldId)), "Each starter type needs a title field.");
}

runSelfChecks();
function loadStoredRequestTypes(): RequestTypeDefinition[] {
  if (typeof window === "undefined") return seedRequestTypes;
  try {
    const raw = window.sessionStorage.getItem(REQUEST_TYPES_STORAGE_KEY);
    if (!raw) return seedRequestTypes;
    const parsed = JSON.parse(raw);
    return mergeSeedRequestTypes(parsed);
  } catch {
    return seedRequestTypes;
  }
}

function loadStoredRequests(requestTypes: RequestTypeDefinition[]): RequestRecord[] {
  if (typeof window === "undefined") return seedRequests;
  try {
    const raw = window.sessionStorage.getItem(REQUESTS_STORAGE_KEY);
    if (!raw) return seedRequests;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedRequests;
    const records = parsed
      .map((record) => normalizeRequestRecord(record, requestTypes))
      .filter((record): record is RequestRecord => record !== null);
    return records.length > 0 ? records : seedRequests;
  } catch {
    return seedRequests;
  }
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getApiErrorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") {
    return payload.error;
  }
  return `Request failed with status ${status}.`;
}

async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers ?? {});
  if (init?.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json; charset=utf-8");
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });
  const text = await response.text();
  const payload = text ? tryParseJson(text) : null;

  if (!response.ok) {
    throw new Error(getApiErrorMessage(payload, response.status));
  }

  return payload as T;
}

function extractClientPrincipal(payload: unknown): Record<string, unknown> | null {
  if (payload && typeof payload === "object" && "clientPrincipal" in payload) {
    const principal = (payload as { clientPrincipal?: unknown }).clientPrincipal;
    return principal && typeof principal === "object" ? (principal as Record<string, unknown>) : null;
  }

  if (Array.isArray(payload)) {
    for (const entry of payload) {
      if (!entry || typeof entry !== "object" || !("clientPrincipal" in entry)) continue;
      const principal = (entry as { clientPrincipal?: unknown }).clientPrincipal;
      if (principal && typeof principal === "object") {
        return principal as Record<string, unknown>;
      }
    }
  }

  return null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmailAddress(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));
}

function isRequiredAllowedStaffEmail(value: string): boolean {
  const normalized = normalizeEmail(value);
  return REQUIRED_ALLOWED_STAFF.some((email) => email === normalized);
}

function normalizeAllowedStaffEntry(value: unknown): AllowedStaffEntry | null {
  if (!value || typeof value !== "object") return null;
  const rawValue = value as Record<string, unknown>;
  const email = normalizeEmail(String(rawValue.email ?? ""));
  if (!isValidEmailAddress(email)) return null;

  return {
    email,
    addedAt: typeof rawValue.addedAt === "string" ? rawValue.addedAt : "",
  };
}

function normalizeStaffAccessSelf(value: unknown): StaffAccessSelf | null {
  if (!value || typeof value !== "object") return null;
  const rawValue = value as Record<string, unknown>;
  const email = normalizeEmail(String(rawValue.email ?? ""));
  if (!isValidEmailAddress(email)) return null;

  return {
    email,
    userDetails: typeof rawValue.userDetails === "string" && rawValue.userDetails.trim() ? rawValue.userDetails : email,
    authorized: Boolean(rawValue.authorized),
  };
}

async function loadAuthUser(): Promise<AuthUser | null> {
  try {
    const payload = await apiRequest<unknown>("/.auth/me");
    const clientPrincipal = extractClientPrincipal(payload);
    if (!clientPrincipal) return null;

    const userDetails = typeof clientPrincipal.userDetails === "string" ? clientPrincipal.userDetails : "";
    const userRoles = Array.isArray(clientPrincipal.userRoles) ? clientPrincipal.userRoles.filter((role): role is string => typeof role === "string") : [];
    const email = normalizeEmail(userDetails);
    if (!isValidEmailAddress(email)) return null;

    return {
      email,
      userDetails: userDetails || email || "Signed-in staff member",
      userRoles,
      authorized: false,
    };
  } catch {
    return null;
  }
}

function getCurrentBrowserLocation(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

async function loadRemoteRequestTypes(): Promise<RequestTypeDefinition[]> {
  const payload = await apiRequest<unknown>(REQUEST_TYPES_API_ENDPOINT);
  return mergeSeedRequestTypes(payload);
}

async function loadRemoteRequests(requestTypes: RequestTypeDefinition[]): Promise<RequestRecord[]> {
  const payload = await apiRequest<unknown>(REQUESTS_API_ENDPOINT);
  if (!Array.isArray(payload)) return [];

  return payload
    .map((record) => normalizeRequestRecord(record, requestTypes))
    .filter((record): record is RequestRecord => record !== null)
    .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
}

async function loadRemoteStaffAccessSelf(): Promise<StaffAccessSelf> {
  const payload = await apiRequest<unknown>(`${STAFF_ACCESS_API_ENDPOINT}/self`);
  const normalized = normalizeStaffAccessSelf(payload);
  if (!normalized) {
    throw new Error("Staff access details could not be loaded.");
  }
  return normalized;
}

async function loadRemoteAllowedStaff(): Promise<AllowedStaffEntry[]> {
  const payload = await apiRequest<unknown>(STAFF_ACCESS_API_ENDPOINT);
  if (!Array.isArray(payload)) return [];

  return payload
    .map((entry) => normalizeAllowedStaffEntry(entry))
    .filter((entry): entry is AllowedStaffEntry => entry !== null)
    .sort((left, right) => left.email.localeCompare(right.email));
}

async function saveRemoteAllowedStaff(email: string): Promise<AllowedStaffEntry> {
  const payload = await apiRequest<unknown>(STAFF_ACCESS_API_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  const normalized = normalizeAllowedStaffEntry(payload);
  if (!normalized) {
    throw new Error("Approved staff login could not be loaded.");
  }
  return normalized;
}

async function deleteRemoteAllowedStaff(email: string): Promise<void> {
  await apiRequest<unknown>(`${STAFF_ACCESS_API_ENDPOINT}/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
}

async function saveRemoteRequestType(requestType: RequestTypeDefinition): Promise<RequestTypeDefinition> {
  const payload = await apiRequest<unknown>(REQUEST_TYPES_API_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(requestType),
  });
  const normalized = normalizeRequestTypeDefinition(payload);
  if (!normalized) {
    throw new Error("Saved request type could not be loaded.");
  }
  return normalized;
}

async function deleteRemoteRequestType(requestTypeId: string): Promise<void> {
  await apiRequest<unknown>(`${REQUEST_TYPES_API_ENDPOINT}/${encodeURIComponent(requestTypeId)}`, {
    method: "DELETE",
  });
}

async function saveRemoteRequest(request: RequestRecord, requestTypes: RequestTypeDefinition[]): Promise<RequestRecord> {
  const payload = await apiRequest<unknown>(REQUESTS_API_ENDPOINT, {
    method: "POST",
    body: JSON.stringify(request),
  });
  const normalized = normalizeRequestRecord(payload, requestTypes);
  if (!normalized) {
    throw new Error("Saved request could not be loaded.");
  }
  return normalized;
}

async function updateRemoteRequestStatus(requestId: number, nextStatus: RequestStatus, requestTypes: RequestTypeDefinition[]): Promise<RequestRecord> {
  const payload = await apiRequest<unknown>(`${REQUESTS_API_ENDPOINT}/${encodeURIComponent(String(requestId))}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: nextStatus }),
  });
  const normalized = normalizeRequestRecord(payload, requestTypes);
  if (!normalized) {
    throw new Error("Updated request could not be loaded.");
  }
  return normalized;
}

async function deleteRemoteRequest(requestId: number): Promise<void> {
  await apiRequest<unknown>(`${REQUESTS_API_ENDPOINT}/${encodeURIComponent(String(requestId))}`, {
    method: "DELETE",
  });
}

async function resetRemoteRequestSpamFilter(): Promise<void> {
  await apiRequest<unknown>(REQUESTS_SPAM_FILTER_RESET_API_ENDPOINT, {
    method: "POST",
  });
}

export default function App(): JSX.Element {
  const initialRequestTypesRef = useRef<RequestTypeDefinition[]>(loadStoredRequestTypes());
  const initialRequestsRef = useRef<RequestRecord[]>(loadStoredRequests(initialRequestTypesRef.current));

  const [showSuccessFlash, setShowSuccessFlash] = useState(false);
  const [completionCelebration, setCompletionCelebration] = useState<{ id: number; title: string } | null>(null);
  const [view, setView] = useState<View>("home");
  const [authStatus, setAuthStatus] = useState<AuthStatus>(typeof window === "undefined" ? "anonymous" : "checking");
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [allowedStaff, setAllowedStaff] = useState<AllowedStaffEntry[]>([]);
  const [storageMode, setStorageMode] = useState<StorageMode>("session");
  const [isDataReady, setIsDataReady] = useState(typeof window === "undefined");
  const [requestTypes, setRequestTypes] = useState<RequestTypeDefinition[]>(initialRequestTypesRef.current);
  const [requests, setRequests] = useState<RequestRecord[]>(initialRequestsRef.current);
  const [activeRequestTypeId, setActiveRequestTypeId] = useState<string>(initialRequestTypesRef.current[0]?.id ?? seedRequestTypes[0].id);
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(initialRequestsRef.current[0]?.id ?? null);
  const isNarrow = useMediaQuery("(max-width: 980px)");

  const openRequestCount = useMemo(() => requests.filter((request) => request.status !== "Completed").length, [requests]);
  const activeRequestType = requestTypes.find((requestType) => requestType.id === activeRequestTypeId) ?? requestTypes[0] ?? null;
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const hasMicrosoftSession = authStatus === "allowed" || authStatus === "denied";
  const isStaffAuthorized = authStatus === "allowed";
  const isStorageConnected = isDataReady && storageMode === "shared";
  const storageBadgeLabel = !isDataReady ? "Checking Azure storage" : storageMode === "shared" ? "Shared Azure storage" : "Session storage fallback";
  const storageIndicatorLabel = !isDataReady ? "Checking Azure storage" : isStorageConnected ? "Azure storage connected" : "Azure storage not connected";
  const storageDescription =
    storageMode === "shared"
      ? isStaffAuthorized
        ? "Anyone can submit requests, and approved staff can review the shared inbox and manage request types."
        : hasMicrosoftSession
          ? "Anyone can submit requests. This signed-in account is not currently approved for staff inbox access."
          : "Anyone can submit requests. Staff inbox access and request-type controls appear after approved staff sign-in."
      : "Requests and custom request types stay in this browser session until the shared Azure backend is connected.";

  const startStaffSignIn = () => {
    if (typeof window === "undefined") return;
    window.location.assign(`/.auth/login/aad?post_login_redirect_uri=${encodeURIComponent(getCurrentBrowserLocation())}`);
  };

  const startStaffSignOut = () => {
    if (typeof window === "undefined") return;
    window.location.assign(`/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(getCurrentBrowserLocation())}`);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    let canceled = false;

    const loadInitialData = async () => {
      const nextAuthUser = await loadAuthUser();
      if (canceled) return;

      try {
        const nextRequestTypes = await loadRemoteRequestTypes();
        if (canceled) return;
        setRequestTypes(nextRequestTypes);
        setStorageMode("shared");
        if (nextAuthUser) {
          const staffAccess = await loadRemoteStaffAccessSelf();
          if (canceled) return;
          const resolvedAuthUser: AuthUser = {
            email: staffAccess.email,
            userDetails: staffAccess.userDetails || nextAuthUser.userDetails,
            userRoles: nextAuthUser.userRoles,
            authorized: staffAccess.authorized,
          };
          setAuthUser(resolvedAuthUser);
          setAuthStatus(staffAccess.authorized ? "allowed" : "denied");

          if (staffAccess.authorized) {
            const [nextRequests, nextAllowedStaff] = await Promise.all([loadRemoteRequests(nextRequestTypes), loadRemoteAllowedStaff()]);
            if (canceled) return;
            setRequests(nextRequests);
            setAllowedStaff(nextAllowedStaff);
          } else {
            setRequests([]);
            setAllowedStaff([]);
          }
        } else {
          setAuthUser(null);
          setAuthStatus("anonymous");
          setRequests([]);
          setAllowedStaff([]);
        }
      } catch (error) {
        if (canceled) return;
        console.warn("Shared Azure storage unavailable. Falling back to session storage.", error);
        const fallbackRequestTypes = loadStoredRequestTypes();
        const fallbackRequests = loadStoredRequests(fallbackRequestTypes);
        setRequestTypes(fallbackRequestTypes);
        setRequests(fallbackRequests);
        setAllowedStaff([]);
        setStorageMode("session");
        setAuthStatus("anonymous");
        setAuthUser(null);
      } finally {
        if (!canceled) {
          setIsDataReady(true);
        }
      }
    };

    void loadInitialData();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDataReady || storageMode !== "session") return;
    window.sessionStorage.setItem(REQUEST_TYPES_STORAGE_KEY, JSON.stringify(requestTypes));
  }, [isDataReady, requestTypes, storageMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isDataReady || storageMode !== "session") return;
    window.sessionStorage.setItem(REQUESTS_STORAGE_KEY, JSON.stringify(requests));
  }, [isDataReady, requests, storageMode]);

  useEffect(() => {
    if (!completionCelebration) return;
    if (typeof window === "undefined") return;
    const timeout = window.setTimeout(() => setCompletionCelebration(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [completionCelebration]);

  useEffect(() => {
    if (requestTypes.length === 0) return;
    if (requestTypes.some((requestType) => requestType.id === activeRequestTypeId)) return;
    setActiveRequestTypeId(requestTypes[0].id);
    if (view === "form") {
      setView("home");
    }
  }, [activeRequestTypeId, requestTypes, view]);

  useEffect(() => {
    if (requests.length === 0) {
      setSelectedRequestId(null);
      return;
    }
    if (selectedRequestId !== null && requests.some((request) => request.id === selectedRequestId)) return;
    setSelectedRequestId(requests[0].id);
  }, [requests, selectedRequestId]);

  useEffect(() => {
    if (!isDataReady) return;
    if (typeof window === "undefined") return;
    if (requests.length === 0) return;
    if (!("Notification" in window)) return;

    const newestRequest = requests[0];
    const lastNotifiedId = window.sessionStorage.getItem(LAST_NOTIFIED_REQUEST_KEY);

    if (window.Notification.permission === "default") {
      window.Notification.requestPermission().catch(() => undefined);
    }

    if (lastNotifiedId === null) {
      window.sessionStorage.setItem(LAST_NOTIFIED_REQUEST_KEY, String(newestRequest.id));
      return;
    }

    if (String(newestRequest.id) !== lastNotifiedId && window.Notification.permission === "granted") {
      new window.Notification("New TSC Operations request", {
        body: `${newestRequest.type} - ${newestRequest.title} - WG ${newestRequest.workingGroup}`,
      });
      window.sessionStorage.setItem(LAST_NOTIFIED_REQUEST_KEY, String(newestRequest.id));
    }
  }, [isDataReady, requests]);

  const handleCreateRequest = async (request: RequestRecord): Promise<boolean> => {
    try {
      const savedRequest = storageMode === "shared" ? await saveRemoteRequest(request, requestTypes) : request;
      setRequests((prev) => [savedRequest, ...prev.filter((item) => item.id !== savedRequest.id)]);
      setSelectedRequestId(savedRequest.id);
      setShowSuccessFlash(true);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the request.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleCreateRequestType = async (requestType: RequestTypeDefinition): Promise<boolean> => {
    try {
      const savedRequestType = storageMode === "shared" ? await saveRemoteRequestType(requestType) : requestType;
      setRequestTypes((prev) => {
        if (prev.some((item) => item.id === savedRequestType.id)) {
          return prev.map((item) => (item.id === savedRequestType.id ? savedRequestType : item));
        }
        return [...prev, savedRequestType];
      });
      setActiveRequestTypeId(savedRequestType.id);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the request type.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleDeleteRequestType = async (requestTypeId: string): Promise<boolean> => {
    try {
      if (storageMode === "shared") {
        await deleteRemoteRequestType(requestTypeId);
      }
      setRequestTypes((prev) => prev.filter((requestType) => requestType.id !== requestTypeId));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete the request type.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleUpdateRequestStatus = async (requestId: number, nextStatus: RequestStatus) => {
    const currentRequest = requests.find((request) => request.id === requestId) ?? null;

    try {
      if (storageMode === "shared") {
        const updatedRequest = await updateRemoteRequestStatus(requestId, nextStatus, requestTypes);
        setRequests((prev) => prev.map((request) => (request.id === requestId ? updatedRequest : request)));
      } else {
        setRequests((prev) =>
          prev.map((request) => {
            if (request.id !== requestId) return request;
            return { ...request, status: nextStatus };
          })
        );
      }

      if (currentRequest && currentRequest.status !== "Completed" && nextStatus === "Completed") {
        setCompletionCelebration({ id: requestId, title: currentRequest.title });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update the request status.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
    }
  };

  const handleDeleteRequest = async (requestId: number): Promise<boolean> => {
    try {
      if (storageMode === "shared") {
        await deleteRemoteRequest(requestId);
      }

      setRequests((prev) => prev.filter((request) => request.id !== requestId));
      setSelectedRequestId((prev) => (prev === requestId ? null : prev));
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to delete the request.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleAddAllowedStaff = async (email: string): Promise<boolean> => {
    try {
      const savedEntry = await saveRemoteAllowedStaff(email);
      setAllowedStaff((prev) => {
        if (prev.some((entry) => entry.email === savedEntry.email)) {
          return prev;
        }
        return [...prev, savedEntry].sort((left, right) => left.email.localeCompare(right.email));
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save the approved staff login.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleRemoveAllowedStaff = async (email: string): Promise<boolean> => {
    try {
      const normalizedEmail = normalizeEmail(email);
      if (isRequiredAllowedStaffEmail(normalizedEmail)) {
        throw new Error(`${normalizedEmail} must always remain approved for staff access.`);
      }

      await deleteRemoteAllowedStaff(normalizedEmail);
      setAllowedStaff((prev) => prev.filter((entry) => entry.email !== normalizedEmail));

      if (authUser?.email === normalizedEmail) {
        setAuthStatus("denied");
        setAuthUser((prev) => (prev ? { ...prev, authorized: false } : prev));
        setRequests([]);
        if (view === "admin" || view === "inbox") {
          setView("home");
        }
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to remove the approved staff login.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleResetRequestSpamFilter = async (): Promise<boolean> => {
    try {
      if (storageMode !== "shared") {
        throw new Error("The spam filter is only available when the portal is connected to shared Azure storage.");
      }

      await resetRemoteRequestSpamFilter();
      if (typeof window !== "undefined") {
        window.alert("Spam filter reset. Public submission counts were cleared for the current 24-hour window.");
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to reset the spam filter.";
      if (typeof window !== "undefined") {
        window.alert(message);
      }
      return false;
    }
  };

  const handleOpenInbox = () => {
    setView("inbox");
  };

  return (
    <div style={styles.page}>
      <div style={styles.orbA} />
      <div style={styles.orbB} />
      <div
        aria-label={storageIndicatorLabel}
        title={storageIndicatorLabel}
        style={{
          position: "fixed",
          left: 22,
          bottom: 22,
          width: 14,
          height: 14,
          borderRadius: 999,
          display: "inline-flex",
          background: isStorageConnected ? "#16a34a" : "#dc2626",
          boxShadow: isStorageConnected ? "0 0 0 4px rgba(22,163,74,0.16)" : "0 0 0 4px rgba(220,38,38,0.14)",
          zIndex: 20,
        }}
      />
      <div
        aria-label={`Portal version ${PORTAL_VERSION}`}
        title={`Portal version ${PORTAL_VERSION}`}
        style={{
          position: "fixed",
          right: 22,
          bottom: 18,
          borderRadius: 999,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(226,232,240,0.96)",
          boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
          backdropFilter: "blur(10px)",
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: "0.02em",
          color: "#475569",
          zIndex: 20,
        }}
      >
        v{PORTAL_VERSION}
      </div>
      <div style={styles.shell}>
        <motion.header style={styles.header} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
          <div style={styles.heroPanel}>
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} style={{ marginBottom: 18 }}>
              <img
                src={TSC_LOGO_SRC}
                alt="The Sedona Conference"
                style={{ width: "min(260px, 100%)", height: "auto", display: "block" }}
              />
            </motion.div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <motion.h1 style={styles.pageTitle} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.04 }}>
                TSC Operations Portal
              </motion.h1>
              <AnimatePresence>
                {storageMode === "shared" && hasMicrosoftSession && authUser && (
                  <motion.div {...fadeUp}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Badge variant="secondary" style={styles.badge}>
                        Signed in: {authUser.email}
                      </Badge>
                      {!isStaffAuthorized && (
                        <Badge style={{ ...styles.badge, background: "#fff1f2", color: "#be123c" }}>
                          Not approved for staff access
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {storageMode === "shared" && isStaffAuthorized && (
                  <motion.div {...fadeUp}>
                    <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>Staff access approved</Badge>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.p style={styles.subtext} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.08 }}>
              Submit requests and review the inbox from one place. Request-type controls stay tucked inside the notifications area so the home screen stays focused on the forms. {storageDescription}
            </motion.p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", justifyContent: "flex-end" }}>
            {storageMode === "shared" && !hasMicrosoftSession && (
              <Button variant="outline" onClick={startStaffSignIn}>
                Staff sign in
              </Button>
            )}
            {storageMode === "shared" && hasMicrosoftSession && (
              <Button variant="outline" onClick={startStaffSignOut}>
                {isStaffAuthorized ? "Staff sign out" : "Switch account"}
              </Button>
            )}
            <motion.button
              type="button"
              aria-label={storageMode === "shared" && !hasMicrosoftSession ? "Open staff inbox sign-in" : "Open inbox"}
              onClick={handleOpenInbox}
              style={styles.bellButton}
              whileHover={{ y: -3, rotate: -8, boxShadow: "0 18px 30px rgba(15,23,42,0.16)" }}
              whileTap={{ scale: 0.96, rotate: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 20 }}
            >
              <Bell size={28} strokeWidth={2.25} />
              <AnimatePresence>
                {isDataReady && openRequestCount > 0 && (
                  <motion.span
                    style={styles.noticeDot}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 18 }}
                  >
                    {openRequestCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <AnimatePresence>
              {view !== "home" && (
                <motion.div {...fadeUp}>
                  <Button variant="outline" onClick={() => setView("home")}>
                    <ArrowLeft size={16} />
                    Back to home
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        <AnimatePresence>
          {showSuccessFlash && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(15, 23, 42, 0.22)",
                backdropFilter: "blur(7px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 24,
                overflow: "hidden",
              }}
            >
              <CelebrationConfetti scopeId="submission-success" count={20} />
              <motion.div
                initial={{ y: 18, scale: 0.94 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: -10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                style={{
                  width: "min(430px, 100%)",
                  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
                  borderRadius: 30,
                  padding: 30,
                  boxShadow: "0 28px 60px rgba(15,23,42,0.22)",
                  border: "1px solid rgba(226,232,240,0.95)",
                  textAlign: "center",
                }}
              >
                <motion.div
                  initial={{ scale: 0.6, rotate: -12 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 18, delay: 0.05 }}
                  style={{
                    width: 78,
                    height: 78,
                    margin: "0 auto 18px",
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)",
                    color: "#166534",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 14px 30px rgba(22,101,52,0.18)",
                  }}
                >
                  <CheckCircle2 size={36} strokeWidth={2.5} />
                </motion.div>
                <motion.h3 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }} style={{ margin: 0, fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.03em" }}>
                  Request sent
                </motion.h3>
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, delay: 0.16 }} style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.65 }}>
                  {storageMode === "shared"
                    ? "Your request has been sent to the shared Operations inbox."
                    : "Your request has been sent to the Operations inbox for this browser session."}
                </motion.p>
                <div style={{ marginTop: 20 }}>
                  <Button
                    style={{ width: "100%", background: `linear-gradient(135deg, ${BRAND_ORANGE} 0%, #ff7c30 100%)`, color: "white", boxShadow: "0 16px 28px rgba(253,87,2,0.26)" }}
                    onClick={() => {
                      setShowSuccessFlash(false);
                      setView("home");
                    }}
                  >
                    Send another request
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {completionCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{
                position: "fixed",
                inset: 0,
                pointerEvents: "none",
                zIndex: 1200,
                overflow: "hidden",
              }}
            >
              <CelebrationConfetti scopeId={completionCelebration.id} count={28} />

              <motion.div
                initial={{ opacity: 0, y: 14, scale: 0.94 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                style={{
                  position: "absolute",
                  top: 28,
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "rgba(255,255,255,0.92)",
                  border: "1px solid rgba(226,232,240,0.96)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 22,
                  padding: "14px 18px",
                  boxShadow: "0 20px 40px rgba(15,23,42,0.14)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  minWidth: 280,
                  maxWidth: "min(560px, calc(100vw - 32px))",
                }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 999, background: "linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#166534", flexShrink: 0 }}>
                  <CheckCircle2 size={22} strokeWidth={2.6} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>Marked as completed</div>
                  <div style={{ fontSize: 13, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{completionCelebration.title}</div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isDataReady ? (
          <motion.div key="loading" {...fadeUp}>
            <div style={{ maxWidth: 760, margin: "0 auto" }}>
              <Card>
                <CardHeader>
                  <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>{storageBadgeLabel}</Badge>
                  <CardTitle>Preparing portal data</CardTitle>
                  <CardDescription>Checking whether the shared Azure backend is available for requests and request-type definitions.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div style={{ ...styles.softBox, display: "grid", gap: 10 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Loading request types and inbox records</div>
                    <div style={{ color: "#64748b", lineHeight: 1.7 }}>
                      If Azure storage is configured, the portal will switch to shared mode automatically. Otherwise it will keep using the current session-only fallback.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
          {view === "home" && (
            <motion.div key="home" {...fadeUp}>
              <HomeScreen
                requestTypes={requestTypes}
                onSelectRequestType={(requestTypeId) => {
                  setActiveRequestTypeId(requestTypeId);
                  setView("form");
                }}
              />
            </motion.div>
          )}

          {view === "form" && activeRequestType && (
            <motion.div key={`form-${activeRequestType.id}`} {...fadeUp}>
              <RequestTypeForm requestType={activeRequestType} onSubmitRequest={handleCreateRequest} isNarrow={isNarrow} storageMode={storageMode} />
            </motion.div>
          )}

          {(view === "inbox" || view === "admin") && storageMode === "shared" && authStatus === "anonymous" && (
            <motion.div key={`staff-sign-in-${view}`} {...fadeUp}>
              <StaffSignInScreen purpose={view === "admin" ? "the request-type controls" : "the staff inbox"} onSignIn={startStaffSignIn} />
            </motion.div>
          )}

          {(view === "inbox" || view === "admin") && storageMode === "shared" && authStatus === "denied" && (
            <motion.div key={`staff-denied-${view}`} {...fadeUp}>
              <StaffAccessDeniedScreen authUser={authUser} onSignOut={startStaffSignOut} />
            </motion.div>
          )}

          {view === "inbox" && !(storageMode === "shared" && (authStatus === "anonymous" || authStatus === "denied")) && (
            <motion.div key="inbox" {...fadeUp}>
              <InboxScreen
                requests={requests}
                selectedRequest={selectedRequest}
                onSelectRequest={setSelectedRequestId}
                onUpdateRequestStatus={handleUpdateRequestStatus}
                onDeleteRequest={handleDeleteRequest}
                onOpenAdmin={() => setView("admin")}
                isNarrow={isNarrow}
              />
            </motion.div>
          )}

          {view === "admin" && !(storageMode === "shared" && (authStatus === "anonymous" || authStatus === "denied")) && (
            <motion.div key="admin" {...fadeUp}>
              <AdminScreen
                requestTypes={requestTypes}
                requests={requests}
                authUser={authUser}
                allowedStaff={allowedStaff}
                onCreateRequestType={handleCreateRequestType}
                onDeleteRequestType={handleDeleteRequestType}
                onAddAllowedStaff={handleAddAllowedStaff}
                onRemoveAllowedStaff={handleRemoveAllowedStaff}
                onResetRequestSpamFilter={handleResetRequestSpamFilter}
                storageMode={storageMode}
                onOpenRequestType={(requestTypeId) => {
                  setActiveRequestTypeId(requestTypeId);
                  setView("form");
                }}
                isNarrow={isNarrow}
              />
            </motion.div>
          )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function StaffSignInScreen({ purpose, onSignIn }: { purpose: string; onSignIn: () => void }): JSX.Element {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <Card>
        <CardHeader>
          <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>Staff sign-in required</Badge>
          <CardTitle>Public submission is open</CardTitle>
          <CardDescription>Anyone can submit a request, but approved staff must sign in with Microsoft before opening {purpose}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ ...styles.softBox, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>What stays protected</div>
              <div style={{ color: "#64748b", lineHeight: 1.7 }}>
                The shared inbox, request status updates, and request-type management stay behind approved staff sign-in. Public visitors can still submit requests from the home screen.
              </div>
            </div>
            <Button style={{ width: "100%", background: `linear-gradient(135deg, ${BRAND_PURPLE} 0%, #6f50c5 100%)`, color: "white", boxShadow: "0 16px 30px rgba(86,59,151,0.25)" }} onClick={onSignIn}>
              Sign in with Microsoft
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StaffAccessDeniedScreen({ authUser, onSignOut }: { authUser: AuthUser | null; onSignOut: () => void }): JSX.Element {
  return (
    <div style={{ maxWidth: 620, margin: "0 auto" }}>
      <Card>
        <CardHeader>
          <Badge style={{ ...styles.badge, background: "#fff1f2", color: "#be123c" }}>Staff access denied</Badge>
          <CardTitle>This Microsoft account is not approved</CardTitle>
          <CardDescription>
            {authUser?.email ? `${authUser.email} is signed in, but it is not on the approved staff allowlist for the shared inbox.` : "This Microsoft account is not on the approved staff allowlist for the shared inbox."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ ...styles.softBox, display: "grid", gap: 8 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>What to do next</div>
              <div style={{ color: "#64748b", lineHeight: 1.7 }}>
                Ask an approved staff member to add this email address in the admin panel, or sign out and use one of the approved Sedona Conference staff accounts.
              </div>
            </div>
            <Button style={{ width: "100%", background: `linear-gradient(135deg, ${BRAND_PURPLE} 0%, #6f50c5 100%)`, color: "white", boxShadow: "0 16px 30px rgba(86,59,151,0.25)" }} onClick={onSignOut}>
              Sign out and switch account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function HomeScreen({
  requestTypes,
  onSelectRequestType,
}: {
  requestTypes: RequestTypeDefinition[];
  onSelectRequestType: (requestTypeId: string) => void;
}): JSX.Element {
  return (
    <div style={styles.cardGrid}>
      {requestTypes.map((requestType, index) => {
        const Icon = REQUEST_TYPE_ICONS[requestType.icon];
        return (
          <motion.div key={requestType.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.05 }} whileHover={{ y: -8 }} style={{ height: "100%" }}>
            <Card style={{ minHeight: 240, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <CardHeader>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={styles.iconTile}>
                    <Icon size={24} />
                  </div>
                  <Badge variant="secondary" style={{ ...styles.badge, padding: "6px 10px", fontSize: 11, flexShrink: 0 }}>
                    {requestType.fields.length} fields
                  </Badge>
                </div>
                <CardTitle style={{ fontSize: 26, lineHeight: 1.08 }}>{requestType.name}</CardTitle>
                <CardDescription
                  style={{
                    minHeight: 74,
                    maxHeight: 74,
                    overflow: "hidden",
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {requestType.description}
                </CardDescription>
              </CardHeader>
              <CardContent style={{ marginTop: "auto" }}>
                <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }} transition={{ type: "spring", stiffness: 320, damping: 18 }}>
                  <Button style={{ width: "100%", background: `linear-gradient(135deg, ${BRAND_ORANGE} 0%, #ff7c30 100%)`, color: "white", boxShadow: "0 16px 30px rgba(253,87,2,0.28)" }} onClick={() => onSelectRequestType(requestType.id)}>
                    Open form
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}

    </div>
  );
}

function RequestTypeForm({
  requestType,
  onSubmitRequest,
  isNarrow,
  storageMode,
}: {
  requestType: RequestTypeDefinition;
  onSubmitRequest: (request: RequestRecord) => Promise<boolean>;
  isNarrow: boolean;
  storageMode: StorageMode;
}): JSX.Element {
  const [form, setForm] = useState<FormValues>(() => buildFormDefaults(requestType));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm(buildFormDefaults(requestType));
  }, [requestType]);

  const requiredMissing = useMemo(() => {
    const missing: string[] = [];

    if (!form.requesterInitials?.trim()) {
      missing.push("Requester Initials");
    }

    if (!form.workingGroup?.trim()) {
      missing.push("Working Group");
    }

    requestType.fields.forEach((field) => {
      if (!field.required) return;
      if (!hasFieldValue(field, form[field.key] ?? "")) {
        missing.push(field.label);
      }
    });

    return missing;
  }, [form, requestType]);

  const previewFields = useMemo<PreviewField[]>(
    () => [
      { label: "Requester Initials", value: form.requesterInitials ?? "" },
      { label: "Working Group", value: form.workingGroup ?? "" },
      ...requestType.fields.map((field) => ({
        label: field.label,
        value: getFieldDisplayValue(field, form[field.key] ?? ""),
        isRich: field.type === "richText",
      })),
    ],
    [form, requestType]
  );

  const requestTitle = resolveRequestTitle(requestType, form);

  const handleFieldChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (requiredMissing.length > 0 || isSubmitting) return;
    setIsSubmitting(true);
    const wasSaved = await onSubmitRequest(
      buildRequestRecord(requestType, form, {
        id: Date.now(),
        submittedAt: new Date().toISOString(),
        status: "New",
      })
    );
    setIsSubmitting(false);
    if (wasSaved) {
      setForm(buildFormDefaults(requestType));
    }
  };

  return (
    <TemplateFormLayout
      title={`${requestType.name} Form`}
      description={`${requestType.description} ${storageMode === "shared" ? "Submitting will send the request to the shared Operations inbox." : "Submitting will send the request to the Operations inbox for this browser session."}`}
      badge={requestType.badge}
      requestTitle={requestTitle}
      previewContent={renderPreviewContent(requestType.previewHeading, previewFields)}
      requiredMissing={requiredMissing}
      onReset={() => setForm(buildFormDefaults(requestType))}
      onSubmit={handleSubmit}
      submitLabel="Send to Operations"
      isNarrow={isNarrow}
      isSubmitting={isSubmitting}
      storageMode={storageMode}
    >
      <div style={{ display: "grid", gap: 18 }}>
        <div style={styles.formGrid}>
          <TextInput label="Requester Initials" value={form.requesterInitials ?? ""} onChange={(value) => handleFieldChange("requesterInitials", value)} required />
          <WorkingGroupSelect value={form.workingGroup ?? ""} onChange={(value) => handleFieldChange("workingGroup", value)} required />

          {requestType.fields.map((field) => (
            <div key={field.id} style={{ gridColumn: field.layout === "full" ? "1 / -1" : undefined }}>
              <DynamicFieldInput field={field} value={form[field.key] ?? ""} onChange={(value) => handleFieldChange(field.key, value)} requestTypeId={requestType.id} />
            </div>
          ))}
        </div>
      </div>
    </TemplateFormLayout>
  );
}

function AdminScreen({
  requestTypes,
  requests,
  authUser,
  allowedStaff,
  onCreateRequestType,
  onDeleteRequestType,
  onAddAllowedStaff,
  onRemoveAllowedStaff,
  onResetRequestSpamFilter,
  onOpenRequestType,
  isNarrow,
  storageMode,
}: {
  requestTypes: RequestTypeDefinition[];
  requests: RequestRecord[];
  authUser: AuthUser | null;
  allowedStaff: AllowedStaffEntry[];
  onCreateRequestType: (requestType: RequestTypeDefinition) => Promise<boolean>;
  onDeleteRequestType: (requestTypeId: string) => Promise<boolean>;
  onAddAllowedStaff: (email: string) => Promise<boolean>;
  onRemoveAllowedStaff: (email: string) => Promise<boolean>;
  onResetRequestSpamFilter: () => Promise<boolean>;
  onOpenRequestType: (requestTypeId: string) => void;
  isNarrow: boolean;
  storageMode: StorageMode;
}): JSX.Element {
  const [draft, setDraft] = useState<RequestTypeDraft>(createEmptyRequestTypeDraft());
  const [fieldDraft, setFieldDraft] = useState<RequestFieldDraft>(createEmptyRequestFieldDraft());
  const [staffEmailDraft, setStaffEmailDraft] = useState("");
  const [isSavingType, setIsSavingType] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [isSavingStaffEmail, setIsSavingStaffEmail] = useState(false);
  const [removingStaffEmail, setRemovingStaffEmail] = useState<string | null>(null);
  const [isResettingSpamFilter, setIsResettingSpamFilter] = useState(false);

  const requestCounts = useMemo(() => {
    return requests.reduce<Record<string, number>>((accumulator, request) => {
      const key = request.requestTypeId ?? request.type;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [requests]);

  const canAddField = useMemo(() => {
    if (!fieldDraft.label.trim()) return false;
    if (fieldDraft.type === "select" || fieldDraft.type === "radio") {
      return parseOptions(fieldDraft.optionsInput).length > 0;
    }
    return true;
  }, [fieldDraft]);

  const canSaveType = draft.name.trim().length > 0 && draft.description.trim().length > 0 && draft.fields.length > 0;
  const normalizedStaffEmailDraft = normalizeEmail(staffEmailDraft);
  const canAddStaffEmail =
    storageMode === "shared" &&
    isValidEmailAddress(normalizedStaffEmailDraft) &&
    !allowedStaff.some((entry) => entry.email === normalizedStaffEmailDraft);

  const handleAddField = () => {
    if (!canAddField) return;
    const nextField = createFieldDefinitionFromDraft(fieldDraft, draft.fields);
    setDraft((prev) => ({
      ...prev,
      fields: [...prev.fields, nextField],
      titleFieldId: prev.titleFieldId || nextField.id,
    }));
    setFieldDraft(createEmptyRequestFieldDraft());
  };

  const handleRemoveField = (fieldId: string) => {
    setDraft((prev) => {
      const remainingFields = prev.fields.filter((field) => field.id !== fieldId);
      return {
        ...prev,
        fields: remainingFields,
        titleFieldId: prev.titleFieldId === fieldId ? remainingFields[0]?.id ?? "" : prev.titleFieldId,
        summaryFieldId: prev.summaryFieldId === fieldId ? "" : prev.summaryFieldId,
      };
    });
  };

  const handleSaveType = async () => {
    if (!canSaveType || isSavingType) return;
    setIsSavingType(true);
    const nextRequestType = createRequestTypeFromDraft(draft, requestTypes);
    const wasSaved = await onCreateRequestType(nextRequestType);
    setIsSavingType(false);
    if (wasSaved) {
      setDraft(createEmptyRequestTypeDraft());
      setFieldDraft(createEmptyRequestFieldDraft());
    }
  };

  const handleSaveStaffEmail = async () => {
    if (!canAddStaffEmail || isSavingStaffEmail) return;
    setIsSavingStaffEmail(true);
    const wasSaved = await onAddAllowedStaff(normalizedStaffEmailDraft);
    setIsSavingStaffEmail(false);
    if (wasSaved) {
      setStaffEmailDraft("");
    }
  };

  return (
    <div style={{ ...styles.adminLayout, gridTemplateColumns: isNarrow ? "1fr" : styles.adminLayout.gridTemplateColumns }}>
      <Card>
        <CardHeader>
          <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>Admin control panel</Badge>
          <CardTitle>Add a request type</CardTitle>
          <CardDescription>
            {storageMode === "shared"
              ? "Define the form fields here and the new request type will appear on the home screen for everyone using the shared portal."
              : "Define the form fields here and the new request type will appear on the home screen immediately for this browser session."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "grid", gap: 20 }}>
            <div style={styles.formGrid}>
              <TextInput label="Request Type Name" value={draft.name} onChange={(value) => setDraft((prev) => ({ ...prev, name: value }))} required />
              <div style={styles.field}>
                <Label>Icon</Label>
                <NativeSelect
                  value={draft.icon}
                  onChange={(value) => setDraft((prev) => ({ ...prev, icon: value as RequestIconKey }))}
                  options={ICON_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  style={{ marginTop: 10 }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <TextAreaInput label="Home Card Description" value={draft.description} onChange={(value) => setDraft((prev) => ({ ...prev, description: value }))} rows={3} required />
              </div>
              <TextInput label="Badge Label" value={draft.badge} onChange={(value) => setDraft((prev) => ({ ...prev, badge: value }))} placeholder="Optional" />
              <TextInput label="Preview Heading" value={draft.previewHeading} onChange={(value) => setDraft((prev) => ({ ...prev, previewHeading: value }))} placeholder="Optional" />
              <div style={styles.field}>
                <Label>Title Field</Label>
                <NativeSelect
                  value={draft.titleFieldId}
                  onChange={(value) => setDraft((prev) => ({ ...prev, titleFieldId: value }))}
                  placeholder="Select"
                  options={draft.fields.map((field) => ({ value: field.id, label: field.label }))}
                  style={{ marginTop: 10 }}
                  disabled={draft.fields.length === 0}
                />
              </div>
              <div style={styles.field}>
                <Label>Inbox Summary Field</Label>
                <NativeSelect
                  value={draft.summaryFieldId}
                  onChange={(value) => setDraft((prev) => ({ ...prev, summaryFieldId: value }))}
                  placeholder="Optional"
                  options={draft.fields.map((field) => ({ value: field.id, label: field.label }))}
                  style={{ marginTop: 10 }}
                  disabled={draft.fields.length === 0}
                />
              </div>
            </div>

            <div style={styles.softBox}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>Field builder</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 6 }}>
                    Every new request type automatically includes Requester Initials and Working Group. Add the custom fields below.
                  </div>
                </div>
                <Badge variant="secondary" style={styles.badge}>
                  {draft.fields.length} custom {draft.fields.length === 1 ? "field" : "fields"}
                </Badge>
              </div>

              <div style={{ ...styles.formGrid, marginTop: 18 }}>
                <TextInput label="Field Label" value={fieldDraft.label} onChange={(value) => setFieldDraft((prev) => ({ ...prev, label: value }))} required />
                <div style={styles.field}>
                  <Label>Field Type</Label>
                  <NativeSelect
                    value={fieldDraft.type}
                    onChange={(value) =>
                      setFieldDraft((prev) => ({
                        ...prev,
                        type: value as FieldInputType,
                        layout: value === "richText" || value === "longText" ? "full" : prev.layout,
                      }))
                    }
                    options={FIELD_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                    style={{ marginTop: 10 }}
                  />
                </div>
                <div style={styles.field}>
                  <Label>Layout</Label>
                  <NativeSelect
                    value={fieldDraft.layout}
                    onChange={(value) => setFieldDraft((prev) => ({ ...prev, layout: value as FieldLayout }))}
                    options={[
                      { value: "half", label: "Half width" },
                      { value: "full", label: "Full width" },
                    ]}
                    style={{ marginTop: 10 }}
                  />
                </div>
                <TextInput label="Default Value" value={fieldDraft.defaultValue} onChange={(value) => setFieldDraft((prev) => ({ ...prev, defaultValue: value }))} placeholder="Optional" />
                {(fieldDraft.type === "select" || fieldDraft.type === "radio") && (
                  <div style={{ gridColumn: "1 / -1" }}>
                    <TextAreaInput
                      label="Options"
                      value={fieldDraft.optionsInput}
                      onChange={(value) => setFieldDraft((prev) => ({ ...prev, optionsInput: value }))}
                      rows={3}
                      required
                    />
                    <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>Enter options separated by commas or new lines.</div>
                  </div>
                )}
                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 14, color: "#0f172a", fontWeight: 700 }}>
                    <input type="checkbox" checked={fieldDraft.required} onChange={(event) => setFieldDraft((prev) => ({ ...prev, required: event.target.checked }))} />
                    Required field
                  </label>
                </div>
              </div>

              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
                <Button onClick={handleAddField} disabled={!canAddField}>
                  <Plus size={16} />
                  Add field
                </Button>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {draft.fields.length === 0 ? (
                <div style={{ ...styles.softBox, borderStyle: "dashed", textAlign: "center", color: "#64748b", padding: 26 }}>
                  Add at least one custom field to save this request type.
                </div>
              ) : (
                draft.fields.map((field) => (
                  <div key={field.id} style={{ ...styles.softBox, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{field.label}</div>
                        <Badge variant="secondary" style={styles.badge}>
                          {getFieldTypeLabel(field.type)}
                        </Badge>
                        {field.required && (
                          <Badge style={{ ...styles.badge, background: "#ecfdf5", color: "#166534" }}>
                            Required
                          </Badge>
                        )}
                        {field.id === draft.titleFieldId && (
                          <Badge style={{ ...styles.badge, background: "#eff6ff", color: "#1d4ed8" }}>
                            Title source
                          </Badge>
                        )}
                        {field.id === draft.summaryFieldId && (
                          <Badge style={{ ...styles.badge, background: "#f5f3ff", color: "#6d28d9" }}>
                            Summary source
                          </Badge>
                        )}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                        {field.layout === "full" ? "Full width" : "Half width"}
                        {field.options && field.options.length > 0 ? ` - ${field.options.join(", ")}` : ""}
                        {field.defaultValue ? ` - default: ${stripHtml(field.defaultValue) || field.defaultValue}` : ""}
                      </div>
                    </div>
                    <Button variant="outline" style={{ padding: "10px 12px" }} onClick={() => handleRemoveField(field.id)}>
                      <Trash2 size={15} />
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button style={{ minWidth: 190, background: `linear-gradient(135deg, ${BRAND_ORANGE} 0%, #ff7c30 100%)`, color: "white", boxShadow: "0 16px 28px rgba(253,87,2,0.26)" }} onClick={handleSaveType} disabled={!canSaveType || isSavingType}>
                <Plus size={16} />
                {isSavingType ? "Publishing..." : "Publish request type"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div style={{ display: "grid", gap: 20 }}>
        <Card>
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ShieldAlert size={20} />
              Spam filter
            </CardTitle>
            <CardDescription>
              {storageMode === "shared"
                ? "Public submissions are limited to 5 requests per IP address every 24 hours. Resetting clears the active submission window immediately."
                : "The spam filter only runs when the portal is connected to shared Azure storage."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ ...styles.softBox, display: "grid", gap: 8 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Submission cap</div>
                <div style={{ color: "#64748b", lineHeight: 1.7 }}>
                  If someone hits the limit, the public form shows a warning telling them to contact admin before submitting more requests.
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if (storageMode !== "shared" || isResettingSpamFilter) {
                      return;
                    }
                    if (typeof window !== "undefined" && !window.confirm("Reset the spam filter and clear the active 24-hour submission counts?")) {
                      return;
                    }
                    setIsResettingSpamFilter(true);
                    try {
                      await onResetRequestSpamFilter();
                    } finally {
                      setIsResettingSpamFilter(false);
                    }
                  }}
                  disabled={storageMode !== "shared" || isResettingSpamFilter}
                >
                  <ShieldAlert size={16} />
                  {isResettingSpamFilter ? "Resetting..." : "Reset Spam Filter"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={20} />
              Approved staff logins
            </CardTitle>
            <CardDescription>
              {storageMode === "shared"
                ? "Only these Microsoft accounts can clear the staff sign-in gate and open the shared inbox or admin controls."
                : "Approved staff logins are only used when the portal is connected to shared Azure storage."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: 18 }}>
              <div style={{ ...styles.softBox, display: "grid", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Approved emails</div>
                  </div>
                  <Badge variant="secondary" style={styles.badge}>
                    {allowedStaff.length} approved
                  </Badge>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <TextInput label="Staff Email" value={staffEmailDraft} onChange={setStaffEmailDraft} type="email" placeholder="name@sedonaconference.org" />
                  </div>
                  <Button onClick={handleSaveStaffEmail} disabled={!canAddStaffEmail || isSavingStaffEmail}>
                    <Plus size={16} />
                    {isSavingStaffEmail ? "Adding..." : "Add staff login"}
                  </Button>
                </div>

                {storageMode === "shared" && staffEmailDraft.trim().length > 0 && !isValidEmailAddress(normalizedStaffEmailDraft) && (
                  <div style={{ fontSize: 13, color: "#dc2626" }}>Enter a valid email address to add a staff login.</div>
                )}
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {allowedStaff.map((entry) => {
                  const isRequiredStaff = isRequiredAllowedStaffEmail(entry.email);

                  return (
                    <div key={entry.email} style={{ ...styles.softBox, display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>{entry.email}</div>
                          {authUser?.email === entry.email && (
                            <Badge style={{ ...styles.badge, background: "#eff6ff", color: "#1d4ed8" }}>
                              You
                            </Badge>
                          )}
                          {isRequiredStaff && (
                            <Badge style={{ ...styles.badge, background: "#ecfdf5", color: "#166534" }}>
                              Always allowed
                            </Badge>
                          )}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                          {isRequiredStaff ? "Protected for portal recovery and cannot be removed." : entry.addedAt ? `Added ${formatDateTime(entry.addedAt)}` : "Approved for shared staff access."}
                        </div>
                      </div>
                      <Button
                        variant={isRequiredStaff ? "outline" : "danger"}
                        onClick={async () => {
                          if (isRequiredStaff) {
                            return;
                          }
                          if (typeof window !== "undefined" && !window.confirm(`Remove ${entry.email} from approved staff logins?`)) {
                            return;
                          }
                          setRemovingStaffEmail(entry.email);
                          try {
                            await onRemoveAllowedStaff(entry.email);
                          } finally {
                            setRemovingStaffEmail(null);
                          }
                        }}
                        disabled={isRequiredStaff || removingStaffEmail === entry.email || allowedStaff.length <= 1}
                      >
                        <Trash2 size={15} />
                        {isRequiredStaff ? "Protected" : removingStaffEmail === entry.email ? "Removing..." : "Remove"}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ClipboardList size={20} />
              Available request types
            </CardTitle>
            <CardDescription>Core request types stay locked. Custom ones can be opened immediately or removed later.</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ display: "grid", gap: 14 }}>
              {requestTypes.map((requestType) => {
                const Icon = REQUEST_TYPE_ICONS[requestType.icon];
                const requestCount = requestCounts[requestType.id] ?? requestCounts[requestType.name] ?? 0;

                return (
                  <div key={requestType.id} style={{ ...styles.softBox, display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{ ...styles.iconTile, width: 44, height: 44, borderRadius: 16 }}>
                          <Icon size={20} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{requestType.name}</div>
                            <Badge variant="secondary" style={styles.badge}>
                              {requestType.locked ? "Core type" : "Custom type"}
                            </Badge>
                          </div>
                          <div style={{ marginTop: 6, fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>{requestType.description}</div>
                        </div>
                      </div>
                      <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>{requestType.badge}</Badge>
                    </div>

                    <div style={{ display: "grid", gap: 8, fontSize: 13, color: "#475569" }}>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Fields:</strong> {requestType.fields.length + 2}
                      </div>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Requests created:</strong> {requestCount}
                      </div>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Preview heading:</strong> {requestType.previewHeading}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Button variant="outline" onClick={() => onOpenRequestType(requestType.id)}>
                        Open form
                      </Button>
                      {!requestType.locked && (
                        <Button
                          variant="danger"
                          onClick={async () => {
                            const confirmMessage =
                              storageMode === "shared"
                                ? `Remove the "${requestType.name}" request type from the shared portal? Existing requests will stay in the inbox.`
                                : `Remove the "${requestType.name}" request type from this session? Existing requests will stay in the inbox.`;
                            if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
                              return;
                            }
                            setDeletingTypeId(requestType.id);
                            try {
                              await onDeleteRequestType(requestType.id);
                            } finally {
                              setDeletingTypeId(null);
                            }
                          }}
                          disabled={deletingTypeId === requestType.id}
                        >
                          <Trash2 size={15} />
                          {deletingTypeId === requestType.id ? "Removing..." : "Remove"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TemplateFormLayout({
  title,
  description,
  badge,
  requestTitle,
  previewContent,
  requiredMissing,
  onReset,
  onSubmit,
  submitLabel,
  children,
  isNarrow,
  isSubmitting,
  storageMode,
}: {
  title: string;
  description: string;
  badge: string;
  requestTitle: string;
  previewContent: React.ReactNode;
  requiredMissing: string[];
  onReset: () => void;
  onSubmit: () => void | Promise<void>;
  submitLabel: string;
  children: React.ReactNode;
  isNarrow: boolean;
  isSubmitting: boolean;
  storageMode: StorageMode;
}): JSX.Element {
  return (
    <div style={{ ...styles.formLayout, gridTemplateColumns: isNarrow ? "1fr" : styles.formLayout.gridTemplateColumns }}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card>
          <CardHeader>
            <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>{badge}</Badge>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
        <div style={isNarrow ? undefined : styles.sidebar}>
          <Card>
            <CardHeader>
              <CardTitle style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22 }}>
                <ClipboardList size={20} />
                Submission panel
              </CardTitle>
              <CardDescription>
                {storageMode === "shared"
                  ? "Requests are saved to shared Azure storage and available in the inbox for signed-in staff."
                  : "Requests are saved to session storage and available in the inbox for this browser session."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={styles.tintedBox}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#334155" }}>Request title</div>
                  <div style={{ marginTop: 8, color: "#475569", fontSize: 14 }}>{requestTitle}</div>
                </div>

                {requiredMissing.length > 0 ? (
                  <div style={{ ...styles.softBox, background: "#fff7ed", borderColor: "#fed7aa" }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#9a3412", marginBottom: 8 }}>Required fields still missing</div>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "#9a3412", fontSize: 14, display: "grid", gap: 4 }}>
                      {requiredMissing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div style={{ ...styles.softBox, background: "#ecfdf5", borderColor: "#bbf7d0", color: "#166534", display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
                    <CheckCircle2 size={16} />
                    Ready to submit
                  </div>
                )}

                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <motion.div {...softScale} style={{ flex: 1, minWidth: 160 }}>
                    <Button style={{ width: "100%", background: `linear-gradient(135deg, ${BRAND_ORANGE} 0%, #ff7c30 100%)`, color: "white", boxShadow: "0 16px 28px rgba(253,87,2,0.26)" }} onClick={onSubmit} disabled={requiredMissing.length > 0 || isSubmitting}>
                      <Inbox size={16} />
                      {isSubmitting ? "Sending..." : submitLabel}
                    </Button>
                  </motion.div>
                  <Button variant="outline" onClick={onReset} disabled={isSubmitting}>
                    Reset
                  </Button>
                </div>

                <Separator />

                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 10, color: "#334155" }}>Stored request preview</div>
                  <div style={styles.preview}>
                    <div style={{ fontSize: 14, color: "#475569" }}>{previewContent}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
function InboxScreen({
  requests,
  selectedRequest,
  onSelectRequest,
  onUpdateRequestStatus,
  onDeleteRequest,
  onOpenAdmin,
  isNarrow,
}: {
  requests: RequestRecord[];
  selectedRequest: RequestRecord | null;
  onSelectRequest: (id: number) => void;
  onUpdateRequestStatus: (requestId: number, nextStatus: RequestStatus) => void;
  onDeleteRequest: (requestId: number) => Promise<boolean>;
  onOpenAdmin: () => void;
  isNarrow: boolean;
}): JSX.Element {
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copyFallback, setCopyFallback] = useState<{ key: string; html: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("Open");
  const [workingGroupFilter, setWorkingGroupFilter] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCompletedArchive, setShowCompletedArchive] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState<number | null>(null);

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = statusFilter === "Open" ? request.status !== "Completed" : statusFilter === "All" || request.status === statusFilter;
      const matchesWorkingGroup = workingGroupFilter === "All" || request.workingGroup === workingGroupFilter;
      const haystack = [request.title, request.type, request.requesterInitials, request.summary, request.workingGroup].join(" ").toLowerCase();
      return matchesStatus && matchesWorkingGroup && haystack.includes(searchTerm.toLowerCase());
    });
  }, [requests, searchTerm, statusFilter, workingGroupFilter]);

  const completedArchiveRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesWorkingGroup = workingGroupFilter === "All" || request.workingGroup === workingGroupFilter;
      const haystack = [request.title, request.type, request.requesterInitials, request.summary, request.workingGroup].join(" ").toLowerCase();
      return request.status === "Completed" && matchesWorkingGroup && haystack.includes(searchTerm.toLowerCase());
    });
  }, [requests, searchTerm, workingGroupFilter]);

  const visibleRequests = useMemo(() => {
    const combined = [...filteredRequests, ...completedArchiveRequests];
    const seen = new Set<number>();
    return combined.filter((request) => {
      if (seen.has(request.id)) return false;
      seen.add(request.id);
      return true;
    });
  }, [filteredRequests, completedArchiveRequests]);

  const activeRequest = visibleRequests.find((request) => request.id === selectedRequest?.id) ?? filteredRequests[0] ?? completedArchiveRequests[0] ?? null;

  const copyRichHtml = async (fieldKey: string, html: string) => {
    setCopiedField(null);

    const plainText = stripHtml(html || "");
    try {
      if (typeof window !== "undefined" && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const item = new ClipboardItem({
          "text/html": new Blob([html || ""], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" }),
        });
        await navigator.clipboard.write([item]);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(html || "");
      } else {
        throw new Error("Clipboard not supported");
      }

      setCopiedField(fieldKey);
      if (typeof window !== "undefined") {
        window.setTimeout(() => setCopiedField((current) => (current === fieldKey ? null : current)), 1600);
      }
    } catch {
      setCopyFallback({ key: fieldKey, html: html || "" });
      setCopiedField(null);
    }
  };

  const toggleExpanded = (fieldKey: string) => {
    setExpandedFields((prev) => ({ ...prev, [fieldKey]: !prev[fieldKey] }));
  };

  return (
    <>
      {copyFallback && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.28)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1100,
            padding: 24,
          }}
        >
          <div
            style={{
              width: "min(760px, 100%)",
              background: "#ffffff",
              borderRadius: 24,
              border: "1px solid #e2e8f0",
              boxShadow: "0 24px 60px rgba(15,23,42,0.2)",
              padding: 20,
              display: "grid",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Copy HTML manually</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>The HTML is shown here so you can press Ctrl/Cmd+C right away if the browser blocks rich clipboard access.</div>
              </div>
              <button
                type="button"
                onClick={() => setCopyFallback(null)}
                style={{ border: "1px solid #dbe2ea", background: "white", color: "#0f172a", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Close
              </button>
            </div>
            <textarea
              readOnly
              value={copyFallback.html}
              ref={(node) => {
                if (node) {
                  node.focus();
                  node.select();
                }
              }}
              style={{ width: "100%", minHeight: 260, boxSizing: "border-box", borderRadius: 16, border: "1px solid #dbe2ea", padding: 14, fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", lineHeight: 1.5, color: "#0f172a", background: "#f8fafc" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  const text = copyFallback.html;
                  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(text).catch(() => undefined);
                  }
                }}
                style={{ border: "1px solid #dbe2ea", background: BRAND_PURPLE, color: "white", borderRadius: 10, padding: "10px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Copy to clipboard
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ ...styles.inboxLayout, gridTemplateColumns: isNarrow ? "1fr" : styles.inboxLayout.gridTemplateColumns }}>
        <Card>
          <CardHeader>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}>
              <div>
                <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Inbox size={20} />
                  Operations Inbox
                </CardTitle>
                <CardDescription>Review submitted internal requests from any request type defined in this session.</CardDescription>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <Button variant="outline" style={{ padding: "10px 14px" }} onClick={onOpenAdmin}>
                  <Settings2 size={15} />
                  Admin Center
                </Button>
                <Badge style={styles.badge}>{statusFilter === "Open" ? filteredRequests.length : visibleRequests.length} shown</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div style={{ ...styles.toolbar, gridTemplateColumns: isNarrow ? "1fr" : styles.toolbar.gridTemplateColumns, marginBottom: 16 }}>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
                <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search" style={{ paddingLeft: 36 }} />
              </div>
              <NativeSelect value={statusFilter} onChange={setStatusFilter} options={[{ value: "Open", label: "Open" }, { value: "All", label: "All" }, ...STATUS_OPTIONS.map((status) => ({ value: status, label: status }))]} />
              <NativeSelect value={workingGroupFilter} onChange={setWorkingGroupFilter} options={[{ value: "All", label: "All" }, ...WORKING_GROUP_OPTIONS.map((group) => ({ value: group, label: `WG ${group}` }))]} />
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {filteredRequests.length === 0 ? (
                <div style={{ ...styles.softBox, borderStyle: "dashed", textAlign: "center", color: "#64748b", padding: 28 }}>No requests match your current filters.</div>
              ) : (
                filteredRequests.map((request) => {
                  const isActive = activeRequest?.id === request.id;
                  return (
                    <motion.button
                      key={request.id}
                      type="button"
                      onClick={() => onSelectRequest(request.id)}
                      whileHover={{ y: -2, scale: 1.005 }}
                      whileTap={{ scale: 0.995 }}
                      style={{
                        ...styles.requestCard,
                        background: isActive ? `linear-gradient(135deg, ${BRAND_PURPLE} 0%, #6f50c5 100%)` : "#ffffff",
                        color: isActive ? "#fff" : "#0f172a",
                        borderColor: isActive ? BRAND_PURPLE : "#e2e8f0",
                        boxShadow: isActive ? "0 20px 38px rgba(86,59,151,0.24)" : "0 8px 20px rgba(15,23,42,0.04)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 800 }}>{request.title}</div>
                          <div style={{ marginTop: 4, fontSize: 12, color: isActive ? "#e9d5ff" : "#64748b" }}>{request.type} - WG {request.workingGroup} - {request.requesterInitials}</div>
                        </div>
                        <StatusBadge status={request.status} inverted={isActive} />
                      </div>
                      <div style={{ marginTop: 10, fontSize: 14, color: isActive ? "#f5e9ff" : "#475569", lineHeight: 1.5 }}>{request.summary}</div>
                      <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: isActive ? "#e9d5ff" : "#64748b" }}>
                        <Clock3 size={13} />
                        {formatDateTime(request.submittedAt)}
                      </div>
                    </motion.button>
                  );
                })
              )}

              {statusFilter === "Open" && completedArchiveRequests.length > 0 && (
                <div style={{ ...styles.softBox, padding: 14, marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => setShowCompletedArchive((prev) => !prev)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      color: "#0f172a",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.02em" }}>Completed Archive</div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                        {completedArchiveRequests.length} completed {completedArchiveRequests.length === 1 ? "request" : "requests"}
                      </div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: BRAND_PURPLE }}>{showCompletedArchive ? "Hide" : "Show"}</div>
                  </button>

                  <AnimatePresence initial={false}>
                    {showCompletedArchive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <div style={{ display: "grid", gap: 10 }}>
                          {completedArchiveRequests.map((request) => {
                            const isActive = activeRequest?.id === request.id;
                            return (
                              <motion.button
                                key={`archive-${request.id}`}
                                type="button"
                                onClick={() => onSelectRequest(request.id)}
                                whileHover={{ y: -1, scale: 1.003 }}
                                whileTap={{ scale: 0.995 }}
                                style={{
                                  ...styles.requestCard,
                                  padding: 14,
                                  borderRadius: 18,
                                  background: isActive ? "#e2e8f0" : "#ffffff",
                                  borderColor: "#cbd5e1",
                                  boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>{request.title}</div>
                                    <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>{request.type} - WG {request.workingGroup} - {request.requesterInitials}</div>
                                  </div>
                                  <StatusBadge status={request.status} />
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Eye size={20} />
              Request Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!activeRequest ? (
              <div style={{ color: "#64748b", fontSize: 14 }}>Select a request.</div>
            ) : (
              <div style={{ display: "grid", gap: 18 }}>
                <div style={styles.tintedBox}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <Badge style={{ ...styles.badge, backgroundColor: BRAND_PURPLE, color: "white" }}>{activeRequest.type}</Badge>
                        <Badge variant="secondary" style={styles.badge}>
                          WG {activeRequest.workingGroup}
                        </Badge>
                        <StatusBadge status={activeRequest.status} />
                      </div>
                      <h3 style={{ fontSize: 24, margin: "14px 0 0", lineHeight: 1.15, letterSpacing: "-0.03em" }}>{activeRequest.title}</h3>
                      <p style={{ margin: "10px 0 0", color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{activeRequest.summary}</p>
                    </div>
                    <div style={{ minWidth: 220, display: "grid", gap: 10, color: "#64748b", fontSize: 14 }}>
                      <div>
                        <strong style={{ color: "#0f172a" }}>Requester:</strong> {activeRequest.requesterInitials}
                      </div>
                      <div>{formatDateTime(activeRequest.submittedAt)}</div>
                      <div>
                        <Label style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: "#64748b" }}>Status</Label>
                        <NativeSelect value={activeRequest.status} onChange={(value) => onUpdateRequestStatus(activeRequest.id, value as RequestStatus)} options={STATUS_OPTIONS.map((status) => ({ value: status, label: status }))} style={{ marginTop: 8 }} />
                      </div>
                      <Button
                        variant="danger"
                        onClick={async () => {
                          if (deletingRequestId === activeRequest.id) {
                            return;
                          }
                          if (typeof window !== "undefined" && !window.confirm(`Delete "${activeRequest.title}" from the inbox? This cannot be undone.`)) {
                            return;
                          }
                          setDeletingRequestId(activeRequest.id);
                          try {
                            await onDeleteRequest(activeRequest.id);
                          } finally {
                            setDeletingRequestId((current) => (current === activeRequest.id ? null : current));
                          }
                        }}
                        disabled={deletingRequestId === activeRequest.id}
                        style={{ width: "100%" }}
                      >
                        <Trash2 size={15} />
                        {deletingRequestId === activeRequest.id ? "Deleting..." : "Delete request"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div style={styles.detailGrid}>
                  {activeRequest.details.map((detail) => {
                    const isExpanded = !!expandedFields[detail.key];
                    const shouldClamp = detail.isRich && !isExpanded;
                    return (
                      <div
                        key={`${activeRequest.id}-${detail.key}`}
                        style={{
                          border: "1px solid #e2e8f0",
                          borderRadius: 22,
                          background: "#ffffff",
                          padding: 16,
                          boxShadow: "0 8px 20px rgba(15,23,42,0.04)",
                          gridColumn: detail.fullWidth ? "1 / -1" : undefined,
                          minHeight: detail.isRich && detail.fullWidth ? 220 : undefined,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>{detail.label}</div>
                          {detail.isRich && (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                onClick={() => copyRichHtml(detail.key, detail.value || "")}
                                style={{ border: "1px solid #dbe2ea", background: copiedField === detail.key ? "#ecfdf5" : "white", color: copiedField === detail.key ? "#166534" : "#0f172a", borderRadius: 10, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >
                                {copiedField === detail.key ? "Copied HTML" : "Copy HTML"}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleExpanded(detail.key)}
                                style={{ border: "1px solid #dbe2ea", background: "white", color: "#0f172a", borderRadius: 10, padding: "7px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              >
                                {isExpanded ? "Collapse" : "Expand"}
                              </button>
                            </div>
                          )}
                        </div>
                        <div style={{ marginTop: 10, fontSize: detail.isRich ? 15 : 14, lineHeight: 1.7, color: "#334155", maxHeight: shouldClamp ? 220 : undefined, overflow: shouldClamp ? "auto" : undefined }}>
                          {detail.isRich ? <RichContent html={detail.value || "<p>-</p>"} /> : <div style={{ whiteSpace: "pre-wrap" }}>{String(detail.value || "-")}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DynamicFieldInput({
  field,
  value,
  onChange,
  requestTypeId,
}: {
  field: RequestFieldDefinition;
  value: string;
  onChange: (value: string) => void;
  requestTypeId: string;
}): JSX.Element {
  if (isImageRequestField(field)) {
    return <ImageRequestInput label={field.label} value={value} onChange={onChange} required={field.required} />;
  }

  if (isHyperlinkField(field)) {
    return <HyperlinkPairsInput label={field.label} value={value} onChange={onChange} required={field.required} />;
  }

  switch (field.type) {
    case "longText":
      return <TextAreaInput label={field.label} value={value} onChange={onChange} rows={4} required={field.required} />;
    case "richText":
      return <RichTextInput label={field.label} value={value} onChange={onChange} required={field.required} compact={field.layout !== "full"} />;
    case "date":
      return <DateInput label={field.label} value={value} onChange={onChange} required={field.required} />;
    case "select":
      return (
        <div style={styles.field}>
          <Label>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          <NativeSelect value={value} onChange={onChange} placeholder="Select" options={(field.options ?? []).map((option) => ({ value: option, label: option }))} style={{ marginTop: 10 }} />
        </div>
      );
    case "radio":
      return (
        <div style={styles.field}>
          <Label>
            {field.label}
            {field.required ? " *" : ""}
          </Label>
          <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
            {(field.options ?? []).map((option) => (
              <RadioOption key={option} name={`${requestTypeId}-${field.id}`} checked={value === option} onChange={() => onChange(option)} label={option} />
            ))}
          </div>
        </div>
      );
    case "shortText":
    default:
      return <TextInput label={field.label} value={value} onChange={onChange} required={field.required} />;
  }
}

function ImageRequestInput({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}): JSX.Element {
  const selection = parseImageRequestSelection(value);
  const radioName = `image-request-${slugify(label) || "choice"}`;

  return (
    <div style={styles.field}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          <RadioOption
            name={radioName}
            checked={selection.mode === "designersChoice"}
            onChange={() => onChange(serializeImageRequestSelection({ ...selection, mode: "designersChoice" }))}
            label="Designer's Choice"
          />
          <RadioOption
            name={radioName}
            checked={selection.mode === "provideDescription"}
            onChange={() => onChange(serializeImageRequestSelection({ ...selection, mode: "provideDescription" }))}
            label="Provide description"
          />
        </div>
        {selection.mode === "provideDescription" && (
          <TextAreaInput
            label="Creative direction"
            value={selection.description}
            onChange={(description) => onChange(serializeImageRequestSelection({ mode: "provideDescription", description }))}
            rows={4}
            placeholder="Describe the image, graphic, or video direction you want the designer to create."
          />
        )}
      </div>
    </div>
  );
}

function HyperlinkPairsInput({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}): JSX.Element {
  const storedPairs = parseHyperlinkPairs(value) ?? [];
  const pairs = storedPairs.length > 0 ? storedPairs : [{ text: "", url: "" }];

  const updatePair = (index: number, nextPartial: Partial<HyperlinkPair>) => {
    const nextPairs = pairs.map((pair, pairIndex) => (pairIndex === index ? { ...pair, ...nextPartial } : pair));
    onChange(serializeHyperlinkPairs(nextPairs));
  };

  const addPair = () => {
    onChange(serializeHyperlinkPairs([...pairs, { text: "", url: "" }]));
  };

  const removePair = (index: number) => {
    onChange(serializeHyperlinkPairs(pairs.filter((_, pairIndex) => pairIndex !== index)));
  };

  return (
    <div style={styles.field}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
        <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>Pair the exact text used in the body copy with the destination URL.</div>
        {pairs.map((pair, index) => (
          <div key={`${label}-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 18, background: "#f8fafc", padding: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              <div>
                <Label style={{ fontSize: 12, color: "#475569" }}>Link text</Label>
                <Input value={pair.text} onChange={(event) => updatePair(index, { text: event.target.value })} placeholder="Text that appears in the eBlast body" style={{ marginTop: 8 }} />
              </div>
              <div>
                <Label style={{ fontSize: 12, color: "#475569" }}>Destination URL</Label>
                <Input value={pair.url} onChange={(event) => updatePair(index, { url: event.target.value })} placeholder="https://example.com" style={{ marginTop: 8 }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>Use one row per linked phrase or button.</div>
              <Button variant="outline" type="button" onClick={() => removePair(index)} disabled={pairs.length <= 1 && !pair.text.trim() && !pair.url.trim()} style={{ padding: "8px 12px" }}>
                <Trash2 size={15} />
                Remove row
              </Button>
            </div>
          </div>
        ))}
        <div>
          <Button variant="outline" type="button" onClick={addPair}>
            <Plus size={16} />
            Add hyperlink
          </Button>
        </div>
      </div>
    </div>
  );
}

function WorkingGroupSelect({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }): JSX.Element {
  return (
    <div style={styles.field}>
      <Label>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Users size={16} />
          Working Group
        </span>
        {required ? " *" : ""}
      </Label>
      <NativeSelect value={value} onChange={onChange} placeholder="Select" style={{ marginTop: 10 }} options={WORKING_GROUP_OPTIONS.map((group) => ({ value: group, label: `Working Group ${group}` }))} />
    </div>
  );
}

function StatusBadge({ status, inverted = false }: { status: string; inverted?: boolean }): JSX.Element {
  const styleMap: Record<string, React.CSSProperties> = {
    New: inverted ? { background: "rgba(255,255,255,0.16)", color: "white" } : { background: "#dcfce7", color: "#166534" },
    "In Review": inverted ? { background: "rgba(255,255,255,0.16)", color: "white" } : { background: "#fef3c7", color: "#92400e" },
    Completed: inverted ? { background: "rgba(255,255,255,0.16)", color: "white" } : { background: "#e2e8f0", color: "#334155" },
  };
  return <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "6px 10px", fontSize: 12, fontWeight: 800, ...styleMap[status] }}>{status}</span>;
}
function TextInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}): JSX.Element {
  return (
    <div style={styles.field}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} style={{ marginTop: 10 }} />
    </div>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  rows = 5,
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  required?: boolean;
  placeholder?: string;
}): JSX.Element {
  return (
    <div style={styles.field}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} placeholder={placeholder} style={{ marginTop: 10 }} />
    </div>
  );
}

function RichTextInput({
  label,
  value,
  onChange,
  required = false,
  compact = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  compact?: boolean;
}): JSX.Element {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.innerHTML !== (value || "<p></p>")) {
      editor.innerHTML = value || "<p></p>";
    }
  }, [value]);

  const syncValue = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  };

  const saveSelection = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const editor = editorRef.current;
    if (!editor) return;
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    if (typeof window === "undefined") return;
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  };

  const applyCommand = (command: string, commandValue?: string) => {
    const editor = editorRef.current;
    if (!editor || typeof document === "undefined") return;
    editor.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    saveSelection();
    syncValue();
  };

  const submitLink = () => {
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      setShowLinkInput(false);
      return;
    }
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    applyCommand("createLink", normalized);
    setLinkUrl("");
    setShowLinkInput(false);
  };

  return (
    <div style={styles.field}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <div style={{ marginTop: 10, border: "1px solid #dbe2ea", borderRadius: 16, overflow: "hidden", background: "white", boxShadow: "inset 0 1px 2px rgba(15,23,42,0.02)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 10, borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}>
          <ToolbarButton label="Bold" title="Bold" onClick={() => applyCommand("bold")} />
          <ToolbarButton label="Italic" title="Italic" onClick={() => applyCommand("italic")} />
          <ToolbarButton label="Underline" title="Underline" onClick={() => applyCommand("underline")} />
          <ToolbarButton label="Bullets" title="Bulleted list" onClick={() => applyCommand("insertUnorderedList")} />
          <ToolbarButton label="Numbered" title="Numbered list" onClick={() => applyCommand("insertOrderedList")} />
          <ToolbarButton label="Link" title="Insert hyperlink" onClick={() => setShowLinkInput((prev) => !prev)} />
          <ToolbarButton label="Unlink" title="Remove hyperlink" onClick={() => applyCommand("unlink")} />
        </div>
        {showLinkInput && (
          <div style={{ display: "flex", gap: 8, padding: 10, borderBottom: "1px solid #e2e8f0", background: "#ffffff", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="Paste URL here"
              style={{ flex: 1, minWidth: 180, border: "1px solid #dbe2ea", borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none" }}
            />
            <button
              type="button"
              onClick={submitLink}
              style={{ border: "1px solid #dbe2ea", background: BRAND_PURPLE, color: "white", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={() => {
                setShowLinkInput(false);
                setLinkUrl("");
              }}
              style={{ border: "1px solid #dbe2ea", background: "white", color: "#0f172a", borderRadius: 10, padding: "8px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        )}
        <style>{`
          .rich-editor ul { list-style-type: disc; padding-left: 24px; margin: 8px 0; }
          .rich-editor ol { list-style-type: decimal; padding-left: 24px; margin: 8px 0; }
          .rich-editor li { display: list-item; margin: 4px 0; }
          .rich-editor p { margin: 0 0 8px; }
          .rich-editor p:last-child { margin-bottom: 0; }
          .rich-editor a { color: ${BRAND_PURPLE}; text-decoration: underline; }
        `}</style>
        <div
          ref={editorRef}
          className="rich-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={syncValue}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={saveSelection}
          style={{ minHeight: compact ? 120 : 220, padding: 14, outline: "none", lineHeight: 1.7, fontSize: 14 }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({ label, title, onClick }: { label: string; title: string; onClick: () => void }): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      style={{ border: "1px solid #dbe2ea", background: "white", color: "#0f172a", borderRadius: 10, padding: "6px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}

function DateInput({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }): JSX.Element {
  return (
    <div style={styles.field}>
      <Label>
        {label}
        {required ? " *" : ""}
      </Label>
      <Input type="date" value={value} onChange={(event) => onChange(event.target.value)} style={{ marginTop: 10 }} />
    </div>
  );
}

function Card({ className = "", children, style }: CardProps): JSX.Element {
  return <div className={className} style={{ ...styles.card, ...style }}>{children}</div>;
}

function CardHeader({ children, className = "", style }: CardProps): JSX.Element {
  return <div className={className} style={{ ...styles.cardHeader, ...style }}>{children}</div>;
}

function CardContent({ children, className = "", style }: CardProps): JSX.Element {
  return <div className={className} style={{ ...styles.cardContent, ...style }}>{children}</div>;
}

function CardTitle({ children, className = "", style }: CardProps): JSX.Element {
  return <h3 className={className} style={{ ...styles.sectionTitle, ...style }}>{children}</h3>;
}

function CardDescription({ children, className = "", style }: CardProps): JSX.Element {
  return <p className={className} style={{ ...styles.sectionDesc, ...style }}>{children}</p>;
}

function Badge({
  children,
  className = "",
  style,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "secondary";
}): JSX.Element {
  const variantStyle = variant === "secondary" ? { background: "#e2e8f0", color: "#334155" } : { background: "#0f172a", color: "white" };
  return <span className={className} style={{ ...styles.badge, ...variantStyle, ...style }}>{children}</span>;
}

function Button({ children, className = "", variant = "default", style, ...props }: ButtonProps): JSX.Element {
  const variantStyle =
    variant === "outline"
      ? { border: "1px solid #e2e8f0", background: "white", color: "#0f172a" }
      : variant === "secondary"
        ? { background: "#e2e8f0", color: "#0f172a", border: "1px solid transparent" }
        : variant === "danger"
          ? { background: "#fff1f2", color: "#be123c", border: "1px solid #fecdd3" }
          : { background: "#0f172a", color: "white", border: "1px solid transparent" };

  return (
    <button
      {...props}
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        borderRadius: 18,
        padding: "12px 16px",
        fontSize: 14,
        fontWeight: 800,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.5 : 1,
        boxShadow: variant === "default" ? "0 10px 22px rgba(15,23,42,0.08)" : "none",
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function Input({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input {...props} style={{ width: "100%", minWidth: 0, display: "block", boxSizing: "border-box", borderRadius: 16, border: "1px solid #dbe2ea", background: "white", padding: "12px 14px", fontSize: 14, outline: "none", color: "#0f172a", boxShadow: "inset 0 1px 2px rgba(15,23,42,0.02)", ...style }} />;
}

function Textarea({ style, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea {...props} style={{ width: "100%", minWidth: 0, display: "block", boxSizing: "border-box", borderRadius: 16, border: "1px solid #dbe2ea", background: "white", padding: "12px 14px", fontSize: 14, outline: "none", color: "#0f172a", resize: "vertical", lineHeight: 1.6, ...style }} />;
}

function Label({ children, className = "", htmlFor, style }: { children: React.ReactNode; className?: string; htmlFor?: string; style?: React.CSSProperties }): JSX.Element {
  return <label htmlFor={htmlFor} className={className} style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#0f172a", ...style }}>{children}</label>;
}

function Separator(): JSX.Element {
  return <hr style={{ border: 0, borderTop: "1px solid #e2e8f0", margin: 0 }} />;
}

function CelebrationConfetti({ scopeId, count = 24 }: { scopeId: string | number; count?: number }): JSX.Element {
  const dropHeight = typeof window !== "undefined" ? Math.max(window.innerHeight * 0.82, 560) : 700;

  return (
    <>
      {Array.from({ length: count }).map((_, index) => {
        const left = 4 + ((index * 97) % 92);
        const delay = (index % 8) * 0.05;
        const duration = 1.55 + (index % 5) * 0.16;
        const x = (index % 2 === 0 ? 1 : -1) * (18 + (index % 7) * 10);
        const rotate = (index % 2 === 0 ? 1 : -1) * (120 + (index % 6) * 20);
        const color = celebrationColors[index % celebrationColors.length];

        return (
          <motion.span
            key={`${scopeId}-${index}`}
            initial={{ opacity: 0, y: -40, x: 0, rotate: 0, scale: 0.7 }}
            animate={{ opacity: [0, 1, 1, 0], y: dropHeight, x, rotate, scale: [0.7, 1, 0.95] }}
            transition={{ duration, delay, ease: "easeOut" }}
            style={{
              position: "absolute",
              top: -30,
              left: `${left}%`,
              width: 12,
              height: index % 3 === 0 ? 18 : 12,
              borderRadius: index % 2 === 0 ? 4 : 999,
              background: color,
              boxShadow: `0 6px 14px ${color}44`,
            }}
          />
        );
      })}
    </>
  );
}

function NativeSelect({ value, onChange, options, placeholder, style, disabled }: NativeSelectProps): JSX.Element {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} style={{ width: "100%", minWidth: 0, display: "block", boxSizing: "border-box", borderRadius: 16, border: "1px solid #dbe2ea", background: disabled ? "#f8fafc" : "white", padding: "12px 14px", fontSize: 14, outline: "none", color: "#0f172a", ...style }} disabled={disabled}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RadioOption({ name, checked, onChange, label }: { name: string; checked: boolean; onChange: () => void; label: string }): JSX.Element {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 14, color: "#0f172a" }}>
      <input type="radio" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}

function useMediaQuery(query: string): boolean {
  const getMatch = () => (typeof window !== "undefined" ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    listener();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
    media.addListener(listener);
    return () => media.removeListener(listener);
  }, [query]);

  return matches;
}

function renderPreviewContent(header: string, fields: PreviewField[]): React.ReactNode {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ fontWeight: 800, color: "#0f172a" }}>{header}</div>
      {fields.map((field) => (
        <div key={field.label}>
          <div style={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 6 }}>{field.label}</div>
          {field.isRich ? <RichContent html={field.value || "<p>-</p>"} /> : <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{field.value || "-"}</div>}
        </div>
      ))}
    </div>
  );
}

function normalizeRichHtml(html: string): string {
  return html
    .replace(/<ul>/g, '<ul style="list-style-type: disc; padding-left: 24px; margin: 8px 0;">')
    .replace(/<ol>/g, '<ol style="list-style-type: decimal; padding-left: 24px; margin: 8px 0;">')
    .replace(/<li>/g, '<li style="display: list-item; margin: 4px 0;">')
    .replace(/<p>/g, '<p style="margin: 0 0 8px;">')
    .replace(/<a /g, '<a target="_blank" rel="noreferrer noopener" ');
}

function RichContent({ html }: { html: string }): JSX.Element {
  return <div style={styles.richContent} dangerouslySetInnerHTML={{ __html: normalizeRichHtml(html) }} />;
}

function isImageRequestField(field: RequestFieldDefinition): boolean {
  const normalizedKey = field.key.trim().toLowerCase();
  const normalizedLabel = field.label.trim().toLowerCase();
  return (
    normalizedKey === "imagesgraphics" ||
    normalizedKey === "mediadescription" ||
    normalizedKey === "image" ||
    normalizedLabel.includes("images / graphics") ||
    normalizedLabel === "image" ||
    normalizedLabel.startsWith("image ")
  );
}

function isHyperlinkField(field: RequestFieldDefinition): boolean {
  const normalizedKey = field.key.trim().toLowerCase();
  const normalizedLabel = field.label.trim().toLowerCase();
  return normalizedKey === "hyperlinks" || normalizedLabel === "hyperlinks" || normalizedLabel.startsWith("hyperlinks ");
}

function createDefaultImageRequestSelection(): ImageRequestSelection {
  return {
    mode: "designersChoice",
    description: "",
  };
}

function parseImageRequestSelection(rawValue: string): ImageRequestSelection {
  const parsed = tryParseJson(rawValue);
  if (parsed && typeof parsed === "object") {
    const rawSelection = parsed as Record<string, unknown>;
    return {
      mode: rawSelection.mode === "provideDescription" ? "provideDescription" : "designersChoice",
      description: typeof rawSelection.description === "string" ? rawSelection.description : "",
    };
  }

  if (rawValue.trim()) {
    return {
      mode: "provideDescription",
      description: rawValue.trim(),
    };
  }

  return createDefaultImageRequestSelection();
}

function serializeImageRequestSelection(selection: ImageRequestSelection): string {
  return JSON.stringify({
    mode: selection.mode,
    description: selection.description,
  });
}

function normalizeHyperlinkPair(value: unknown): HyperlinkPair | null {
  if (!value || typeof value !== "object") return null;
  const rawPair = value as Record<string, unknown>;
  const text = String(rawPair.text ?? "").trim();
  const url = String(rawPair.url ?? "").trim();

  return {
    text,
    url,
  };
}

function parseHyperlinkPairs(rawValue: string): HyperlinkPair[] | null {
  const parsed = tryParseJson(rawValue);
  if (!Array.isArray(parsed)) return null;

  return parsed
    .map((pair) => normalizeHyperlinkPair(pair))
      .filter((pair): pair is HyperlinkPair => pair !== null);
}

function getMeaningfulHyperlinkPairs(rawValue: string): HyperlinkPair[] | null {
  const pairs = parseHyperlinkPairs(rawValue);
  if (!pairs) return null;
  return pairs.filter((pair) => pair.text || pair.url);
}

function serializeHyperlinkPairs(pairs: HyperlinkPair[]): string {
  return JSON.stringify(
    pairs.map((pair) => ({
      text: pair.text.trim(),
      url: pair.url.trim(),
    }))
  );
}

function getFieldDisplayValue(field: RequestFieldDefinition, rawValue: string): string {
  if (field.type === "richText") {
    return rawValue;
  }

  if (isImageRequestField(field)) {
    const selection = parseImageRequestSelection(rawValue);
    return selection.mode === "designersChoice" ? "Designer's Choice" : selection.description.trim();
  }

  if (isHyperlinkField(field)) {
    const pairs = getMeaningfulHyperlinkPairs(rawValue);
    if (pairs) {
      return pairs.length > 0 ? pairs.map((pair) => `${pair.text || "(Missing text)"} -> ${pair.url || "(Missing link)"}`).join("\n") : "";
    }
  }

  return rawValue.trim();
}

function buildFormDefaults(requestType: RequestTypeDefinition): FormValues {
  const defaults: FormValues = {
    requesterInitials: "",
    workingGroup: "",
  };

  requestType.fields.forEach((field) => {
    if (isImageRequestField(field)) {
      defaults[field.key] = field.defaultValue?.trim() ? field.defaultValue : serializeImageRequestSelection(createDefaultImageRequestSelection());
      return;
    }

    if (isHyperlinkField(field)) {
      defaults[field.key] = field.defaultValue?.trim() ? field.defaultValue : serializeHyperlinkPairs([]);
      return;
    }

    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
      return;
    }
    defaults[field.key] = field.type === "richText" ? "<p></p>" : "";
  });

  return defaults;
}

function hasFieldValue(field: RequestFieldDefinition, value: string): boolean {
  if (field.type === "richText") {
    return stripHtml(value).length > 0;
  }
  if (isImageRequestField(field)) {
    const selection = parseImageRequestSelection(value);
    return selection.mode === "designersChoice" || selection.description.trim().length > 0;
  }
  if (isHyperlinkField(field)) {
    const pairs = getMeaningfulHyperlinkPairs(value);
    if (pairs) {
      return pairs.some((pair) => pair.text.trim().length > 0 && pair.url.trim().length > 0);
    }
  }
  return value.trim().length > 0;
}

function buildRequestDetails(requestType: RequestTypeDefinition, values: FormValues): RequestDetail[] {
  return [
    { key: "requesterInitials", label: "Requester Initials", value: values.requesterInitials ?? "" },
    { key: "workingGroup", label: "Working Group", value: values.workingGroup ?? "" },
    ...requestType.fields.map((field) => ({
      key: field.key,
      label: field.label,
      value: field.type === "richText" ? values[field.key] ?? "" : getFieldDisplayValue(field, values[field.key] ?? ""),
      isRich: field.type === "richText",
      fullWidth: field.layout === "full" || field.type === "richText",
    })),
  ];
}

function resolveRequestTitle(requestType: RequestTypeDefinition, values: FormValues): string {
  const titleField = requestType.fields.find((field) => field.id === requestType.titleFieldId) ?? requestType.fields[0];
  if (!titleField) return `${requestType.name} Request`;
  const rawValue = values[titleField.key] ?? "";
  const nextTitle = titleField.type === "richText" ? stripHtml(rawValue) : getFieldDisplayValue(titleField, rawValue);
  return nextTitle || `${requestType.name} Request`;
}

function resolveRequestSummary(requestType: RequestTypeDefinition, values: FormValues): string {
  const summaryField = requestType.fields.find((field) => field.id === requestType.summaryFieldId) ?? null;
  if (summaryField) {
    const rawValue = values[summaryField.key] ?? "";
    const plainValue = summaryField.type === "richText" ? stripHtml(rawValue) : getFieldDisplayValue(summaryField, rawValue);
    if (plainValue) return truncateText(plainValue, 160);
  }

  const title = resolveRequestTitle(requestType, values);
  if (title) return truncateText(title, 160);
  return `${requestType.name} request submitted.`;
}

function buildRequestRecord(
  requestType: RequestTypeDefinition,
  values: FormValues,
  overrides?: Partial<Pick<RequestRecord, "id" | "submittedAt" | "status" | "summary" | "title">>
): RequestRecord {
  return {
    id: overrides?.id ?? Date.now(),
    requestTypeId: requestType.id,
    type: requestType.name,
    title: overrides?.title ?? resolveRequestTitle(requestType, values),
    requesterInitials: (values.requesterInitials ?? "").trim(),
    submittedAt: overrides?.submittedAt ?? new Date().toISOString(),
    status: overrides?.status ?? "New",
    workingGroup: values.workingGroup ?? "",
    summary: overrides?.summary ?? resolveRequestSummary(requestType, values),
    details: buildRequestDetails(requestType, values),
  };
}
function normalizeRequestRecord(value: unknown, requestTypes: RequestTypeDefinition[]): RequestRecord | null {
  if (!value || typeof value !== "object") return null;
  const rawRecord = value as Record<string, unknown>;
  const requestType =
    requestTypes.find((item) => item.id === rawRecord.requestTypeId) ??
    requestTypes.find((item) => item.name === rawRecord.type) ??
    null;

  const topLevelRequester = String(rawRecord.requesterInitials ?? "");
  const topLevelWorkingGroup = String(rawRecord.workingGroup ?? "");

  let details: RequestDetail[] = [];

  if (Array.isArray(rawRecord.details)) {
    details = rawRecord.details
      .map((detail) => normalizeRequestDetail(detail))
      .filter((detail): detail is RequestDetail => detail !== null);
  } else if (rawRecord.details && typeof rawRecord.details === "object") {
    details = migrateLegacyDetails(rawRecord.details as Record<string, unknown>, requestType);
  }

  if (!details.some((detail) => detail.key === "requesterInitials")) {
    details.unshift({ key: "requesterInitials", label: "Requester Initials", value: topLevelRequester });
  }

  if (!details.some((detail) => detail.key === "workingGroup")) {
    const insertIndex = details.length > 0 ? 1 : 0;
    details.splice(insertIndex, 0, { key: "workingGroup", label: "Working Group", value: topLevelWorkingGroup });
  }

  const detailMap = new Map(details.map((detail) => [detail.key, detail]));
  const requesterInitials = topLevelRequester || detailMap.get("requesterInitials")?.value || "";
  const workingGroup = topLevelWorkingGroup || detailMap.get("workingGroup")?.value || "";

  return {
    id: Number(rawRecord.id) || Date.now(),
    requestTypeId: typeof rawRecord.requestTypeId === "string" ? rawRecord.requestTypeId : requestType?.id ?? null,
    type: String(rawRecord.type ?? requestType?.name ?? "Request"),
    title: String(rawRecord.title ?? resolveTitleFromDetails(requestType, detailMap)),
    requesterInitials,
    submittedAt: String(rawRecord.submittedAt ?? new Date().toISOString()),
    status: STATUS_OPTIONS.includes(rawRecord.status as RequestStatus) ? (rawRecord.status as RequestStatus) : "New",
    workingGroup,
    summary: String(rawRecord.summary ?? resolveSummaryFromDetails(requestType, detailMap)),
    details,
  };
}

function normalizeRequestDetail(value: unknown): RequestDetail | null {
  if (!value || typeof value !== "object") return null;
  const rawDetail = value as Record<string, unknown>;
  if (typeof rawDetail.label !== "string" || typeof rawDetail.value !== "string") return null;
  return {
    key: typeof rawDetail.key === "string" ? rawDetail.key : slugify(rawDetail.label) || rawDetail.label,
    label: rawDetail.label,
    value: rawDetail.value,
    isRich: Boolean(rawDetail.isRich),
    fullWidth: Boolean(rawDetail.fullWidth),
  };
}

function migrateLegacyDetails(rawDetails: Record<string, unknown>, requestType: RequestTypeDefinition | null): RequestDetail[] {
  const consumedKeys = new Set<string>();
  const details: RequestDetail[] = [];

  if (typeof rawDetails.requesterInitials === "string") {
    details.push({ key: "requesterInitials", label: "Requester Initials", value: rawDetails.requesterInitials });
    consumedKeys.add("requesterInitials");
  }

  if (typeof rawDetails.workingGroup === "string") {
    details.push({ key: "workingGroup", label: "Working Group", value: rawDetails.workingGroup });
    consumedKeys.add("workingGroup");
  }

  requestType?.fields.forEach((field) => {
    const rawValue = rawDetails[field.key];
    if (typeof rawValue !== "string") return;
    details.push({
      key: field.key,
      label: field.label,
      value: rawValue,
      isRich: field.type === "richText",
      fullWidth: field.layout === "full" || field.type === "richText",
    });
    consumedKeys.add(field.key);
  });

  Object.entries(rawDetails).forEach(([key, value]) => {
    if (consumedKeys.has(key) || typeof value !== "string") return;
    details.push({
      key,
      label: labelize(key),
      value,
      isRich: key === "bodyCopy" || key === "summary",
      fullWidth: key === "bodyCopy" || key === "summary",
    });
  });

  return details;
}

function resolveTitleFromDetails(requestType: RequestTypeDefinition | null, details: Map<string, RequestDetail>): string {
  if (!requestType) return "Request";
  const titleField = requestType.fields.find((field) => field.id === requestType.titleFieldId) ?? requestType.fields[0];
  if (!titleField) return `${requestType.name} Request`;
  const detail = details.get(titleField.key);
  if (!detail) return `${requestType.name} Request`;
  return titleField.type === "richText" ? stripHtml(detail.value) || `${requestType.name} Request` : detail.value || `${requestType.name} Request`;
}

function resolveSummaryFromDetails(requestType: RequestTypeDefinition | null, details: Map<string, RequestDetail>): string {
  if (!requestType) return "Request submitted.";
  const summaryField = requestType.fields.find((field) => field.id === requestType.summaryFieldId) ?? null;
  if (summaryField) {
    const detail = details.get(summaryField.key);
    if (detail?.value) {
      return truncateText(summaryField.type === "richText" ? stripHtml(detail.value) : detail.value, 160);
    }
  }
  return truncateText(resolveTitleFromDetails(requestType, details), 160);
}

function mergeSeedRequestTypes(rawValue: unknown): RequestTypeDefinition[] {
  if (!Array.isArray(rawValue)) return seedRequestTypes;

  const customTypes = rawValue
    .map((value) => normalizeRequestTypeDefinition(value))
    .filter((requestType): requestType is RequestTypeDefinition => requestType !== null)
    .filter((requestType) => !seedRequestTypes.some((seedType) => seedType.id === requestType.id));

  return [...seedRequestTypes, ...customTypes];
}

function normalizeRequestTypeDefinition(value: unknown): RequestTypeDefinition | null {
  if (!value || typeof value !== "object") return null;
  const rawType = value as Record<string, unknown>;
  const name = String(rawType.name ?? "").trim();
  if (!name) return null;

  const fields = Array.isArray(rawType.fields)
    ? rawType.fields
        .map((field) => normalizeFieldDefinition(field))
        .filter((field): field is RequestFieldDefinition => field !== null)
    : [];

  if (fields.length === 0) return null;

  const icon = typeof rawType.icon === "string" && rawType.icon in REQUEST_TYPE_ICONS ? (rawType.icon as RequestIconKey) : "clipboard";
  const titleFieldId = typeof rawType.titleFieldId === "string" && fields.some((field) => field.id === rawType.titleFieldId) ? rawType.titleFieldId : fields[0].id;
  const summaryFieldId = typeof rawType.summaryFieldId === "string" && fields.some((field) => field.id === rawType.summaryFieldId) ? rawType.summaryFieldId : null;

  return {
    id: String(rawType.id ?? slugify(name) ?? `request-type-${fields.length}`),
    name,
    description: String(rawType.description ?? ""),
    badge: String(rawType.badge ?? `${name} request`),
    icon,
    previewHeading: String(rawType.previewHeading ?? `${name} Request`),
    titleFieldId,
    summaryFieldId,
    fields,
    locked: Boolean(rawType.locked && seedRequestTypes.some((requestType) => requestType.id === rawType.id)),
  };
}

function normalizeFieldDefinition(value: unknown): RequestFieldDefinition | null {
  if (!value || typeof value !== "object") return null;
  const rawField = value as Record<string, unknown>;
  const label = String(rawField.label ?? "").trim();
  if (!label) return null;

  const type = FIELD_TYPE_OPTIONS.some((option) => option.value === rawField.type) ? (rawField.type as FieldInputType) : "shortText";
  const options = Array.isArray(rawField.options) ? rawField.options.map((option) => String(option).trim()).filter(Boolean) : undefined;

  return {
    id: String(rawField.id ?? slugify(label) ?? `field-${Date.now()}`),
    key: String(rawField.key ?? slugify(label) ?? `field-${Date.now()}`),
    label,
    type,
    required: Boolean(rawField.required),
    layout: rawField.layout === "full" || type === "richText" || type === "longText" ? "full" : "half",
    options,
    defaultValue: typeof rawField.defaultValue === "string" ? rawField.defaultValue : type === "richText" ? "<p></p>" : "",
  };
}

function createEmptyRequestTypeDraft(): RequestTypeDraft {
  return {
    name: "",
    description: "",
    badge: "",
    previewHeading: "",
    icon: "clipboard",
    titleFieldId: "",
    summaryFieldId: "",
    fields: [],
  };
}

function createEmptyRequestFieldDraft(): RequestFieldDraft {
  return {
    label: "",
    type: "shortText",
    required: false,
    layout: "half",
    optionsInput: "",
    defaultValue: "",
  };
}

function createFieldDefinitionFromDraft(draft: RequestFieldDraft, existingFields: RequestFieldDefinition[]): RequestFieldDefinition {
  const key = ensureUniqueSlug(slugify(draft.label) || "field", existingFields.map((field) => field.key));
  const options = draft.type === "select" || draft.type === "radio" ? parseOptions(draft.optionsInput) : undefined;

  return {
    id: key,
    key,
    label: draft.label.trim(),
    type: draft.type,
    required: draft.required,
    layout: draft.type === "richText" || draft.type === "longText" ? "full" : draft.layout,
    options,
    defaultValue: draft.defaultValue || (draft.type === "richText" ? "<p></p>" : ""),
  };
}

function createRequestTypeFromDraft(draft: RequestTypeDraft, existingRequestTypes: RequestTypeDefinition[]): RequestTypeDefinition {
  const name = draft.name.trim();
  const id = ensureUniqueSlug(slugify(name) || "request-type", existingRequestTypes.map((requestType) => requestType.id));

  return {
    id,
    name,
    description: draft.description.trim(),
    badge: draft.badge.trim() || `${name} request`,
    icon: draft.icon,
    previewHeading: draft.previewHeading.trim() || `${name} Request`,
    titleFieldId: draft.titleFieldId || draft.fields[0]?.id || null,
    summaryFieldId: draft.summaryFieldId || null,
    fields: draft.fields,
    locked: false,
  };
}

function getFieldTypeLabel(type: FieldInputType): string {
  return FIELD_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function parseOptions(input: string): string[] {
  return Array.from(new Set(input.split(/\r?\n|,/).map((part) => part.trim()).filter(Boolean)));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value: string, maxLength = 160): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureUniqueSlug(base: string, existingValues: string[]): string {
  if (!existingValues.includes(base)) return base;
  let suffix = 2;
  while (existingValues.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

function labelize(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()).trim();
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString([], { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
