import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import sedonaLogo from '../assets/tsc-logo.svg';

const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: {
    duration: 0.55,
    delay,
    ease: [0.22, 1, 0.36, 1],
  },
});

export default function WorkingGroupsHub({
  content,
  homeHref,
  groupHrefs = {},
  seriesHref,
  protectedGroupNumbers = new Set(),
  lockPrompt = null,
  onProtectedGroupRequest,
  onLockClose,
  onLockSubmit,
}) {
  const { seo, hero, groups } = content;
  const orderedGroups = [...groups].sort((left, right) => Number(left.number) - Number(right.number));
  const [password, setPassword] = useState('');
  const [lockError, setLockError] = useState('');

  useEffect(() => {
    if (seo?.title) {
      document.title = seo.title;
    }

    if (seo?.description) {
      const descriptionTag = document.querySelector('meta[name="description"]');

      if (descriptionTag) {
        descriptionTag.setAttribute('content', seo.description);
      }
    }
  }, [seo]);

  useEffect(() => {
    setPassword('');
    setLockError('');
  }, [lockPrompt?.view]);

  const handleLockSubmit = (event) => {
    event.preventDefault();

    if (!lockPrompt) {
      return;
    }

    const isUnlocked = onLockSubmit?.(lockPrompt.view, password.trim());

    if (!isUnlocked) {
      setLockError('Incorrect password.');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-ambience" aria-hidden="true">
        <span className="ambient-blob ambient-blob-one" />
        <span className="ambient-blob ambient-blob-two" />
        <span className="ambient-blob ambient-blob-three" />
      </div>

      <header className="topbar">
        <div className="topbar-inner hub-topbar">
          <a className="brand hub-brand" href={homeHref} aria-label="The Sedona Conference">
            <img className="hub-logo" src={sedonaLogo} alt="The Sedona Conference" />
          </a>
          <a className="hub-series-link" href={seriesHref}>
            Learn about the working group series
          </a>
        </div>
      </header>

      <main className="hub-main">
        <motion.section className="hub-grid-section" {...reveal()}>
          <div className="hub-heading">
            <div className="hub-heading-ambient" aria-hidden="true">
              <span className="hub-heading-orbit hub-heading-orbit-one" />
              <span className="hub-heading-orbit hub-heading-orbit-two" />
              <span className="hub-heading-beam hub-heading-beam-one" />
              <span className="hub-heading-beam hub-heading-beam-two" />
            </div>
            <div className="hub-heading-copy">
              <span className="eyebrow">{hero.eyebrow}</span>
              <h2>{hero.title}</h2>
              {hero.description ? <p>{hero.description}</p> : null}
            </div>
          </div>

          <div className="hub-grid">
            {orderedGroups.map((group, index) => {
              const groupHref = groupHrefs[group.number];
              const isLive = group.status === 'live' && Boolean(groupHref);
              const isProtected = protectedGroupNumbers.has(group.number);
              const cardContent = (
                <>
                  <div className="hub-card-topline">
                    <span className="hub-card-number">Working Group {group.number}</span>
                  </div>
                  <h3>{group.label}</h3>
                  {isLive ? (
                    <div className="hub-card-foot hub-card-foot-primary">
                      View page
                      <ArrowRight size={16} aria-hidden="true" />
                    </div>
                  ) : (
                    <div className="hub-card-foot hub-card-foot-muted" aria-hidden="true">
                      <LockKeyhole size={16} aria-hidden="true" />
                      In development
                    </div>
                  )}
                </>
              );

              return isLive && isProtected ? (
                <motion.button
                  key={group.number}
                  type="button"
                  data-wg={`WG${group.number}`}
                  className="hub-card hub-card-link hub-card-button is-live"
                  onClick={() => onProtectedGroupRequest?.(group.number)}
                  {...reveal(index * 0.06)}
                >
                  {cardContent}
                </motion.button>
              ) : isLive ? (
                <motion.a
                  key={group.number}
                  data-wg={`WG${group.number}`}
                  className="hub-card hub-card-link is-live"
                  href={groupHref}
                  {...reveal(index * 0.06)}
                >
                  {cardContent}
                </motion.a>
              ) : (
                <motion.article
                  key={group.number}
                  data-wg={`WG${group.number}`}
                  className="hub-card is-locked"
                  {...reveal(index * 0.06)}
                >
                  {cardContent}
                </motion.article>
              );
            })}
          </div>
        </motion.section>
      </main>

      {lockPrompt ? (
        <div className="hub-lock-overlay" role="presentation">
          <motion.div
            className="hub-lock-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-lock-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="eyebrow">Protected access</span>
            <h3 id="hub-lock-title">
              Enter password for WG{lockPrompt.number}
            </h3>
            <p className="hub-lock-copy">
              {lockPrompt.label} is currently behind a simple page lock. Enter the password to continue.
            </p>
            <form className="hub-lock-form" onSubmit={handleLockSubmit}>
              <label className="hub-lock-label" htmlFor="hub-lock-password">
                Password
              </label>
              <input
                id="hub-lock-password"
                className="hub-lock-input"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (lockError) {
                    setLockError('');
                  }
                }}
                autoFocus
              />
              {lockError ? <p className="hub-lock-error">{lockError}</p> : null}
              <div className="hub-lock-actions">
                <button className="hub-lock-button hub-lock-button-primary" type="submit">
                  Unlock page
                </button>
                <button
                  className="hub-lock-button hub-lock-button-secondary"
                  type="button"
                  onClick={onLockClose}
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </div>
  );
}
