import { startTransition, useEffect, useState } from 'react';
import AdminPanel from './components/AdminPanel.jsx';
import WorkingGroupsHub from './components/WorkingGroupsHub.jsx';
import WorkingGroupPage from './components/WorkingGroupPage.jsx';
import WorkingGroupSeriesPage from './components/WorkingGroupSeriesPage.jsx';
import wg1DefaultContent from './content/wg1.json';
import wg13DefaultContent from './content/wg13.json';
import workingGroupsHubContent from './content/workingGroupsHub.json';
import workingGroupSeriesInfo from './content/workingGroupSeriesInfo.json';

const HOME_VIEW = 'home';
const WG1_VIEW = 'wg1';
const WG13_VIEW = 'wg13';
const SERIES_VIEW = 'series';
const DEFAULT_WORKING_GROUP_VIEW = WG13_VIEW;
const UNLOCK_STORAGE_KEY = 'working-group-access-v1';
const protectedWorkingGroups = {
  [WG13_VIEW]: {
    number: '13',
    password: 'TSC',
  },
};

const workingGroupPages = {
  [WG1_VIEW]: {
    number: '1',
    storageKey: 'wg1-admin-content-v1',
    defaultContent: wg1DefaultContent,
  },
  [WG13_VIEW]: {
    number: '13',
    storageKey: 'wg13-admin-content-v1',
    defaultContent: wg13DefaultContent,
  },
};

const workingGroupViews = new Set(Object.keys(workingGroupPages));

function cloneContent(value) {
  return JSON.parse(JSON.stringify(value));
}

function isValidWorkingGroupContent(value) {
  return Boolean(
    value &&
      value.hero &&
      Array.isArray(value.hero.highlights) &&
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

function getWorkingGroupPageConfig(view) {
  return workingGroupPages[view] ?? workingGroupPages[DEFAULT_WORKING_GROUP_VIEW];
}

function loadInitialContent(view) {
  const { storageKey, defaultContent } = getWorkingGroupPageConfig(view);

  if (typeof window === 'undefined') {
    return cloneContent(defaultContent);
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return cloneContent(defaultContent);
    }

    const parsed = JSON.parse(raw);
    return isValidWorkingGroupContent(parsed) ? parsed : cloneContent(defaultContent);
  } catch {
    return cloneContent(defaultContent);
  }
}

function loadUnlockedViews() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(UNLOCK_STORAGE_KEY);

    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function getBaseHref() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname;
}

function getCurrentView() {
  if (typeof window === 'undefined') {
    return HOME_VIEW;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const view = searchParams.get('view');

  if (view === SERIES_VIEW) {
    return SERIES_VIEW;
  }

  if (view && workingGroupViews.has(view)) {
    return view;
  }

  return HOME_VIEW;
}

export default function App() {
  const currentView = getCurrentView();
  const isWorkingGroupPage = workingGroupViews.has(currentView);
  const isProtectedWorkingGroup = Boolean(protectedWorkingGroups[currentView]);
  const activeWorkingGroupView = isWorkingGroupPage ? currentView : DEFAULT_WORKING_GROUP_VIEW;
  const activeWorkingGroup = getWorkingGroupPageConfig(activeWorkingGroupView);
  const [content, setContent] = useState(() => loadInitialContent(activeWorkingGroupView));
  const [adminOpen, setAdminOpen] = useState(false);
  const [unlockedViews, setUnlockedViews] = useState(loadUnlockedViews);
  const [requestedProtectedView, setRequestedProtectedView] = useState(null);
  const homeHref = getBaseHref();
  const seriesHref = `${homeHref}?view=${SERIES_VIEW}`;
  const groupHrefs = Object.fromEntries(
    Object.entries(workingGroupPages).map(([view, config]) => [config.number, `${homeHref}?view=${view}`]),
  );
  const protectedViewByNumber = Object.fromEntries(
    Object.entries(protectedWorkingGroups).map(([view, config]) => [config.number, view]),
  );
  const protectedGroupNumbers = new Set(Object.values(protectedWorkingGroups).map((config) => config.number));
  const isBlockedProtectedView = isProtectedWorkingGroup && !unlockedViews[currentView];
  const protectedPromptView = requestedProtectedView ?? (isBlockedProtectedView ? currentView : null);
  const protectedPromptNumber = protectedPromptView
    ? protectedWorkingGroups[protectedPromptView]?.number ?? workingGroupPages[protectedPromptView]?.number
    : null;
  const protectedPromptGroup = protectedPromptNumber
    ? workingGroupsHubContent.groups.find((group) => group.number === protectedPromptNumber) ?? null
    : null;
  const lockPrompt =
    protectedPromptView && protectedPromptNumber
      ? {
          view: protectedPromptView,
          number: protectedPromptNumber,
          label: protectedPromptGroup?.label ?? `Working Group ${protectedPromptNumber}`,
        }
      : null;

  useEffect(() => {
    if (!isWorkingGroupPage) {
      return;
    }

    startTransition(() => {
      setContent(loadInitialContent(activeWorkingGroupView));
    });
  }, [activeWorkingGroupView, isWorkingGroupPage]);

  useEffect(() => {
    if (!isWorkingGroupPage) {
      return;
    }

    try {
      window.localStorage.setItem(activeWorkingGroup.storageKey, JSON.stringify(content));
    } catch {
      // Ignore storage failures and keep the page usable.
    }
  }, [activeWorkingGroup.storageKey, content, isWorkingGroupPage]);

  useEffect(() => {
    if (isBlockedProtectedView) {
      setRequestedProtectedView(currentView);
    }
  }, [currentView, isBlockedProtectedView]);

  const handleContentChange = (updater) => {
    setContent((previous) => {
      const draft = cloneContent(previous);
      updater(draft);
      return draft;
    });
  };

  const handleResetContent = async () => {
    startTransition(() => {
      setContent(cloneContent(activeWorkingGroup.defaultContent));
    });

    try {
      window.localStorage.removeItem(activeWorkingGroup.storageKey);
    } catch {
      // Ignore storage failures and keep the page usable.
    }
  };

  const handleImportContent = async (nextContent) => {
    if (!isValidWorkingGroupContent(nextContent)) {
      throw new Error('That JSON file does not match the working-group page format.');
    }

    startTransition(() => {
      setContent(cloneContent(nextContent));
    });
  };

  const handleExportContent = () => {
    const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);

    link.href = url;
    link.download = `${activeWorkingGroupView}-content-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const handleProtectedGroupRequest = (groupNumber) => {
    const targetView = protectedViewByNumber[groupNumber];

    if (!targetView) {
      return;
    }

    setRequestedProtectedView(targetView);
  };

  const handleLockClose = () => {
    setRequestedProtectedView(null);

    if (isBlockedProtectedView) {
      window.location.assign(homeHref);
    }
  };

  const handleLockSubmit = (view, candidatePassword) => {
    const expectedPassword = protectedWorkingGroups[view]?.password;

    if (!expectedPassword || candidatePassword !== expectedPassword) {
      return false;
    }

    const nextUnlockedViews = {
      ...unlockedViews,
      [view]: true,
    };

    try {
      window.sessionStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(nextUnlockedViews));
    } catch {
      // Ignore storage failures and keep the page usable.
    }

    setUnlockedViews(nextUnlockedViews);
    setRequestedProtectedView(null);

    if (currentView !== view) {
      window.location.assign(`${homeHref}?view=${view}`);
    }

    return true;
  };

  return (
    <>
      {isWorkingGroupPage && !isBlockedProtectedView ? (
        <>
          <WorkingGroupPage content={content} homeHref={homeHref} />
          <AdminPanel
            content={content}
            isOpen={adminOpen}
            onOpen={() => setAdminOpen(true)}
            onClose={() => setAdminOpen(false)}
            onContentChange={handleContentChange}
            onExportContent={handleExportContent}
            onImportContent={handleImportContent}
            onResetContent={handleResetContent}
          />
        </>
      ) : currentView === SERIES_VIEW ? (
        <WorkingGroupSeriesPage content={workingGroupSeriesInfo} homeHref={homeHref} />
      ) : (
        <WorkingGroupsHub
          content={workingGroupsHubContent}
          homeHref={homeHref}
          groupHrefs={groupHrefs}
          seriesHref={seriesHref}
          protectedGroupNumbers={protectedGroupNumbers}
          lockPrompt={lockPrompt}
          onProtectedGroupRequest={handleProtectedGroupRequest}
          onLockClose={handleLockClose}
          onLockSubmit={handleLockSubmit}
        />
      )}
    </>
  );
}
