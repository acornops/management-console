interface TargetMentionQueryBase {
  start: number;
  end: number;
  query: string;
}

export interface TargetMentionTypeQuery extends TargetMentionQueryBase {
  stage: 'type';
}

export interface TargetMentionTargetQuery extends TargetMentionQueryBase {
  stage: 'target';
}

export type TargetMentionQuery = TargetMentionTypeQuery | TargetMentionTargetQuery;

export interface TargetMentionInsertion {
  cursor: number;
  value: string;
}

export type TargetMentionKeyboardAction =
  | 'complete_type'
  | 'consume'
  | 'dismiss'
  | 'move_next'
  | 'move_previous'
  | 'none'
  | 'select_target';

export function resolveTargetMentionKeyboardAction(
  stage: TargetMentionQuery['stage'],
  key: string,
  shiftKey: boolean,
  hasTarget: boolean
): TargetMentionKeyboardAction {
  if (key === 'Escape') return 'dismiss';
  if (key === 'ArrowDown') return stage === 'target' ? 'move_next' : 'consume';
  if (key === 'ArrowUp') return stage === 'target' ? 'move_previous' : 'consume';
  if (stage === 'type') {
    if (key === 'Enter' || (key === 'Tab' && !shiftKey)) return 'complete_type';
    return 'none';
  }
  if (key === 'Enter') return hasTarget ? 'select_target' : 'consume';
  if (key === 'Tab' && !shiftKey && hasTarget) return 'select_target';
  return 'none';
}

export function resolveTargetMentionQuery(value: string, cursor: number): TargetMentionQuery | null {
  const boundedCursor = Math.max(0, Math.min(cursor, value.length));
  const beforeCursor = value.slice(0, boundedCursor);
  const targetMatch = beforeCursor.match(/(?:^|\s)(@target(?:\[([^\]\r\n]*))?)$/i);
  if (targetMatch?.index !== undefined) {
    const mention = targetMatch[1];
    return {
      stage: 'target',
      start: targetMatch.index + targetMatch[0].lastIndexOf(mention),
      end: boundedCursor,
      query: targetMatch[2] || ''
    };
  }
  const typeMatch = beforeCursor.match(/(?:^|\s)(@([a-z]*))$/i);
  if (!typeMatch || typeMatch.index === undefined || !'target'.startsWith(typeMatch[2].toLowerCase())) return null;
  const mention = typeMatch[1];
  return {
    stage: 'type',
    start: typeMatch.index + typeMatch[0].lastIndexOf(mention),
    end: boundedCursor,
    query: typeMatch[2]
  };
}

export function completeTargetMentionType(
  value: string,
  mentionQuery: TargetMentionTypeQuery
): TargetMentionInsertion {
  const before = value.slice(0, mentionQuery.start);
  const after = value.slice(mentionQuery.end);
  const completion = '@target[';
  return {
    value: `${before}${completion}${after}`,
    cursor: before.length + completion.length
  };
}

export function insertTargetMention(
  value: string,
  mentionQuery: TargetMentionTargetQuery,
  targetName: string
): TargetMentionInsertion {
  const escapedName = targetName.replaceAll('\\', '\\\\').replaceAll(']', '\\]');
  const mention = `@target[${escapedName}]`;
  const before = value.slice(0, mentionQuery.start);
  const after = value.slice(mentionQuery.end);
  const separator = !after || !/^[\s.,!?;:)\]}]/.test(after) ? ' ' : '';
  return {
    value: `${before}${mention}${separator}${after}`,
    cursor: before.length + mention.length + separator.length
  };
}
