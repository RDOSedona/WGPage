import { startTransition, useEffect, useState } from 'react';
import AdminPanel from './components/AdminPanel.jsx';
import WorkingGroupsHub from './components/WorkingGroupsHub.jsx';
import WorkingGroupPage from './components/WorkingGroupPage.jsx';
import WorkingGroupSeriesPage from './components/WorkingGroupSeriesPage.jsx';
import wg1DefaultContent from './content/wg1.json';
import wg13DefaultContent from './content/wg13.json';
import workingGroupsHubContent from './content/workingGroupsHub.json';
import workingGroupSeriesInfo from './content/workingGroupSeriesInfo.json';
import {
  fetchWorkingGroupContentFromApi,
  getWorkingGroupAdminAccess,
  saveWorkingGroupContentToApi,
} from './lib/workingGroupContentApi.js';

const HOME_VIEW = 'home';
const WG1_VIEW = 'wg1';
const WG13_VIEW = 'wg13';
const SERIES_VIEW = 'series';
const DEFAULT_WORKING_GROUP_VIEW = WG13_VIEW;
const UNLOCK_STORAGE_KEY = 'working-group-access-v1';
const STORAGE_MODE_CHECKING = 'checking';
const STORAGE_MODE_LOCAL = 'local';
const STORAGE_MODE_REMOTE = 'remote';
const STORAGE_MODE_READ_ONLY = 'read-only';
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
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return cloneContent(defaultContent);
    }

    const parsed = JSON.parse(raw);
    return isValidWorkingGroupContent(parsed) ? parsed : cloneContent(defaultContent);
  } catch {
    return cloneContent(defaultContent);
  }
}

function saveLocalContent(view, content) {
  if (typeof window === 'undefined') {
    return;
  }

  const { storageKey } = getWorkingGroupPageConfig(view);

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(content));
  } catch {
    // Ignore storage failures and keep the page usable.
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
  const [storageMode, setStorageMode] = useState(STORAGE_MODE_CHECKING);
  const [storageNotice, setStorageNotice] = useState('Checking shared Azure storage…');
  const [pendingRemoteSave, setPendingRemoteSave] = useState(false);
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

    let isCancelled = false;

    setPendingRemoteSave(false);
    setStorageMode(STORAGE_MODE_CHECKING);
    setStorageNotice('Loading working group content…');

    startTransition(() => {
      setContent(loadInitialContent(activeWorkingGroupView));
    });

    Promise.all([
      fetchWorkingGroupContentFromApi(activeWorkingGroupView),
      getWorkingGroupAdminAccess(),
    ]).then(([remoteResult, adminAccess]) => {
      if (isCancelled) {
        return;
      }

      if (remoteResult.available && isValidWorkingGroupContent(remoteResult.content)) {
        startTransition(() => {
          setContent(cloneContent(remoteResult.content));
        });
      }

      if (remoteResult.available && adminAccess.authorized) {
        setStorageMode(STORAGE_MODE_REMOTE);
        setStorageNotice('Azure shared storage connected. Changes auto-save for approved staff.');
        return;
      }

      if (remoteResult.available) {
        setStorageMode(STORAGE_MODE_READ_ONLY);
        setStorageNotice('This page is loading from Azure shared storage. Sign in with an approved staff account to edit.');
        return;
      }

      if (adminAccess.authorized) {
        setStorageMode(STORAGE_MODE_LOCAL);
        setStorageNotice('Azure storage is unavailable right now. Changes will stay in this browser until the API is reachable.');
        return;
      }

      if (!adminAccess.available) {
        setStorageMode(STORAGE_MODE_LOCAL);
        setStorageNotice('Using browser-only draft mode. Deploy the Azure Static Web Apps API to share edits across users.');
        return;
      }

      setStorageMode(STORAGE_MODE_READ_ONLY);
      setStorageNotice('Editing is restricted to approved staff accounts.');
    });

    return () => {
      isCancelled = true;
    };
  }, [activeWorkingGroupView, isWorkingGroupPage]);

  useEffect(() => {
    if (!isWorkingGroupPage) {
      return;
    }

    saveLocalContent(activeWorkingGroupView, content);
  }, [activeWorkingGroupView, content, isWorkingGroupPage]);

  useEffect(() => {
    if (!isWorkingGroupPage || storageMode !== STORAGE_MODE_REMOTE || !pendingRemoteSave) {
      return;
    }

    let isCancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        setStorageNotice('Saving changes to Azure shared storage…');
        await saveWorkingGroupContentToApi(activeWorkingGroupView, content);

        if (isCancelled) {
          return;
        }

        setPendingRemoteSave(false);
        setStorageNotice('Azure shared storage connected. Changes auto-save for approved staff.');
      } catch (error) {
        if (isCancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to save working group page.';
        setPendingRemoteSave(false);

        if (/staff sign-in|required|not approved/i.test(message)) {
          setStorageMode(STORAGE_MODE_READ_ONLY);
          setStorageNotice('Your staff session can no longer save edits. Sign in again with an approved account.');
          return;
        }

        setStorageMode(STORAGE_MODE_LOCAL);
        setStorageNotice('Could not reach Azure shared storage. Changes are staying in this browser for now.');
      }
    }, 650);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [activeWorkingGroupView, content, isWorkingGroupPage, pendingRemoteSave, storageMode]);

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
    setPendingRemoteSave(true);
  };

  const handleResetContent = async () => {
    startTransition(() => {
      setContent(cloneContent(activeWorkingGroup.defaultContent));
    });
    setPendingRemoteSave(true);
  };

  const handleImportContent = async (nextContent) => {
    if (!isValidWorkingGroupContent(nextContent)) {
      throw new Error('That JSON file does not match the working-group page format.');
    }

    startTransition(() => {
      setContent(cloneContent(nextContent));
    });
    setPendingRemoteSave(true);
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

  const canEditPages =
    isWorkingGroupPage &&
    (storageMode === STORAGE_MODE_LOCAL || storageMode === STORAGE_MODE_REMOTE);

  return (
    <>
      {isWorkingGroupPage && !isBlockedProtectedView ? (
        <>
          <WorkingGroupPage content={content} homeHref={homeHref} />
          {canEditPages ? (
            <AdminPanel
              content={content}
              isOpen={adminOpen}
              onOpen={() => setAdminOpen(true)}
              onClose={() => setAdminOpen(false)}
              onContentChange={handleContentChange}
              onExportContent={handleExportContent}
              onImportContent={handleImportContent}
              onResetContent={handleResetContent}
              statusMessage={storageNotice}
            />
          ) : null}
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
