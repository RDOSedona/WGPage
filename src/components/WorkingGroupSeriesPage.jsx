import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
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

export default function WorkingGroupSeriesPage({ content, homeHref }) {
  const { seo, hero, body, actions } = content;

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
        <div className="topbar-inner hub-topbar series-topbar">
          <a className="brand hub-brand" href={homeHref} aria-label="The Sedona Conference">
            <img className="hub-logo" src={sedonaLogo} alt="The Sedona Conference" />
          </a>
          <a className="series-back-link" href={homeHref}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to directory
          </a>
        </div>
      </header>

      <main className="series-main">
        <motion.section className="series-hero" {...reveal()}>
          <span className="eyebrow">{hero.eyebrow}</span>
          <h1>{hero.title}</h1>
          <p className="series-subtitle">{hero.subtitle}</p>
        </motion.section>

        <motion.section className="series-content" {...reveal(0.08)}>
          <div className="series-article">
            {body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <div className="series-actions">
            {actions.map((action) => (
              <a
                key={action.label}
                className={`series-action-button series-action-${action.tone}`}
                href={action.href}
                target="_blank"
                rel="noreferrer"
              >
                {action.label}
              </a>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
