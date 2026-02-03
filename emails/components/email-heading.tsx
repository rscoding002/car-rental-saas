/**
 * Email Heading Components
 *
 * Consistent heading styles for email templates.
 * Supports H1, H2, H3 levels with optional color customization.
 */

import { Heading } from '@react-email/components';
import * as React from 'react';

export interface EmailHeadingProps {
  /** Heading text */
  children: React.ReactNode;
  /** Heading level */
  as?: 'h1' | 'h2' | 'h3';
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
  /** Custom text color (hex) */
  color?: string;
}

const headingStyles = {
  h1: {
    fontSize: '24px',
    fontWeight: 700,
    lineHeight: '32px',
    margin: '0 0 16px',
  },
  h2: {
    fontSize: '20px',
    fontWeight: 600,
    lineHeight: '28px',
    margin: '0 0 12px',
  },
  h3: {
    fontSize: '16px',
    fontWeight: 600,
    lineHeight: '24px',
    margin: '0 0 8px',
  },
};

const DEFAULT_COLOR = '#1e293b';

export function EmailHeading({
  children,
  as = 'h1',
  align = 'left',
  color = DEFAULT_COLOR,
}: EmailHeadingProps) {
  const baseStyle = headingStyles[as];

  const style: React.CSSProperties = {
    ...baseStyle,
    color,
    textAlign: align,
  };

  return (
    <Heading as={as} style={style}>
      {children}
    </Heading>
  );
}

export default EmailHeading;
