export type CollectionPhase =
  | 'loading'
  | 'ready'
  | 'refreshing'
  | 'error'
  | 'loadingMore';

/** @deprecated Prefer CollectionPhase in package consumers. */
export type CursorCollectionPhase = CollectionPhase;
