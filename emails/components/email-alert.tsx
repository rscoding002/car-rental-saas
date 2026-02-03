/**
 * Email Alert Component
 *
 * A styled alert box for important notices, warnings, or success messages.
 */

import { Section, Text } from '@react-email/components';
import * as React from 'react';

export interface EmailAlertProps {
  /** Alert content */
  children: React.ReactNode;
  /** Alert variant */
  variant?: 'info' | 'success' | 'warning' | 'error';
  /** Optional title */
  title?: string;
}

const variantStyles = {
  info: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    textColor: '#1e40af',
    iconColor: '#3b82f6',
  },
  success: {
    backgroundColor: '#f0fdf4',
    borderColor: '#22c55e',
    textColor: '#166534',
    iconColor: '#22c55e',
  },
  warning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
    textColor: '#92400e',
    iconColor: '#f59e0b',
  },
  error: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
    textColor: '#991b1b',
    iconColor: '#ef4444',
  },
};

export function EmailAlert({ children, variant = 'info', title }: EmailAlertProps) {
  const styles = variantStyles[variant];

  const containerStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor,
    borderLeft: `4px solid ${styles.borderColor}`,
    borderRadius: '4px',
    padding: '16px 20px',
    margin: '16px 0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: styles.textColor,
    margin: '0 0 8px',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '14px',
    lineHeight: '22px',
    color: styles.textColor,
    margin: 0,
  };

  return (
    <Section style={containerStyle}>
      {title && <Text style={titleStyle}>{title}</Text>}
      <Text style={textStyle}>{children}</Text>
    </Section>
  );
}

export default EmailAlert;
