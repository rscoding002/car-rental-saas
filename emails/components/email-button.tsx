/**
 * Email Button Component
 *
 * A styled button for email templates that works across email clients.
 * Supports primary, secondary, and outline variants with custom colors.
 */

import { Button } from '@react-email/components';
import * as React from 'react';

export interface EmailButtonProps {
  /** Button text */
  children: React.ReactNode;
  /** Link URL */
  href: string;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline';
  /** Custom background color (hex) */
  color?: string;
  /** Full width button */
  fullWidth?: boolean;
  /** Button alignment */
  align?: 'left' | 'center' | 'right';
}

const DEFAULT_COLORS = {
  primary: '#3B82F6',
  secondary: '#1E40AF',
};

export function EmailButton({
  children,
  href,
  variant = 'primary',
  color,
  fullWidth = false,
  align = 'left',
}: EmailButtonProps) {
  const backgroundColor =
    variant === 'outline'
      ? 'transparent'
      : color || (variant === 'secondary' ? DEFAULT_COLORS.secondary : DEFAULT_COLORS.primary);

  const textColor =
    variant === 'outline' ? color || DEFAULT_COLORS.primary : '#ffffff';

  const borderColor = color || DEFAULT_COLORS.primary;

  const style: React.CSSProperties = {
    backgroundColor,
    color: textColor,
    padding: '12px 24px',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '14px',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: fullWidth ? 'block' : 'inline-block',
    border: variant === 'outline' ? `2px solid ${borderColor}` : 'none',
    boxSizing: 'border-box' as const,
  };

  const containerStyle: React.CSSProperties = {
    textAlign: align,
    margin: '16px 0',
  };

  return (
    <div style={containerStyle}>
      <Button href={href} style={style}>
        {children}
      </Button>
    </div>
  );
}

export default EmailButton;
