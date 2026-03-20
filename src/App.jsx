import { startTransition, useEffect, useState } from 'react';
import AdminPanel from './components/AdminPanel.jsx';
import WorkingGroupsHub from './components/WorkingGroupsHub.jsx';
import WorkingGroupPage from './components/WorkingGroupPage.jsx';
import WorkingGroupSeriesPage from './components/WorkingGroupSeriesPage.jsx';
import defaultContent from './content/wg13.json';
import workingGroupsHubContent from './content/workingGroupsHub.json';
import workingGroupSeriesInfo from './content/workingGroupSeriesInfo.json';

const STORAGE_KEY = 'wg13-admin-content-v1';
const WG13_VIEW = 'wg13';
const SERIES_VIEW = 'series';

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

function loadInitialContent() {
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

function getBaseHref() {
  if (typeof window === 'undefined') {
    return '/';
  }

  return window.location.pathname;
}

function getCurrentView() {
  if (typeof window === 'undefined') {
    return 'home';
  }

  const searchParams = new URLSearchParams(window.location.search);
  const view = searchParams.get('view');

  if (view === WG13_VIEW) {
    return WG13_VIEW;
  }

  if (view === SERIES_VIEW) {
    return SERIES_VIEW;
  }

  return 'home';
}

export default function App() {
  const [content, setContent] = useState(loadInitialContent);
  const [adminOpen, setAdminOpen] = useState(false);
  const currentView = getCurrentView();
  const homeHref = getBaseHref();
  const wg13Href = `${getBaseHref()}?view=${WG13_VIEW}`;
  const seriesHref = `${getBaseHref()}?view=${SERIES_VIEW}`;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    } catch {
      // Ignore storage failures and keep the page usable.
    }
  }, [content]);

  const handleContentChange = (updater) => {
    setContent((previous) => {
      const draft = cloneContent(previous);
      updater(draft);
      return draft;
    });
  };

  const handleResetContent = async () => {
    startTransition(() => {
      setContent(cloneContent(defaultContent));
    });

    try {
      window.localStorage.removeItem(STORAGE_KEY);
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
    link.download = `wg13-content-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      {currentView === WG13_VIEW ? (
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
          liveGroupHref={wg13Href}
          seriesHref={seriesHref}
        />
      )}
    </>
  );
}
