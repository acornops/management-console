export type ResourcePhase = 'idle' | 'loading' | 'ready' | 'refreshing' | 'error';

export type MutationPhase = 'idle' | 'pending' | 'success' | 'error';

export type CursorCollectionPhase = Exclude<ResourcePhase, 'idle'> | 'loadingMore';

export type ResourceRequestPhase = Extract<ResourcePhase, 'loading' | 'refreshing'>;

export function resourcePhaseForRequest(hasContent: boolean): ResourceRequestPhase {
  return hasContent ? 'refreshing' : 'loading';
}
