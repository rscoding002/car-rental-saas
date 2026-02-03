/**
 * Email Text Component
 *
 * Styled text paragraph for email templates with various styles.
 */

import { Text } from '@react-email/components';
import * as React from 'react';

export interface EmailTextProps {
  /** Text content */
  children: React.ReactNode;
  /** Text style variant */
  variant?: 'body' | 'lead' | 'small' | 'muted';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom text color (hex) */
  color?: string;
  /** Additional margin bottom */
  marginBottom?: number;
}

const variantStyles = {
  body: {
    fontSize: '14px',
    lineHeight: '24px',
    color: '#374151',
  },
  lead: {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#1e293b',
  },
  small: {
    fontSize: '12px',
    lineHeight: '20px',
    color: '#64748b',
  },
  muted: {
    fontSize: '14px',
    lineHeight: '24px',
    color: '#94a3b8',
  },
};

export function EmailText({
  children,
  variant = 'body',
  align = 'left',
  color,
  marginBottom = 16,
}: EmailTextProps) {
  const baseStyle = variantStyles[variant];

  const style: React.CSSProperties = {
    ...baseStyle,
    textAlign: align,
    margin: `0 0 ${marginBottom}px`,
    ...(color ? { color } : {}),
  };

  return <Text style={style}>{children}</Text>;
}

export default EmailText;
