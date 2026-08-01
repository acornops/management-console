export interface TargetMentionQuery {
  start: number;
  end: number;
  query: string;
}

export interface TargetMentionInsertion {
  cursor: number;
  value: string;
}

export function resolveTargetMentionQuery(value: string, cursor: number): TargetMentionQuery | null {
  const boundedCursor = Math.max(0, Math.min(cursor, value.length));
  const beforeCursor = value.slice(0, boundedCursor);
  const match = beforeCursor.match(/(?:^|\s)(@target(?:\[([^\]\r\n]*))?)$/i);
  if (!match || match.index === undefined) return null;
  const mention = match[1];
  return {
    start: match.index + match[0].lastIndexOf(mention),
    end: boundedCursor,
    query: match[2] || ''
  };
}

export function insertTargetMention(
  value: string,
  mentionQuery: TargetMentionQuery,
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
