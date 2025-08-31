# Form Components Architecture

This directory contains the modularized form sections extracted from the main CalculatorForm.tsx for better maintainability and code organization.

## Components

### Core Form Sections
- **`TakeProfitSection.tsx`** - Take profit configuration with support for price, ATR, risk:reward ratio, and pips modes
- **`LeverageSection.tsx`** - Leverage input for perpetual contracts (conditionally rendered for non-SPOT)
- **`ActionButtonsSection.tsx`** - Calculate button and error display with loading states

### Legacy Sections (from sections/ directory)
- **`EntrySection`** - Entry price input with real-time price display and order type selection
- **`MarketSection`** - Exchange and symbol selection with contract mode switching
- **`RiskSection`** - Risk management inputs (fixed USDT or account percentage)  
- **`StopSection`** - Stop loss settings with price-based and ATR-based options

### Infrastructure
- **`CalculatorFormProvider.tsx`** - Context provider for future shared form state (currently minimal)
- **`index.ts`** - Barrel export for clean imports

## Design Principles

1. **Zero Behavior Change**: All extracted components maintain exact functionality from the original monolithic form
2. **Minimal Props Drilling**: Components receive only necessary props via explicit interfaces
3. **Type Safety**: Full TypeScript support with strict prop validation
4. **Conditional Rendering**: Components handle their own visibility logic (e.g., LeverageSection for contracts only)
5. **i18n Support**: All components use react-i18next for internationalization

## State Management

Currently uses direct Zustand store access in most components. The CalculatorFormProvider exists as infrastructure for future centralized form state if needed.

## Testing

Smoke tests in `__tests__/form-sections.test.tsx` verify all components render without errors and handle conditional logic correctly.

## Usage

```typescript
import { 
  EntrySection, 
  TakeProfitSection, 
  LeverageSection, 
  ActionButtonsSection,
  MarketSection,
  RiskSection,
  StopSection
} from '@/features/calculator/components/form';
```

## Migration Notes

This refactoring reduced CalculatorForm.tsx from 2629 lines to 2086 lines (21% reduction) while maintaining:
- All existing functionality
- Complete styling preservation  
- Full i18n key compatibility
- Exact validation behavior
- Professional fee control system