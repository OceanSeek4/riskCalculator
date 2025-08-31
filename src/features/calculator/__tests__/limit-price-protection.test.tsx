import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntrySection } from '../sections/EntrySection';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('Limit Price Protection', () => {
  let mockProps: any;

  beforeEach(() => {
    mockProps = {
      formData: {
        orderType: 'LIMIT' as const,
        entryPrice: '50000',
        limitPrice: '49500',
        contractMode: 'USDT_PERP' as const
      },
      onInputChange: vi.fn(),
      formErrors: {},
      bindModeForEntry: 'manual' as const,
      lastManualAt: Date.now(),
      onSetBindMode: vi.fn(),
      onSetLastManualAt: vi.fn()
    };
  });

  it('should use limitPrice for LIMIT orders', () => {
    render(<EntrySection {...mockProps} />);
    
    // Find the price input field
    const priceInput = screen.getByDisplayValue('49500');
    expect(priceInput).toBeInTheDocument();
  });

  it('should set manual protection when user types in limit price', () => {
    render(<EntrySection {...mockProps} />);
    
    const priceInput = screen.getByDisplayValue('49500');
    fireEvent.change(priceInput, { target: { value: '49800' } });
    
    // Should call onInputChange with limitPrice field
    expect(mockProps.onInputChange).toHaveBeenCalledWith('limitPrice', '49800');
    
    // Should set manual binding mode
    expect(mockProps.onSetBindMode).toHaveBeenCalledWith('manual');
    
    // Should update manual timestamp
    expect(mockProps.onSetLastManualAt).toHaveBeenCalled();
  });

  it('should use entryPrice for MARKET orders', () => {
    const marketProps = {
      ...mockProps,
      formData: {
        ...mockProps.formData,
        orderType: 'MARKET' as const
      }
    };

    render(<EntrySection {...marketProps} />);
    
    // Should display entryPrice value
    const priceInput = screen.getByDisplayValue('50000');
    expect(priceInput).toBeInTheDocument();
  });

  it('should render correctly with limit price protection props', () => {
    render(<EntrySection {...mockProps} />);
    
    // Verify the component renders with new props
    expect(screen.getByText('limitPrice')).toBeInTheDocument();
    expect(screen.getByDisplayValue('49500')).toBeInTheDocument();
  });
});