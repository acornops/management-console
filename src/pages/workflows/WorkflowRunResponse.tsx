import React from 'react';
import ReactMarkdown from 'react-markdown';
import { createMarkdownComponents, markdownRemarkPlugins } from '@/features/conversations/presentation';

const workflowResponseMarkdownComponents = createMarkdownComponents('assistant');

export const WorkflowRunResponse: React.FC<{ content: string; className?: string }> = ({ content, className = '' }) => (
  <div className={`max-w-[75ch] break-words type-body leading-6 text-ui-text [overflow-wrap:anywhere] ${className}`}>
    <ReactMarkdown components={workflowResponseMarkdownComponents} remarkPlugins={markdownRemarkPlugins}>
      {content}
    </ReactMarkdown>
  </div>
);
