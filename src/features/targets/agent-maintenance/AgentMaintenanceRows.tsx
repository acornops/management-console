import { KeyRound, Wrench } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@acornops/ui';
import { SettingsRow } from '@/components/common/SettingsRow';

export function AgentMaintenanceRows({
  agentName, repairDescription, replacementDescription, onRepair, onReplace,
  repairing = false, replacing = false, disabled = false
}: {
  agentName: string;
  repairDescription: string;
  replacementDescription: string;
  onRepair?: () => void | Promise<void>;
  onReplace?: () => void | Promise<void>;
  repairing?: boolean;
  replacing?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const busy = repairing || replacing || disabled;
  return <>
    <SettingsRow icon={Wrench} label={t('agentMaintenance.repair', { agentName })} description={repairDescription}
      action={<Button onClick={onRepair} disabled={!onRepair || busy} variant="secondary" size="sm" className="w-full sm:w-auto">
        <Wrench className="h-4 w-4" />
        {repairing ? t('agentMaintenance.generating') : t('agentMaintenance.generateRepair')}
      </Button>} />
    <SettingsRow icon={KeyRound} label={t('agentMaintenance.replace', { agentName })} description={replacementDescription}
      action={<Button onClick={onReplace} disabled={!onReplace || busy} title={!onReplace ? t('agentMaintenance.keyPermissionRequired') : undefined} variant="secondary" size="sm" className="w-full sm:w-auto">
        <KeyRound className="h-4 w-4" />
        {replacing ? t('agentMaintenance.generating') : t('agentMaintenance.replace', { agentName })}
      </Button>} />
  </>;
}
