import { useState } from 'react';
import {
  Boxes,
  CalendarDays,
  Download,
  FileUp,
  FolderCog,
  Plus,
  RefreshCcw,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react';

const iconOptions = [
  { value: 'scale', label: 'Scale' },
  { value: 'shieldCheck', label: 'Shield Check' },
  { value: 'bookOpen', label: 'Book Open' },
  { value: 'sparkles', label: 'Sparkles' },
  { value: 'fileText', label: 'File Text' },
  { value: 'lockKeyhole', label: 'Lock' },
  { value: 'messageSquare', label: 'Message' },
  { value: 'users', label: 'Users' },
];

const toneOptions = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

function TextField({
  label,
  value,
  onChange,
  placeholder,
  textarea = false,
  type = 'text',
}) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {textarea ? (
        <textarea
          className="admin-input admin-input-textarea"
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      ) : (
        <input
          className="admin-input"
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select className="admin-input" value={value ?? options[0]?.value ?? ''} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="admin-toggle">
      <div className="admin-toggle-copy">
        <span>{label}</span>
        <small>{checked ? 'Visible on the page' : 'Hidden from the page'}</small>
      </div>
      <input
        className="admin-toggle-input"
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function ItemHeader({ title, onRemove }) {
  return (
    <div className="admin-item-header">
      <h4>{title}</h4>
      <button className="admin-icon-button admin-danger" type="button" onClick={onRemove}>
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, onAdd, addLabel }) {
  return (
    <div className="admin-section-header">
      <div className="admin-section-copy">
        <div className="admin-section-title">
          <Icon size={18} aria-hidden="true" />
          <h3>{title}</h3>
        </div>
        <p>{description}</p>
      </div>
      {onAdd && addLabel ? (
        <button className="admin-add-button" type="button" onClick={onAdd}>
          <Plus size={15} aria-hidden="true" />
          {addLabel}
        </button>
      ) : null}
    </div>
  );
}

export default function AdminPanel({
  content,
  isOpen,
  onOpen,
  onClose,
  onContentChange,
  onExportContent,
  onImportContent,
  onResetContent,
  statusMessage = '',
}) {
  const [feedback, setFeedback] = useState('Export JSON to keep or share a snapshot of the current page.');
  const pageLabel = content?.branding?.mark ?? content?.branding?.title ?? 'page';
  const heroActions = content.hero.actions ?? [];

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await onImportContent(parsed);
      setFeedback(`Imported content from ${file.name}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to import that JSON file.');
    } finally {
      event.target.value = '';
    }
  };

  const handleReset = async () => {
    if (!window.confirm(`Reset all page edits back to the default ${pageLabel} content?`)) {
      return;
    }

    await onResetContent();
    setFeedback(`Reset to the default ${pageLabel} content.`);
  };

  return (
    <>
      <button
        className={`admin-fab ${isOpen ? 'is-open' : ''}`}
        type="button"
        onClick={isOpen ? onClose : onOpen}
        aria-expanded={isOpen}
        aria-controls="admin-panel"
      >
        {isOpen ? <X size={18} aria-hidden="true" /> : <Settings2 size={18} aria-hidden="true" />}
        <span>{isOpen ? 'Close Admin' : 'Open Admin'}</span>
      </button>

      <div className={`admin-overlay ${isOpen ? 'is-visible' : ''}`} onClick={onClose} aria-hidden="true" />

      <aside className={`admin-panel ${isOpen ? 'is-open' : ''}`} id="admin-panel" aria-hidden={!isOpen}>
        <div className="admin-panel-header">
          <div>
            <p className="admin-eyebrow">Page Controls</p>
            <h2>Admin Panel</h2>
          </div>
          <button className="admin-icon-button" type="button" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {statusMessage ? <p className="admin-feedback admin-feedback-secondary">{statusMessage}</p> : null}
        <p className="admin-feedback">{feedback}</p>

        <div className="admin-toolbar">
          <button className="admin-toolbar-button" type="button" onClick={onExportContent}>
            <Download size={16} aria-hidden="true" />
            Export JSON
          </button>
          <label className="admin-toolbar-button admin-file-label">
            <FileUp size={16} aria-hidden="true" />
            Import JSON
            <input className="admin-file-input" type="file" accept="application/json" onChange={handleImportFile} />
          </label>
          <button className="admin-toolbar-button" type="button" onClick={handleReset}>
            <RefreshCcw size={16} aria-hidden="true" />
            Reset
          </button>
        </div>

        <div className="admin-panel-scroll">
          <section className="admin-section">
            <SectionHeader
              icon={Settings2}
              title="Hero Buttons"
              description="Show or hide the hero buttons and control the text and destination for each one."
            />

            <div className="admin-stack">
              {heroActions.map((action, index) => (
                <article className="admin-item-card" key={`hero-action-${index}`}>
                  <div className="admin-item-header">
                    <h4>{`Hero Button ${index + 1}`}</h4>
                  </div>
                  <ToggleField
                    label="Show this button"
                    checked={action.enabled !== false}
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.hero.actions[index].enabled = value;
                      })
                    }
                  />
                  <div className="admin-grid admin-grid-two">
                    <TextField
                      label="Button text"
                      value={action.label}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.hero.actions[index].label = value;
                        })
                      }
                    />
                    <TextField
                      label="Button link"
                      value={action.href}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.hero.actions[index].href = value;
                        })
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <SectionHeader
              icon={FolderCog}
              title="Activities"
              description="Add, remove, and update the drafting-team cards."
              addLabel="Add activity"
              onAdd={() =>
                onContentChange((draft) => {
                  draft.sections.activities.items.push({
                    title: 'New activity',
                    description: 'Describe this activity.',
                    icon: 'scale',
                  });
                })
              }
            />

            <div className="admin-stack">
              {content.sections.activities.items.map((item, index) => (
                <article className="admin-item-card" key={`activity-${index}`}>
                  <ItemHeader
                    title={`Activity ${index + 1}`}
                    onRemove={() =>
                      onContentChange((draft) => {
                        draft.sections.activities.items.splice(index, 1);
                      })
                    }
                  />
                  <TextField
                    label="Title"
                    value={item.title}
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.activities.items[index].title = value;
                      })
                    }
                  />
                  <SelectField
                    label="Icon"
                    value={item.icon}
                    options={iconOptions}
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.activities.items[index].icon = value;
                      })
                    }
                  />
                  <TextField
                    label="Description"
                    value={item.description}
                    textarea
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.activities.items[index].description = value;
                      })
                    }
                  />
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <SectionHeader
              icon={CalendarDays}
              title="Meetings"
              description="Manage meeting groups and the meetings inside them."
              addLabel="Add meeting group"
              onAdd={() =>
                onContentChange((draft) => {
                  draft.sections.meetings.tracks.push({
                    title: 'New Meeting Group',
                    tone: 'upcoming',
                    summary: 'Add a short summary for this group.',
                    meetings: [
                      {
                        title: 'New meeting',
                        date: '',
                        href: '',
                      },
                    ],
                    footerLink: {
                      label: '',
                      href: '',
                    },
                  });
                })
              }
            />

            <div className="admin-stack">
              {content.sections.meetings.tracks.map((track, trackIndex) => (
                <article className="admin-item-card" key={`track-${trackIndex}`}>
                  <ItemHeader
                    title={`Meeting Group ${trackIndex + 1}`}
                    onRemove={() =>
                      onContentChange((draft) => {
                        draft.sections.meetings.tracks.splice(trackIndex, 1);
                      })
                    }
                  />
                  <TextField
                    label="Group title"
                    value={track.title}
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.meetings.tracks[trackIndex].title = value;
                      })
                    }
                  />
                  <div className="admin-grid admin-grid-two">
                    <SelectField
                      label="Tone"
                      value={track.tone}
                      options={toneOptions}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.meetings.tracks[trackIndex].tone = value;
                        })
                      }
                    />
                    <TextField
                      label="Summary"
                      value={track.summary}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.meetings.tracks[trackIndex].summary = value;
                        })
                      }
                    />
                  </div>

                  <div className="admin-inline-actions">
                    <span>Meetings</span>
                    <button
                      className="admin-mini-button"
                      type="button"
                      onClick={() =>
                        onContentChange((draft) => {
                          draft.sections.meetings.tracks[trackIndex].meetings.push({
                            title: 'New meeting',
                            date: '',
                            href: '',
                          });
                        })
                      }
                    >
                      <Plus size={14} aria-hidden="true" />
                      Add meeting
                    </button>
                  </div>

                  <div className="admin-stack admin-stack-tight">
                    {track.meetings.map((meeting, meetingIndex) => (
                      <div className="admin-subcard" key={`meeting-${meetingIndex}`}>
                        <ItemHeader
                          title={`Meeting ${meetingIndex + 1}`}
                          onRemove={() =>
                            onContentChange((draft) => {
                              draft.sections.meetings.tracks[trackIndex].meetings.splice(meetingIndex, 1);
                            })
                          }
                        />
                        <TextField
                          label="Meeting title"
                          value={meeting.title}
                          onChange={(value) =>
                            onContentChange((draft) => {
                              draft.sections.meetings.tracks[trackIndex].meetings[meetingIndex].title = value;
                            })
                          }
                        />
                        <TextField
                          label="Date text"
                          value={meeting.date}
                          onChange={(value) =>
                            onContentChange((draft) => {
                              draft.sections.meetings.tracks[trackIndex].meetings[meetingIndex].date = value;
                            })
                          }
                        />
                        <TextField
                          label="Event link"
                          value={meeting.href}
                          onChange={(value) =>
                            onContentChange((draft) => {
                              draft.sections.meetings.tracks[trackIndex].meetings[meetingIndex].href = value;
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>

                  <div className="admin-grid admin-grid-two">
                    <TextField
                      label="Footer link label"
                      value={track.footerLink?.label ?? ''}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.meetings.tracks[trackIndex].footerLink ??= { label: '', href: '' };
                          draft.sections.meetings.tracks[trackIndex].footerLink.label = value;
                        })
                      }
                    />
                    <TextField
                      label="Footer link URL"
                      value={track.footerLink?.href ?? ''}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.meetings.tracks[trackIndex].footerLink ??= { label: '', href: '' };
                          draft.sections.meetings.tracks[trackIndex].footerLink.href = value;
                        })
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <SectionHeader
              icon={Boxes}
              title="Resources"
              description="Manage resource cards and the links they send users to."
              addLabel="Add resource"
              onAdd={() =>
                onContentChange((draft) => {
                  draft.sections.resources.cards.push({
                    title: 'New resource',
                    status: 'Draft',
                    description: 'Describe this resource.',
                    href: '',
                    cta: 'Open resource',
                    icon: 'fileText',
                  });
                })
              }
            />

            <div className="admin-stack">
              {content.sections.resources.cards.map((card, index) => (
                <article className="admin-item-card" key={`resource-${index}`}>
                  <ItemHeader
                    title={`Resource ${index + 1}`}
                    onRemove={() =>
                      onContentChange((draft) => {
                        draft.sections.resources.cards.splice(index, 1);
                      })
                    }
                  />
                  <TextField
                    label="Title"
                    value={card.title}
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.resources.cards[index].title = value;
                      })
                    }
                  />
                  <div className="admin-grid admin-grid-two">
                    <TextField
                      label="Status"
                      value={card.status}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.resources.cards[index].status = value;
                        })
                      }
                    />
                    <SelectField
                      label="Icon"
                      value={card.icon}
                      options={iconOptions}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.resources.cards[index].icon = value;
                        })
                      }
                    />
                  </div>
                  <TextField
                    label="Description"
                    value={card.description}
                    textarea
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.resources.cards[index].description = value;
                      })
                    }
                  />
                  <div className="admin-grid admin-grid-two">
                    <TextField
                      label="CTA label"
                      value={card.cta}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.resources.cards[index].cta = value;
                        })
                      }
                    />
                    <TextField
                      label="Link"
                      value={card.href}
                      onChange={(value) =>
                        onContentChange((draft) => {
                          draft.sections.resources.cards[index].href = value;
                        })
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="admin-section">
            <SectionHeader
              icon={Users}
              title="Steering Committee"
              description="Update group names and member links."
              addLabel="Add group"
              onAdd={() =>
                onContentChange((draft) => {
                  draft.sections.committee.groups.push({
                    role: 'New Group',
                    people: [
                      {
                        name: 'New Member',
                        href: '',
                      },
                    ],
                  });
                })
              }
            />

            <div className="admin-stack">
              {content.sections.committee.groups.map((group, groupIndex) => (
                <article className="admin-item-card" key={`group-${groupIndex}`}>
                  <ItemHeader
                    title={`Committee Group ${groupIndex + 1}`}
                    onRemove={() =>
                      onContentChange((draft) => {
                        draft.sections.committee.groups.splice(groupIndex, 1);
                      })
                    }
                  />
                  <TextField
                    label="Group title"
                    value={group.role}
                    onChange={(value) =>
                      onContentChange((draft) => {
                        draft.sections.committee.groups[groupIndex].role = value;
                      })
                    }
                  />

                  <div className="admin-inline-actions">
                    <span>Members</span>
                    <button
                      className="admin-mini-button"
                      type="button"
                      onClick={() =>
                        onContentChange((draft) => {
                          draft.sections.committee.groups[groupIndex].people.push({
                            name: 'New Member',
                            href: '',
                          });
                        })
                      }
                    >
                      <Plus size={14} aria-hidden="true" />
                      Add member
                    </button>
                  </div>

                  <div className="admin-stack admin-stack-tight">
                    {group.people.map((person, personIndex) => (
                      <div className="admin-subcard" key={`person-${personIndex}`}>
                        <ItemHeader
                          title={`Member ${personIndex + 1}`}
                          onRemove={() =>
                            onContentChange((draft) => {
                              draft.sections.committee.groups[groupIndex].people.splice(personIndex, 1);
                            })
                          }
                        />
                        <TextField
                          label="Name"
                          value={person.name}
                          onChange={(value) =>
                            onContentChange((draft) => {
                              draft.sections.committee.groups[groupIndex].people[personIndex].name = value;
                            })
                          }
                        />
                        <TextField
                          label="Profile link"
                          value={person.href}
                          onChange={(value) =>
                            onContentChange((draft) => {
                              draft.sections.committee.groups[groupIndex].people[personIndex].href = value;
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
