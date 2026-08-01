import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AnimatedNumber from './AnimatedNumber';

describe('AnimatedNumber', () => {
  it('renders the formatted value on mount', () => {
    render(<AnimatedNumber value={1234} />);
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('appends the suffix when provided', () => {
    render(<AnimatedNumber value={50} suffix="%" />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('formats decimals when requested', () => {
    render(<AnimatedNumber value={12.5} decimals={1} />);
    expect(screen.getByText('12.5')).toBeInTheDocument();
  });

  it('defaults to 0 when no value is given', () => {
    render(<AnimatedNumber />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
