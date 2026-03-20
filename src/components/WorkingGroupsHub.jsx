import { useEffect } from 'react';
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

export default function WorkingGroupsHub({ content, homeHref, liveGroupHref, seriesHref }) {
  const { seo, hero, groups } = content;
  const orderedGroups = [...groups].sort((left, right) => Number(left.number) - Number(right.number));

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
            <div className="hub-heading-copy">
              <span className="eyebrow">{hero.eyebrow}</span>
              <h2>{hero.title}</h2>
              <p>{hero.description}</p>
            </div>
          </div>

          <div className="hub-grid">
            {orderedGroups.map((group, index) => {
              const isLive = group.status === 'live';
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

              return isLive ? (
                <motion.a
                  key={group.number}
                  data-wg={`WG${group.number}`}
                  className="hub-card hub-card-link is-live"
                  href={liveGroupHref}
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
    </div>
  );
}
