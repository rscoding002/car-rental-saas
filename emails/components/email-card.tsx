/**
 * Email Card Component
 *
 * A styled container for grouping related content in emails.
 * Useful for booking details, summaries, and highlighted sections.
 */

import { Section, Row, Column } from '@react-email/components';
import * as React from 'react';

export interface EmailCardProps {
  /** Card content */
  children: React.ReactNode;
  /** Card variant */
  variant?: 'default' | 'highlighted' | 'bordered';
  /** Background color (hex) */
  backgroundColor?: string;
  /** Border color for bordered variant (hex) */
  borderColor?: string;
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg';
}

const paddingSizes = {
  sm: '12px',
  md: '20px',
  lg: '28px',
};

export function EmailCard({
  children,
  variant = 'default',
  backgroundColor,
  borderColor = '#e2e8f0',
  padding = 'md',
}: EmailCardProps) {
  const paddingValue = paddingSizes[padding];

  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'highlighted':
        return '#f0f9ff';
      case 'bordered':
        return '#ffffff';
      default:
        return '#f8fafc';
    }
  };

  const style: React.CSSProperties = {
    backgroundColor: getBackgroundColor(),
    borderRadius: '8px',
    padding: paddingValue,
    margin: '16px 0',
    ...(variant === 'bordered'
      ? { border: `1px solid ${borderColor}` }
      : {}),
  };

  return <Section style={style}>{children}</Section>;
}

// ============================================================================
// Detail Row Component (for key-value pairs)
// ============================================================================

export interface EmailDetailRowProps {
  /** Label text */
  label: string;
  /** Value text */
  value: React.ReactNode;
  /** Label color */
  labelColor?: string;
  /** Value color */
  valueColor?: string;
}

export function EmailDetailRow({
  label,
  value,
  labelColor = '#64748b',
  valueColor = '#1e293b',
}: EmailDetailRowProps) {
  const labelStyle: React.CSSProperties = {
    fontSize: '13px',
    color: labelColor,
    fontWeight: 500,
    padding: '8px 0',
    verticalAlign: 'top',
    width: '40%',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '14px',
    color: valueColor,
    fontWeight: 600,
    padding: '8px 0',
    verticalAlign: 'top',
    textAlign: 'right',
    width: '60%',
  };

  return (
    <Row>
      <Column style={labelStyle}>{label}</Column>
      <Column style={valueStyle}>{value}</Column>
    </Row>
  );
}

export default EmailCard;
