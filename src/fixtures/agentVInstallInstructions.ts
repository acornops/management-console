const baseInstructions = {
  command: 'fixture-mode: no agent installation is required',
  releaseVersion: '0.0.1-experimental.5',
  bootstrapUrl: 'https://github.com/acornops/agentv/releases/download/v0.0.1-experimental.5/install-agentv.sh',
  warnings: ['This command is illustrative and cannot connect an external VM.']
};

export function fixtureAgentVEnrollmentInstructions(purpose: 'initial' | 'replace') {
  return {
    ...baseInstructions,
    command: `${baseInstructions.command}${purpose === 'replace' ? ' --replace-credential' : ''}`,
    enrollmentExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString()
  };
}

export function fixtureAgentVRepairInstructions() {
  return { ...baseInstructions };
}
