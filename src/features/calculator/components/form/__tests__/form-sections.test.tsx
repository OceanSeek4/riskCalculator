import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EntrySection } from '../../../sections/EntrySection';
import { TakeProfitSection } from '../TakeProfitSection';
import { LeverageSection } from '../LeverageSection';
import { ActionButtonsSection } from '../ActionButtonsSection';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('Form Sections', () => {
  const mockProps = {
    formData: {
      orderType: 'MARKET',
      entryPrice: '50000',
      contractMode: 'USDT_PERP'
    },
    onInputChange: vi.fn(),
    formErrors: {}
  };

  it('EntrySection renders without errors', () => {
    render(<EntrySection {...mockProps} />);
    expect(screen.getByText('entrySettings')).toBeInTheDocument();
  });

  it('TakeProfitSection renders without errors', () => {
    render(<TakeProfitSection {...mockProps} />);
    expect(screen.getByText('takeProfitSettings')).toBeInTheDocument();
  });

  it('LeverageSection renders conditionally for contracts', () => {
    render(<LeverageSection {...mockProps} />);
    expect(screen.getByText('leverage')).toBeInTheDocument();
  });

  it('LeverageSection does not render for SPOT', () => {
    const spotProps = {
      ...mockProps,
      formData: { ...mockProps.formData, contractMode: 'SPOT' }
    };
    const { container } = render(<LeverageSection {...spotProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('ActionButtonsSection renders calculate button', () => {
    render(<ActionButtonsSection onCalculate={vi.fn()} />);
    expect(screen.getByText('calculatePosition')).toBeInTheDocument();
  });
});