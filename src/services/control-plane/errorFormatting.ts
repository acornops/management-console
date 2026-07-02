import i18n from '@/i18n';
import { ControlPlaneRequestError } from './http';

export type ControlPlaneErrorArea =
  | 'aiSettings'
  | 'auth'
  | 'cluster'
  | 'mcp'
  | 'members'
  | 'targetInsights'
  | 'targetSkills'
  | 'targetTools'
  | 'virtualMachines';

interface FormatControlPlaneErrorOptions {
  area?: ControlPlaneErrorArea;
  ownerConflictMessage?: string;
}

const controlPlanePrefixPattern = /^Control plane request failed \(\d+\):\s*/i;

function stripControlPlanePrefix(message: string): string {
  return message.replace(controlPlanePrefixPattern, '').trim();
}

function fieldLabel(value: string): string {
  return value
    .replace(/\.(\d+)\./g, ' ')
    .replace(/\./g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function summarizeDetails(details?: Record<string, unknown>): string | null {
  const formErrors = details?.formErrors;
  if (Array.isArray(formErrors)) {
    const message = formErrors.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (message) return message.trim();
  }

  const fieldErrors = details?.fieldErrors;
  if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
    for (const [field, messages] of Object.entries(fieldErrors)) {
      if (!Array.isArray(messages)) continue;
      const message = messages.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
      if (message) return `${fieldLabel(field)}: ${message.trim()}`;
    }
  }

  const validationErrors = details?.validationErrors;
  if (Array.isArray(validationErrors)) {
    const message = validationErrors.find((item): item is string => typeof item === 'string' && item.trim().length > 0);
    if (message) return message.trim();
  }

  return null;
}

function tr(key: string, fallback: string, values?: Record<string, unknown>): string {
  if (!i18n.isInitialized) return fallback;
  const translated = i18n.t(key, { ...values, defaultValue: fallback });
  return typeof translated === 'string' && translated.trim() ? translated : fallback;
}

function validationMessage(area?: ControlPlaneErrorArea): string {
  switch (area) {
    case 'aiSettings':
      return tr('controlPlaneErrors.validation.aiSettings', 'Check the AI settings and try again.');
    case 'auth':
      return tr('controlPlaneErrors.validation.auth', 'Check the account details and try again.');
    case 'cluster':
      return tr('controlPlaneErrors.validation.cluster', 'Check the cluster settings and try again.');
    case 'mcp':
      return tr('controlPlaneErrors.validation.mcp', 'Check the MCP server URL, headers, and auth settings.');
    case 'members':
      return tr('controlPlaneErrors.validation.members', 'Check the member or invitation details and try again.');
    case 'targetInsights':
      return tr('controlPlaneErrors.validation.targetInsights', 'Check the Target Insights settings and try again.');
    case 'targetSkills':
      return tr('controlPlaneErrors.validation.targetSkills', 'Check the skill details and try again.');
    case 'targetTools':
      return tr('controlPlaneErrors.validation.targetTools', 'Check the tool settings and try again.');
    case 'virtualMachines':
      return tr('controlPlaneErrors.validation.virtualMachines', 'Check the virtual machine details and try again.');
    default:
      return tr('controlPlaneErrors.validation.default', 'Check the request and try again.');
  }
}

function upstreamMessage(area?: ControlPlaneErrorArea): string {
  switch (area) {
    case 'aiSettings':
      return tr('controlPlaneErrors.upstream.aiSettings', 'Could not sync AI settings with the gateway. Try again shortly.');
    case 'mcp':
      return tr('controlPlaneErrors.upstream.mcp', 'Could not sync MCP settings with the gateway. Try again shortly.');
    case 'targetInsights':
      return tr('controlPlaneErrors.upstream.targetInsights', 'Target Insights could not complete the request. Try again shortly.');
    case 'targetSkills':
      return tr('controlPlaneErrors.upstream.targetSkills', 'The Git provider could not complete the skill import. Try again shortly.');
    default:
      return tr('controlPlaneErrors.upstream.default', 'The service could not complete the request. Try again shortly.');
  }
}

function networkUnavailableMessage(): string {
  return tr('controlPlaneErrors.networkUnavailable', 'Could not reach the service. Check your connection and try again.');
}

function mapControlPlaneCode(
  code: string | undefined,
  status: number | undefined,
  rawMessage: string,
  details: Record<string, unknown> | undefined,
  fallback: string,
  options: FormatControlPlaneErrorOptions
): string {
  const detail = summarizeDetails(details);
  const area = options.area;

  switch (code) {
    case 'VALIDATION_ERROR':
    case 'INVALID_REQUEST':
      return detail || validationMessage(area);
    case 'FORBIDDEN':
    case 'PASSWORD_AUTH_DISABLED':
    case 'PASSWORD_AUTH_NOT_CONFIGURED':
    case 'SIGNUP_DISABLED':
    case 'PASSWORD_RESET_DISABLED':
      return area === 'auth'
        ? tr('controlPlaneErrors.authUnavailable', 'This sign-in method is not available.')
        : tr('controlPlaneErrors.forbidden', 'You do not have permission to do that.');
    case 'NOT_FOUND':
      return tr('controlPlaneErrors.notFound', 'The requested item could not be found. Refresh and try again.');
    case 'CONFLICT':
      return tr('controlPlaneErrors.conflict', 'This change conflicts with the current state. Refresh and try again.');
    case 'UPSTREAM_AUTH_ERROR':
      return tr('controlPlaneErrors.gatewayCredentialsRejected', 'The gateway rejected the saved credentials. Check the configuration and try again.');
    case 'UPSTREAM_ERROR':
      return upstreamMessage(area);
    case 'PROVIDER_NOT_ALLOWED':
    case 'PROVIDER_NOT_SUPPORTED':
      return tr('controlPlaneErrors.providerNotAllowed', 'Choose an enabled provider for this workspace.');
    case 'MODEL_NOT_ALLOWED':
      return tr('controlPlaneErrors.modelNotAllowed', 'Choose a model that is available for the selected provider.');
    case 'REASONING_SUMMARY_MODE_NOT_ALLOWED':
    case 'REASONING_EFFORT_NOT_ALLOWED':
    case 'REASONING_SUMMARIES_DISABLED':
      return tr('controlPlaneErrors.reasoningNotAllowed', 'Choose reasoning settings allowed by this deployment.');
    case 'INVALID_CREDENTIALS':
      return area === 'auth' ? tr('controlPlaneErrors.invalidCredentials', 'The credentials are incorrect.') : fallback;
    case 'RATE_LIMITED':
      return tr('controlPlaneErrors.rateLimited', 'Too many attempts. Wait a moment and try again.');
    case 'EMAIL_VERIFICATION_REQUIRED':
      return tr('controlPlaneErrors.emailVerificationRequired', 'Verify your email before continuing.');
    case 'EMAIL_EXISTS':
      return tr('controlPlaneErrors.emailExists', 'An account already exists for that email.');
    case 'USERNAME_EXISTS':
      return tr('controlPlaneErrors.usernameExists', 'That username is already in use.');
    case 'PASSWORD_POLICY_VIOLATION':
      return rawMessage || tr('controlPlaneErrors.passwordPolicyViolation', 'Choose a stronger password.');
    case 'EMAIL_DELIVERY_FAILED':
      return tr('controlPlaneErrors.emailDeliveryFailed', 'The account was created, but the verification email could not be sent.');
    case 'PASSWORD_RESET_TOKEN_INVALID':
    case 'EMAIL_VERIFICATION_TOKEN_INVALID':
      return tr('controlPlaneErrors.invalidLink', 'This link is invalid. Request a new one and try again.');
    case 'PASSWORD_RESET_TOKEN_EXPIRED':
    case 'EMAIL_VERIFICATION_TOKEN_EXPIRED':
      return tr('controlPlaneErrors.expiredLink', 'This link has expired. Request a new one and try again.');
    case 'PROTECTED_ROLE_REQUIRES_OWNER':
      return tr('controlPlaneErrors.protectedRoleRequiresOwner', 'Only workspace owners can assign or remove that role.');
    case 'ROLE_NOT_SUPPORTED':
      return tr('controlPlaneErrors.roleNotSupported', 'That workspace role is not available in this deployment.');
    case 'LAST_OWNER':
      return options.ownerConflictMessage || tr('controlPlaneErrors.lastOwner', 'Workspace must keep at least one owner.');
    case 'INVITATION_EXPIRED':
      return tr('controlPlaneErrors.invitationExpired', 'This invitation has expired. Ask for a new invitation.');
    case 'INVITATION_UNAVAILABLE':
      return tr('controlPlaneErrors.invitationUnavailable', 'This invitation is no longer available.');
    case 'INVITATION_EMAIL_MISMATCH': {
      const email = details?.email;
      return typeof email === 'string' && email
        ? tr('controlPlaneErrors.invitationEmailMismatchWithEmail', 'Sign in as {{email}} to accept this invitation.', { email })
        : tr('controlPlaneErrors.invitationEmailMismatch', 'Sign in with the invited email address to accept this invitation.');
    }
    case 'QUOTA_EXCEEDED':
      return tr('controlPlaneErrors.quotaExceeded', 'This workspace has reached its limit. Remove something or adjust the quota before trying again.');
    case 'NAMESPACE_NOT_ALLOWED':
      return tr('controlPlaneErrors.namespaceNotAllowed', 'That namespace is outside this cluster scope.');
    case 'AGENT_UNAVAILABLE':
      return tr('controlPlaneErrors.agentUnavailable', 'The agent is offline or did not respond. Check connectivity and try again.');
    case 'AGENT_TOOL_ERROR':
      return tr('controlPlaneErrors.agentToolError', 'The agent could not complete the request. Try again or check the agent logs.');
    case 'INVALID_CURSOR':
      return tr('controlPlaneErrors.invalidCursor', 'This list could not be loaded. Refresh and try again.');
    case 'INVALID_REPO_URL':
    case 'UNSUPPORTED_REPO_HOST':
      return tr('controlPlaneErrors.skills.invalidRepoUrl', 'Enter a GitHub or GitLab repository URL.');
    case 'REPOSITORY_NOT_FOUND':
      return tr('controlPlaneErrors.skills.repositoryNotFound', 'Repository was not found or is not public.');
    case 'REF_NOT_FOUND':
      return tr('controlPlaneErrors.skills.refNotFound', 'Git ref was not found.');
    case 'SUBPATH_NOT_FOUND':
      return tr('controlPlaneErrors.skills.subpathNotFound', 'Git subpath was not found.');
    case 'INVALID_SKILL_BUNDLE':
      return tr('controlPlaneErrors.skills.invalidBundle', 'That path does not contain a valid skill bundle. Choose a folder with SKILL.md.');
    case 'INVALID_SKILL_BUNDLE_LIMIT':
      return tr('controlPlaneErrors.skills.bundleTooLarge', 'Skill bundle exceeds storage limits.');
    case 'INVALID_SKILL':
      return tr('controlPlaneErrors.skills.invalidSkill', 'Only valid skills can be enabled.');
    case 'SKILL_LIMIT_REACHED':
      return tr('controlPlaneErrors.skills.limitReached', 'This target has reached its enabled skill limit.');
    case 'REIMPORT_CONFIRMATION_REQUIRED':
      return tr('controlPlaneErrors.skills.reimportConfirmationRequired', 'This imported skill has local changes. Confirm overwrite before reimporting.');
    case 'INVALID_SKILL_SOURCE':
      return tr('controlPlaneErrors.skills.invalidSource', 'Only Git-imported skills can be reimported.');
    default:
      break;
  }

  if (status === 400) return detail || validationMessage(area);
  if (status === 403) return tr('controlPlaneErrors.forbidden', 'You do not have permission to do that.');
  if (status === 404) return tr('controlPlaneErrors.notFound', 'The requested item could not be found. Refresh and try again.');
  if (status === 409) return tr('controlPlaneErrors.conflict', 'This change conflicts with the current state. Refresh and try again.');
  if (status === 429) return tr('controlPlaneErrors.rateLimited', 'Too many attempts. Wait a moment and try again.');
  if (status && status >= 500) return upstreamMessage(area);
  return rawMessage || fallback;
}

export function formatControlPlaneError(
  error: unknown,
  fallback: string,
  options: FormatControlPlaneErrorOptions = {}
): string {
  if (error instanceof ControlPlaneRequestError) {
    const rawMessage = stripControlPlanePrefix(error.message);
    return mapControlPlaneCode(error.code, error.status, rawMessage, error.details, fallback, options);
  }

  if (error instanceof Error) {
    const rawMessage = stripControlPlanePrefix(error.message);
    if (/only owner|last owner|sole owner|at least one owner|must have.*owner/i.test(rawMessage)) {
      return options.ownerConflictMessage || rawMessage || fallback;
    }
    if (/failed to fetch|networkerror|network request failed|load failed|fetch failed|csrf token request failed|csrf token response was missing/i.test(rawMessage)) {
      return networkUnavailableMessage();
    }
    const requestFailureStatus = rawMessage.match(/\brequest failed \((\d{3})\)/i);
    if (requestFailureStatus) {
      const status = Number(requestFailureStatus[1]);
      return mapControlPlaneCode(undefined, status, '', undefined, fallback, options);
    }
    if (/^UNAUTHORIZED$/i.test(rawMessage)) {
      return tr('controlPlaneErrors.sessionExpired', 'Sign in again to continue.');
    }
    return rawMessage || fallback;
  }

  return fallback;
}
