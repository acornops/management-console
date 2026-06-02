import React from 'react';
import { useTranslation } from 'react-i18next';
import { DetailRow, SidePanel } from '@/features/kubernetes-cluster-detail/components/workloads/resourceExplorerLayout';
import {
  IngressExplorerItem,
  NamespaceExplorerItem,
  NodeExplorerItem,
  PVCExplorerItem,
  ServiceExplorerItem
} from '@/features/kubernetes-cluster-detail/components/workloads/workloadExplorerParts';

export type InfrastructureResource =
  | { kind: 'service'; item: ServiceExplorerItem }
  | { kind: 'ingress'; item: IngressExplorerItem }
  | { kind: 'pvc'; item: PVCExplorerItem }
  | { kind: 'node'; item: NodeExplorerItem }
  | { kind: 'namespace'; item: NamespaceExplorerItem };

interface ResourceDetailsDrawerProps {
  resource: InfrastructureResource | null;
  onClose: () => void;
}

function formatRecord(record: Record<string, string> | undefined): string {
  if (!record || Object.keys(record).length === 0) return '-';
  return Object.entries(record)
    .map(([key, value]) => `${key}=${value}`)
    .join(', ');
}

function formatList(values: string[] | undefined): string {
  return values && values.length > 0 ? values.join(', ') : '-';
}

function getResourceUid(resource: InfrastructureResource): string {
  if ('uid' in resource.item && resource.item.uid) return resource.item.uid;
  if ('id' in resource.item) return resource.item.id;
  return '-';
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-ui-border pt-5 first:border-t-0 first:pt-0">
    <span className="type-label">{title}</span>
    <div className="mt-3">{children}</div>
  </section>
);

export const ResourceDetailsDrawer: React.FC<ResourceDetailsDrawerProps> = ({ resource, onClose }) => {
  const { t } = useTranslation();
  const title = resource
    ? t('resources.drawerTitle', { kind: t(`resources.kinds.${resource.kind}`), name: resource.item.name })
    : '';

  return (
    <SidePanel isOpen={Boolean(resource)} onClose={onClose} title={title}>
      {resource && (
        <div className="space-y-6">
          <DetailSection title={t('workloads.metadata')}>
            <DetailRow label={t('workloads.cluster')} value={resource.item.clusterName} />
            {resource.kind !== 'node' && resource.kind !== 'namespace' && (
              <DetailRow label={t('workloads.namespace')} value={resource.item.namespace} />
            )}
            <DetailRow label={t('workloads.status')} value={'status' in resource.item ? resource.item.status : t('workloads.active')} />
            <DetailRow label={t('workloads.uid')} value={getResourceUid(resource)} />
            {'age' in resource.item && <DetailRow label={t('workloads.metricLabels.Age')} value={resource.item.age} />}
          </DetailSection>

          {resource.kind === 'service' && (
            <DetailSection title={t('resources.detail.connection')}>
              <DetailRow label={t('resources.detail.serviceType')} value={resource.item.type} />
              <DetailRow label={t('resources.detail.clusterIp')} value={resource.item.clusterIP} />
              <DetailRow label={t('resources.detail.ports')} value={resource.item.ports} />
              <DetailRow label={t('resources.detail.selector')} value={formatRecord(resource.item.selector)} />
              <DetailRow label={t('resources.detail.externalIps')} value={formatList(resource.item.externalIPs)} />
              <DetailRow label={t('resources.detail.loadBalancerIp')} value={resource.item.loadBalancerIP || '-'} />
            </DetailSection>
          )}

          {resource.kind === 'ingress' && (
            <>
              <DetailSection title={t('resources.detail.routing')}>
                <DetailRow label={t('resources.detail.ingressClass')} value={resource.item.ingressClassName || '-'} />
                <DetailRow label={t('resources.detail.hosts')} value={formatList(resource.item.hosts)} />
                <DetailRow label={t('resources.detail.address')} value={resource.item.address || '-'} />
              </DetailSection>
              {resource.item.rules && resource.item.rules.length > 0 && (
                <DetailSection title={t('resources.detail.rules')}>
                  {resource.item.rules.map((rule, ruleIndex) => (
                    <div key={`${rule.host || 'wildcard'}-${ruleIndex}`} className="border-t border-ui-border py-3 first:border-t-0 first:pt-0 last:pb-0">
                      <p className="type-row-title mb-2">{rule.host || t('resources.detail.wildcardHost')}</p>
                      <div>
                        {rule.paths.map((path, pathIndex) => (
                          <DetailRow
                            key={`${path.path || '/'}-${pathIndex}`}
                            label={path.path || '/'}
                            value={`${path.serviceName || '-'}:${path.servicePort || '-'} (${path.pathType || '-'})`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </DetailSection>
              )}
              {resource.item.tls && resource.item.tls.length > 0 && (
                <DetailSection title={t('resources.detail.tls')}>
                  {resource.item.tls.map((tls, index) => (
                    <DetailRow key={`${tls.secretName || 'tls'}-${index}`} label={tls.secretName || '-'} value={formatList(tls.hosts)} />
                  ))}
                </DetailSection>
              )}
            </>
          )}

          {resource.kind === 'pvc' && (
            <DetailSection title={t('resources.detail.storage')}>
              <DetailRow label={t('resources.detail.capacity')} value={resource.item.capacity} />
              <DetailRow label={t('resources.detail.storageClass')} value={resource.item.storageClass} />
              <DetailRow label={t('resources.detail.accessModes')} value={formatList(resource.item.accessModes)} />
              <DetailRow label={t('resources.detail.volumeName')} value={resource.item.volumeName || '-'} />
              <DetailRow label={t('resources.detail.volumeMode')} value={resource.item.volumeMode || '-'} />
            </DetailSection>
          )}

          {resource.kind === 'node' && (
            <>
              <DetailSection title={t('resources.detail.nodeRuntime')}>
                <DetailRow label={t('resources.detail.role')} value={resource.item.role} />
                <DetailRow label={t('resources.detail.version')} value={resource.item.version} />
                <DetailRow label={t('resources.detail.osImage')} value={resource.item.osImage || '-'} />
                <DetailRow label={t('resources.detail.containerRuntime')} value={resource.item.containerRuntimeVersion || '-'} />
                <DetailRow label={t('resources.detail.architecture')} value={resource.item.architecture || '-'} />
                <DetailRow label={t('resources.detail.operatingSystem')} value={resource.item.operatingSystem || '-'} />
              </DetailSection>
              <DetailSection title={t('resources.detail.capacity')}>
                <DetailRow label={t('resources.detail.cpu')} value={resource.item.capacity?.cpu || '-'} />
                <DetailRow label={t('resources.detail.memory')} value={resource.item.capacity?.memory || '-'} />
                <DetailRow label={t('resources.detail.allocatableCpu')} value={resource.item.allocatable?.cpu || '-'} />
                <DetailRow label={t('resources.detail.allocatableMemory')} value={resource.item.allocatable?.memory || '-'} />
              </DetailSection>
              {resource.item.conditions && resource.item.conditions.length > 0 && (
                <DetailSection title={t('resources.detail.conditions')}>
                  {resource.item.conditions.map((condition) => (
                    <DetailRow
                      key={condition.type}
                      label={condition.type}
                      value={`${condition.status}${condition.reason ? ` · ${condition.reason}` : ''}`}
                    />
                  ))}
                </DetailSection>
              )}
              <DetailSection title={t('resources.detail.labels')}>
                <DetailRow label={t('resources.detail.labels')} value={formatRecord(resource.item.labels)} />
              </DetailSection>
            </>
          )}

          {resource.kind === 'namespace' && (
            <DetailSection title={t('resources.detail.namespaceScope')}>
              <DetailRow label={t('resources.detail.workloads')} value={String(resource.item.workloadCount)} />
              <DetailRow label={t('resources.detail.services')} value={String(resource.item.serviceCount)} />
              <DetailRow label={t('resources.detail.ingresses')} value={String(resource.item.ingressCount)} />
              <DetailRow label={t('resources.detail.pvcs')} value={String(resource.item.pvcCount)} />
              <DetailRow label={t('resources.detail.labels')} value={formatRecord(resource.item.labels)} />
            </DetailSection>
          )}
        </div>
      )}
    </SidePanel>
  );
};
