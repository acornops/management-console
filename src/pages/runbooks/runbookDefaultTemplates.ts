import { TFunction } from 'i18next';

import { createDefaultRunbookTemplates } from '@/pages/runbooks/runbookModel';

export const createTranslatedDefaultRunbookTemplates = (t: TFunction) =>
  createDefaultRunbookTemplates({
    oomkilledTriage: {
      title: t('runbooks.seedTemplates.oomkilledTriage.title'),
      description: t('runbooks.seedTemplates.oomkilledTriage.description'),
      prompt: t('runbooks.seedTemplates.oomkilledTriage.prompt')
    },
    latencyAnalysis: {
      title: t('runbooks.seedTemplates.latencyAnalysis.title'),
      description: t('runbooks.seedTemplates.latencyAnalysis.description'),
      prompt: t('runbooks.seedTemplates.latencyAnalysis.prompt')
    },
    nodeNotReady: {
      title: t('runbooks.seedTemplates.nodeNotReady.title'),
      description: t('runbooks.seedTemplates.nodeNotReady.description'),
      prompt: t('runbooks.seedTemplates.nodeNotReady.prompt')
    },
    vmServiceFailure: {
      title: t('runbooks.seedTemplates.vmServiceFailure.title'),
      description: t('runbooks.seedTemplates.vmServiceFailure.description'),
      prompt: t('runbooks.seedTemplates.vmServiceFailure.prompt')
    },
    vmLogErrorSweep: {
      title: t('runbooks.seedTemplates.vmLogErrorSweep.title'),
      description: t('runbooks.seedTemplates.vmLogErrorSweep.description'),
      prompt: t('runbooks.seedTemplates.vmLogErrorSweep.prompt')
    },
    vmCpuMemoryPressure: {
      title: t('runbooks.seedTemplates.vmCpuMemoryPressure.title'),
      description: t('runbooks.seedTemplates.vmCpuMemoryPressure.description'),
      prompt: t('runbooks.seedTemplates.vmCpuMemoryPressure.prompt')
    },
    vmNetworkListeners: {
      title: t('runbooks.seedTemplates.vmNetworkListeners.title'),
      description: t('runbooks.seedTemplates.vmNetworkListeners.description'),
      prompt: t('runbooks.seedTemplates.vmNetworkListeners.prompt')
    },
    targetHealthSummary: {
      title: t('runbooks.seedTemplates.targetHealthSummary.title'),
      description: t('runbooks.seedTemplates.targetHealthSummary.description'),
      prompt: t('runbooks.seedTemplates.targetHealthSummary.prompt')
    }
  });
