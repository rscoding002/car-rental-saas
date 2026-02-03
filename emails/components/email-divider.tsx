/**
 * Email Divider Component
 *
 * A styled horizontal rule for separating content sections.
 */

import { Hr } from '@react-email/components';
import * as React from 'react';

export interface EmailDividerProps {
  /** Margin size */
  margin?: 'sm' | 'md' | 'lg';
  /** Line color (hex) */
  color?: string;
}

const marginSizes = {
  sm: '12px 0',
  md: '24px 0',
  lg: '32px 0',
};

export function EmailDivider({ margin = 'md', color = '#e2e8f0' }: EmailDividerProps) {
  const style: React.CSSProperties = {
    borderTop: `1px solid ${color}`,
    margin: marginSizes[margin],
    borderBottom: 'none',
    borderLeft: 'none',
    borderRight: 'none',
  };

  return <Hr style={style} />;
}

export default EmailDivider;
