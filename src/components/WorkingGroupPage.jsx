import { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CalendarDays,
  ExternalLink,
  FileText,
  LockKeyhole,
  Mail,
  MessageSquare,
  Scale,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const iconMap = {
  arrowRight: ArrowRight,
  bookOpen: BookOpen,
  calendarDays: CalendarDays,
  externalLink: ExternalLink,
  fileText: FileText,
  lockKeyhole: LockKeyhole,
  mail: Mail,
  messageSquare: MessageSquare,
  scale: Scale,
  shieldCheck: ShieldCheck,
  sparkles: Sparkles,
  users: Users,
};

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

function getIcon(name, fallback = ArrowRight) {
  return iconMap[name] ?? fallback;
}

function getLinkProps(href = '') {
  if (href.startsWith('http')) {
    return {
      target: '_blank',
      rel: 'noreferrer',
    };
  }

  return {};
}

function getHeroTitleClass(title = '') {
  if (title.length > 34) {
    return 'hero-title hero-title-long';
  }

  if (title.length > 20) {
    return 'hero-title hero-title-medium';
  }

  return 'hero-title';
}

function ActionLink({ action, className = 'button button-primary' }) {
  const Icon = action.icon ? getIcon(action.icon, ArrowRight) : null;

  return (
    <a className={className} href={action.href} {...getLinkProps(action.href)}>
      {action.label}
      {Icon ? <Icon size={16} aria-hidden="true" /> : null}
    </a>
  );
}

function SectionHeading({ section }) {
  return (
    <div className="section-heading">
      <span className="eyebrow">{section.eyebrow}</span>
      <h2>{section.title}</h2>
      <p>{section.description}</p>
    </div>
  );
}

export default function WorkingGroupPage({ content, homeHref = null }) {
  const { branding, navigation, hero, sections, footer, seo } = content;
  const committeeGroups = sections.committee.groups ?? [];
  const featuredCommitteeIndex = committeeGroups.reduce((largestIndex, group, index, groups) => {
    if (largestIndex === -1) {
      return index;
    }

    return group.people.length > groups[largestIndex].people.length ? index : largestIndex;
  }, -1);
  const featuredCommitteeGroup =
    featuredCommitteeIndex >= 0 ? committeeGroups[featuredCommitteeIndex] : null;
  const supportingCommitteeGroups = committeeGroups.filter(
    (_, index) => index !== featuredCommitteeIndex,
  );
  const marqueeItems = [
    ...hero.highlights.map((item) => `${item.value} ${item.label}`),
    ...sections.activities.items.map((item) => item.title),
  ];

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
        <div className="topbar-inner">
          <a className="brand" href="#top">
            <span className="brand-mark">{branding.mark}</span>
            <span className="brand-copy">
              <strong>{branding.title}</strong>
              <span>{branding.subtitle}</span>
            </span>
          </a>
          <nav className="topbar-nav" aria-label="Section navigation">
            {homeHref ? (
              <a className="topbar-home-link" href={homeHref}>
                <ArrowLeft size={15} aria-hidden="true" />
                All Groups
              </a>
            ) : null}
            {navigation.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
          <ActionLink action={branding.topbarAction} className="topbar-action" />
        </div>
      </header>

      <main>
        <motion.section className="hero" id="top" {...reveal()}>
          <div className="hero-ambient" aria-hidden="true">
            <span className="hero-orbit hero-orbit-one" />
            <span className="hero-orbit hero-orbit-two" />
            <span className="hero-beam hero-beam-one" />
            <span className="hero-beam hero-beam-two" />
          </div>

          <div className="hero-copy">
            <div className="hero-lead-in">
              <span className="eyebrow">{hero.eyebrow}</span>
              <span className="hero-lead-line" />
            </div>
            <h1 className={getHeroTitleClass(hero.title)}>{hero.title}</h1>
            <p className="hero-text">{hero.description}</p>
            <div className="hero-actions">
              {hero.actions.map((action, index) => (
                <ActionLink
                  key={action.label}
                  action={action}
                  className={index === 0 ? 'button button-primary' : 'button button-secondary'}
                />
              ))}
            </div>
            <div className="hero-marquee" aria-hidden="true">
              <div className="hero-marquee-track">
                {marqueeItems.concat(marqueeItems).map((item, index) => (
                  <span className="hero-marquee-item" key={`${item}-${index}`}>
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="highlight-grid">
              {hero.highlights.map((item, index) => (
                <motion.article
                  key={item.label}
                  className="highlight-card"
                  {...reveal(0.08 + index * 0.07)}
                >
                  <span className="highlight-value">{item.value}</span>
                  <span className="highlight-label">{item.label}</span>
                </motion.article>
              ))}
            </div>
          </div>

          <motion.aside className="hero-panel" {...reveal(0.12)}>
            <div className="hero-panel-header">
              <Users size={18} aria-hidden="true" />
              <span className="hero-panel-status" aria-hidden="true" />
              <span>{hero.snapshot.title}</span>
            </div>
            <div className="hero-panel-grid">
              {hero.snapshot.items.map((item) => (
                <article className="snapshot-card" key={item.label}>
                  <p className="panel-label">{item.label}</p>
                  {item.value ? <p className="snapshot-value">{item.value}</p> : null}
                  <p className="panel-copy">{item.description}</p>
                </article>
              ))}
            </div>
          </motion.aside>
        </motion.section>

        <section className="section" id={sections.activities.id}>
          <SectionHeading section={sections.activities} />
          <div className="activity-grid">
            {sections.activities.items.map((item, index) => {
              const Icon = getIcon(item.icon, Scale);

              return (
                <motion.article key={item.title} className="activity-card" {...reveal(index * 0.08)}>
                  <div className="card-icon">
                    <Icon size={20} aria-hidden="true" />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </motion.article>
              );
            })}
          </div>
        </section>

        <section className="section" id={sections.meetings.id}>
          <SectionHeading section={sections.meetings} />
          <div className="meeting-grid">
            {sections.meetings.tracks.map((track, index) => (
              <motion.section
                key={track.title}
                className={`meeting-track meeting-track-${track.tone}`}
                {...reveal(index * 0.09)}
              >
                <div className="meeting-track-header">
                  <div className="card-icon">
                    <CalendarDays size={20} aria-hidden="true" />
                  </div>
                  <div>
                    <h3>{track.title}</h3>
                    <p>{track.summary}</p>
                  </div>
                </div>
                <div className="meeting-list">
                  {(track.tone === 'past' ? track.meetings.slice(0, 3) : track.meetings).map((meeting) => (
                    <article className="meeting-card" key={meeting.title}>
                      <h4>{meeting.title}</h4>
                      <p>{meeting.date}</p>
                      {meeting.href ? (
                        <a href={meeting.href} {...getLinkProps(meeting.href)}>
                          {meeting.linkLabel ?? 'Open event details'}
                          <ExternalLink size={15} aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-link text-link-muted">
                          {meeting.linkLabel ?? 'Details coming soon'}
                        </span>
                      )}
                    </article>
                  ))}
                </div>
                {track.footerLink ? (
                  <a className="text-link" href={track.footerLink.href} {...getLinkProps(track.footerLink.href)}>
                    {track.footerLink.label}
                    <ArrowRight size={15} aria-hidden="true" />
                  </a>
                ) : null}
              </motion.section>
            ))}
          </div>
        </section>

        <section className="section" id={sections.resources.id}>
          <SectionHeading section={sections.resources} />
          <div className="resource-layout">
            <div className="resource-grid">
              {sections.resources.cards.map((card, index) => {
                const Icon = getIcon(card.icon, FileText);

                return (
                  <motion.article key={card.title} className="resource-card" {...reveal(index * 0.06)}>
                    <div className="resource-topline">
                      <div className="card-icon">
                        <Icon size={19} aria-hidden="true" />
                      </div>
                      <span className="status-pill">{card.status}</span>
                    </div>
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                    {card.href ? (
                      <a href={card.href} {...getLinkProps(card.href)}>
                        {card.cta}
                        <ExternalLink size={15} aria-hidden="true" />
                      </a>
                    ) : (
                      <span className="text-link text-link-muted">{card.cta}</span>
                    )}
                  </motion.article>
                );
              })}
            </div>

            <motion.aside className="membership-panel" {...reveal(0.18)}>
              <span className="eyebrow">{sections.resources.aside.eyebrow}</span>
              <h3>{sections.resources.aside.title}</h3>
              <p>{sections.resources.aside.description}</p>
              <div className="membership-actions">
                {sections.resources.aside.actions.map((action, index) => (
                  <ActionLink
                    key={action.label}
                    action={action}
                    className={index === 0 ? 'button button-primary' : 'button button-secondary'}
                  />
                ))}
              </div>
            </motion.aside>
          </div>
        </section>

        <section className="section" id={sections.committee.id}>
          <SectionHeading section={sections.committee} />
          <div className="committee-layout">
            {supportingCommitteeGroups.length ? (
              <div className="committee-leadership-grid">
                {supportingCommitteeGroups.map((group, index) => (
                  <motion.article
                    key={group.role}
                    className="committee-card committee-card-leadership"
                    {...reveal(index * 0.07)}
                  >
                    <div className="committee-header committee-header-split">
                      <div className="committee-title-block">
                        <div className="card-icon">
                          <Users size={19} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="committee-meta">Leadership</p>
                          <h3>{group.role}</h3>
                        </div>
                      </div>
                      <span className="committee-count">
                        {group.people.length} {group.people.length === 1 ? 'Member' : 'Members'}
                      </span>
                    </div>
                    <ul className="committee-list">
                      {group.people.map((person) => (
                        <li key={person.name}>
                          {person.href ? (
                            <a href={person.href} {...getLinkProps(person.href)}>
                              {person.name}
                            </a>
                          ) : (
                            <span className="committee-person">{person.name}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </motion.article>
                ))}
              </div>
            ) : null}

            {featuredCommitteeGroup ? (
              <motion.article
                className="committee-card committee-card-featured"
                {...reveal(supportingCommitteeGroups.length * 0.07 + 0.08)}
              >
                <div className="committee-header committee-header-split">
                  <div className="committee-title-block">
                    <div className="card-icon">
                      <Users size={19} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="committee-meta">Full Roster</p>
                      <h3>{featuredCommitteeGroup.role}</h3>
                    </div>
                  </div>
                  <span className="committee-count">
                    {featuredCommitteeGroup.people.length}{' '}
                    {featuredCommitteeGroup.people.length === 1 ? 'Member' : 'Members'}
                  </span>
                </div>
                <ul className="committee-list committee-list-featured">
                  {featuredCommitteeGroup.people.map((person) => (
                    <li key={person.name}>
                      {person.href ? (
                        <a href={person.href} {...getLinkProps(person.href)}>
                          {person.name}
                        </a>
                      ) : (
                        <span className="committee-person">{person.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ) : null}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-copy">
          <span className="eyebrow">{footer.eyebrow}</span>
          <p>{footer.description}</p>
        </div>
        <div className="footer-contact">
          {footer.contacts.map((contact) => (
            <a key={contact.href} href={contact.href} {...getLinkProps(contact.href)}>
              {contact.label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
