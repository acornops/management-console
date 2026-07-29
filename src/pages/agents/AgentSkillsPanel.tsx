import { Button, InlineConfirmation, StatusBadge } from '@acornops/ui';
import type { AgentDefinition } from '@/pages/agents/agentModel';
import type { AgentCapabilitiesState } from '@/pages/agents/useAgentCapabilities';
import { createAgentSkill, deleteAgentSkill, importAgentSkill, reimportAgentSkill, updateAgentSkill } from '@/services/control-plane/agentApi';

interface AgentSkillsPanelProps {
  agent: AgentDefinition;
  canManageAgents: boolean;
  state: AgentCapabilitiesState;
}

const inputClass = 'min-h-11 w-full rounded-md border border-ui-border bg-ui-surface px-3 text-sm text-ui-text focus-visible:ring-2 focus-visible:ring-accent';

export function AgentSkillsPanel({ agent, canManageAgents, state }: AgentSkillsPanelProps) {
  const {
    activeTab,
    t,
    skillsWritable,
    manualSkill,
    setManualSkill,
    busy,
    run,
    gitSkill,
    setGitSkill,
    skills,
    editSkillTriggers,
    setSkillEditor,
    setRemoveSkillId,
    skillEditor,
    removeSkillId,
    removeSkillTriggers
  } = state;

  return (
    <>
{activeTab === 'skills' && (
        <div id="agent-capability-skills-panel" role="tabpanel" className="space-y-4">
          {!skillsWritable && <p className="type-caption text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.permissions.skills')}</p>}
          <div className="grid gap-4 lg:grid-cols-2">
            <details className="rounded-md border border-ui-border bg-ui-bg p-4">
              <summary className="cursor-pointer text-sm font-semibold">{t('agentsWorkflows.agents.details.capabilities.skills.createTitle')}</summary>
              <div className="mt-4 grid gap-3">
                <input
                  aria-label={t('agentsWorkflows.agents.details.capabilities.skills.name')}
                  placeholder={t('agentsWorkflows.agents.details.capabilities.skills.name')}
                  value={manualSkill.name}
                  onChange={(event) =>
                    setManualSkill((value) => ({
                      ...value,
                      name: event.target.value
                    }))
                  }
                  className={inputClass}
                />
                <input
                  aria-label={t('agentsWorkflows.agents.details.capabilities.skills.description')}
                  placeholder={t('agentsWorkflows.agents.details.capabilities.skills.description')}
                  value={manualSkill.description}
                  onChange={(event) =>
                    setManualSkill((value) => ({
                      ...value,
                      description: event.target.value
                    }))
                  }
                  className={inputClass}
                />
                <textarea
                  aria-label="SKILL.md content"
                  placeholder="SKILL.md content"
                  value={manualSkill.content}
                  onChange={(event) =>
                    setManualSkill((value) => ({
                      ...value,
                      content: event.target.value
                    }))
                  }
                  className={`${inputClass} min-h-32 p-3 font-mono text-xs`}
                />
                <Button
                  disabled={!skillsWritable || !manualSkill.name.trim() || !manualSkill.content.trim() || Boolean(busy)}
                  onClick={() =>
                    void run(
                      'create-skill',
                      async () => {
                        await createAgentSkill(agent.workspaceId, agent.id, {
                          name: manualSkill.name.trim(),
                          description: manualSkill.description.trim(),
                          files: [{ path: 'SKILL.md', content: manualSkill.content }]
                        });
                        setManualSkill({
                          name: '',
                          description: '',
                          content: ''
                        });
                      },
                      'Manual skill created.'
                    )
                  }
                >
                  {t('agentsWorkflows.agents.details.capabilities.skills.create')}
                </Button>
              </div>
            </details>
            <details className="rounded-md border border-ui-border bg-ui-bg p-4">
              <summary className="cursor-pointer text-sm font-semibold">{t('agentsWorkflows.agents.details.capabilities.skills.importTitle')}</summary>
              <div className="mt-4 grid gap-3">
                <input
                  aria-label="Git URL"
                  placeholder="https://github.com/org/repo"
                  value={gitSkill.url}
                  onChange={(event) =>
                    setGitSkill((value) => ({
                      ...value,
                      url: event.target.value
                    }))
                  }
                  className={inputClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label="Git ref"
                    placeholder="Ref"
                    value={gitSkill.ref}
                    onChange={(event) =>
                      setGitSkill((value) => ({
                        ...value,
                        ref: event.target.value
                      }))
                    }
                    className={inputClass}
                  />
                  <input
                    aria-label="Pinned commit"
                    placeholder="Pinned commit"
                    value={gitSkill.commit}
                    onChange={(event) =>
                      setGitSkill((value) => ({
                        ...value,
                        commit: event.target.value
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <input
                  aria-label="Git path"
                  placeholder="Path (optional)"
                  value={gitSkill.path}
                  onChange={(event) =>
                    setGitSkill((value) => ({
                      ...value,
                      path: event.target.value
                    }))
                  }
                  className={inputClass}
                />
                <textarea
                  aria-label="Imported SKILL.md content"
                  placeholder="Reviewed SKILL.md content"
                  value={gitSkill.content}
                  onChange={(event) =>
                    setGitSkill((value) => ({
                      ...value,
                      content: event.target.value
                    }))
                  }
                  className={`${inputClass} min-h-28 p-3 font-mono text-xs`}
                />
                <Button
                  disabled={!skillsWritable || !gitSkill.url.trim() || !gitSkill.commit.trim() || !gitSkill.content.trim() || Boolean(busy)}
                  onClick={() =>
                    void run(
                      'import-skill',
                      async () => {
                        await importAgentSkill(agent.workspaceId, agent.id, {
                          files: [{ path: 'SKILL.md', content: gitSkill.content }],
                          source: {
                            type: 'git',
                            provider: gitSkill.url.includes('gitlab') ? 'gitlab' : 'github',
                            url: gitSkill.url,
                            ref: gitSkill.ref,
                            path: gitSkill.path || undefined,
                            pinnedCommit: gitSkill.commit
                          }
                        });
                        setGitSkill({
                          url: '',
                          ref: 'main',
                          path: '',
                          commit: '',
                          content: ''
                        });
                      },
                      'Git skill imported.'
                    )
                  }
                >
                  {t('agentsWorkflows.agents.details.capabilities.skills.import')}
                </Button>
              </div>
            </details>
          </div>
          <div className="divide-y divide-ui-border border-y border-ui-border">
            {skills.length ? (
              skills.map((skill) => (
                <article key={skill.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <strong className="text-sm">{skill.name}</strong>
                      <StatusBadge tone={skill.enabled ? 'success' : 'neutral'}>{skill.enabled ? t('agentsWorkflows.agents.details.capabilities.skills.enabled') : t('agentsWorkflows.agents.details.capabilities.skills.disabled')}</StatusBadge>
                      {skill.inherited && <StatusBadge tone="neutral">Platform default</StatusBadge>}
                      <StatusBadge tone="neutral">{skill.source.type}</StatusBadge>
                    </div>
                    <p className="type-caption mt-1 text-ui-text-muted">
                      {t('agentsWorkflows.agents.details.capabilities.skills.revision', {
                        revision: skill.revision,
                        digest: skill.contentDigest
                      })}
                    </p>
                    <p role="status" className="type-caption mt-1 text-ui-text-muted">
                      {t('agentsWorkflows.agents.details.capabilities.skills.validation')}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      ref={(node) => {
                        if (node) editSkillTriggers.current.set(skill.id, node);
                        else editSkillTriggers.current.delete(skill.id);
                      }}
                      size="sm"
                      variant="secondary"
                      disabled={!skillsWritable || skill.inherited || Boolean(busy)}
                      onClick={() =>
                        setSkillEditor({
                          skillId: skill.id,
                          name: skill.name,
                          description: skill.description,
                          content: skill.files.find((file) => file.path === 'SKILL.md')?.content || ''
                        })
                      }
                    >
                      {t('agentsWorkflows.agents.details.capabilities.actions.edit')}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!skillsWritable || Boolean(busy)}
                      onClick={() =>
                        void run(
                          `skill:${skill.id}`,
                          () =>
                            updateAgentSkill(agent.workspaceId, agent.id, skill.id, {
                              enabled: !skill.enabled,
                              expectedRevision: skill.revision
                            }),
                          `Skill ${skill.enabled ? 'disabled' : 'enabled'}.`
                        )
                      }
                    >
                      {skill.enabled ? 'Disable' : 'Enable'}
                    </Button>
                    {skill.source.type === 'git' && skill.source.url && skill.source.ref && skill.source.pinnedCommit && !skill.inherited && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={!skillsWritable || Boolean(busy)}
                        onClick={() =>
                          void run(
                            `reimport-skill:${skill.id}`,
                            () =>
                              reimportAgentSkill(agent.workspaceId, agent.id, skill.id, {
                                files: skill.files.map((file) => ({
                                  path: file.path,
                                  content: file.content
                                })),
                                source: {
                                  type: 'git',
                                  provider: skill.source.provider || 'github',
                                  url: skill.source.url as string,
                                  ref: skill.source.ref as string,
                                  path: skill.source.path,
                                  pinnedCommit: skill.source.pinnedCommit as string
                                },
                                expectedRevision: skill.revision
                              }),
                            'Git skill re-imported.'
                          )
                        }
                      >
                        Re-import
                      </Button>
                    )}
                    <Button
                      ref={(node) => {
                        if (node) removeSkillTriggers.current.set(skill.id, node);
                        else removeSkillTriggers.current.delete(skill.id);
                      }}
                      size="sm"
                      variant="danger"
                      disabled={!canManageAgents || skill.inherited || Boolean(busy)}
                      onClick={() => setRemoveSkillId(skill.id)}
                    >
                      {t('agentsWorkflows.agents.details.capabilities.actions.remove')}
                    </Button>
                  </div>
                  {skillEditor?.skillId === skill.id && (
                    <section className="basis-full rounded-md border border-ui-border bg-ui-bg p-3" aria-labelledby={`edit-skill-${skill.id}-title`}>
                      <h4 id={`edit-skill-${skill.id}-title`} className="type-row-title ">
                        {t('agentsWorkflows.agents.details.capabilities.editSkill.title')}
                      </h4>
                      <div className="mt-3 grid gap-3">
                        <input
                          autoFocus
                          aria-label={t('agentsWorkflows.agents.details.capabilities.editSkill.name')}
                          value={skillEditor.name}
                          onChange={(event) =>
                            setSkillEditor(
                              (current) =>
                                current && {
                                  ...current,
                                  name: event.target.value
                                }
                            )
                          }
                          className={inputClass}
                        />
                        <input
                          aria-label={t('agentsWorkflows.agents.details.capabilities.editSkill.description')}
                          value={skillEditor.description}
                          onChange={(event) =>
                            setSkillEditor(
                              (current) =>
                                current && {
                                  ...current,
                                  description: event.target.value
                                }
                            )
                          }
                          className={inputClass}
                        />
                        <textarea
                          aria-label={t('agentsWorkflows.agents.details.capabilities.editSkill.content')}
                          value={skillEditor.content}
                          onChange={(event) =>
                            setSkillEditor(
                              (current) =>
                                current && {
                                  ...current,
                                  content: event.target.value
                                }
                            )
                          }
                          className={`${inputClass} min-h-32 p-3 font-mono text-xs`}
                        />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="tertiary"
                          onClick={() => {
                            setSkillEditor(null);
                            window.requestAnimationFrame(() => editSkillTriggers.current.get(skill.id)?.focus());
                          }}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          size="sm"
                          disabled={!skillEditor.name.trim() || !skillEditor.content.trim() || Boolean(busy)}
                          onClick={() =>
                            void run(
                              `edit-skill:${skill.id}`,
                              () =>
                                updateAgentSkill(agent.workspaceId, agent.id, skill.id, {
                                  name: skillEditor.name.trim(),
                                  description: skillEditor.description.trim(),
                                  files: [
                                    {
                                      path: 'SKILL.md',
                                      content: skillEditor.content
                                    }
                                  ],
                                  expectedRevision: skill.revision
                                }),
                              t('agentsWorkflows.agents.details.capabilities.editSkill.success')
                            ).then(() => setSkillEditor(null))
                          }
                        >
                          {t('agentsWorkflows.agents.details.capabilities.actions.save')}
                        </Button>
                      </div>
                    </section>
                  )}
                  {removeSkillId === skill.id && (
                    <InlineConfirmation
                      id={`remove-skill-${skill.id}`}
                      title={t('agentsWorkflows.agents.details.capabilities.removeSkill.title', { name: skill.name })}
                      description={t('agentsWorkflows.agents.details.capabilities.removeSkill.description')}
                      tone="danger"
                      confirmVariant="danger"
                      confirmLabel={t('agentsWorkflows.agents.details.capabilities.removeSkill.confirm')}
                      confirmDisabled={Boolean(busy)}
                      cancelLabel={t('common.cancel')}
                      className="mt-4 basis-full rounded-md"
                      onCancel={() => {
                        setRemoveSkillId('');
                        window.requestAnimationFrame(() => removeSkillTriggers.current.get(skill.id)?.focus());
                      }}
                      onConfirm={() => void run(`remove-skill:${skill.id}`, () => deleteAgentSkill(agent.workspaceId, agent.id, skill.id), t('agentsWorkflows.agents.details.capabilities.removeSkill.success')).then(() => setRemoveSkillId(''))}
                    />
                  )}
                </article>
              ))
            ) : (
              <p className="py-5 text-sm text-ui-text-muted">{t('agentsWorkflows.agents.details.capabilities.skills.empty')}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
