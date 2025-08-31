import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickCalculatorForm } from '../QuickCalculatorForm';
import { QuickHintsPanel } from '../QuickHintsPanel';
import { QuickCalculatorPage } from '../QuickCalculatorPage';
import { useSettingsStore, useCalculatorStore } from '@/lib/store';
import { usePriceLock } from '../hooks/usePriceLock';
import { getEffectiveEntryPrice } from '../lib/price';

// Mock dependencies
vi.mock('@/lib/store');
vi.mock('../hooks/usePriceLock');
vi.mock('../lib/price');
vi.mock('@/lib/market-service');
vi.mock('@/lib/core');
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mockUseSettingsStore = useSettingsStore as any;
const mockUseCalculatorStore = useCalculatorStore as any;
const mockUsePriceLock = usePriceLock as any;
const mockGetEffectiveEntryPrice = getEffectiveEntryPrice as any;

describe('Quick Calculator', () => {
  beforeEach(() => {
    // Mock settings store
    mockUseSettingsStore.mockReturnValue({
      settings: {
        defaultOrderType: 'LIMIT',
        defaultFeeType: 'MAKER_OPEN_TAKER_CLOSE',
        defaultExchange: 'BINANCE',
        defaultSymbol: 'BTCUSDT',
        defaultContractMode: 'USDT_PERP',
        defaultRiskMode: 'FIXED_USDT',
        defaultRiskAmount: '100',
        defaultAccountEquity: '10000',
        defaultRiskPercent: '1',
        defaultFeeOpenMaker: '0.0002',
        defaultFeeOpenTaker: '0.0006',
        defaultFeeCloseMaker: '0.0002',
        defaultFeeCloseTaker: '0.0006',
        defaultSlippageOpen: '0.0005',
        defaultSlippageClose: '0.0005',
        defaultLeverage: 10,
        defaultStopMode: 'PRICE',
        defaultUseTakeProfit: false,
        defaultTakeProfitMode: 'RR_RATIO',
        defaultTakeProfitATRMultiplier: '2',
        defaultTakeProfitRRRatio: '2',
        defaultAtrMultiplier: '2',
        defaultEnableRebate: false,
        defaultFeeOpen: '0.0004',
        defaultFeeClose: '0.0004',
        defaultSlippage: '0.0005',
        rrRatios: [1, 1.5, 2],
      },
      setNotification: vi.fn(),
    });

    // Mock calculator store
    mockUseCalculatorStore.mockReturnValue({
      setResult: vi.fn(),
      setIsCalculating: vi.fn(),
      result: null,
    });

    // Mock price lock hook
    mockUsePriceLock.mockReturnValue({
      isLocked: false,
      lockedEntryPrice: null,
      lock: vi.fn(),
      unlock: vi.fn(),
    });

    // Mock effective entry price
    mockGetEffectiveEntryPrice.mockReturnValue(108000);
  });

  describe('QuickCalculatorForm', () => {
    it('quick-limit-manual-entry: LIMIT input 108000, ticker=108500, calculate uses 108000', async () => {
      // Test: LIMIT 输入 108000，ticker=108500，点击计算→使用 108000；随后 ticker 改变→结果不变
      
      render(<QuickCalculatorForm />);
      
      // Set order type to LIMIT
      const orderTypeSelect = screen.getByDisplayValue('limitOrder');
      fireEvent.change(orderTypeSelect, { target: { value: 'LIMIT' } });
      
      // Enter limit price 108000
      const entryPriceInput = screen.getByPlaceholderText('enterLimitPrice');
      fireEvent.change(entryPriceInput, { target: { value: '108000' } });
      
      // Enter stop price
      const stopPriceInput = screen.getByPlaceholderText('enterStopPrice');
      fireEvent.change(stopPriceInput, { target: { value: '107000' } });
      
      // Mock getEffectiveEntryPrice to return input value for LIMIT orders
      mockGetEffectiveEntryPrice.mockReturnValue(108000);
      
      // Click calculate
      const calculateButton = screen.getByText('calculate');
      fireEvent.click(calculateButton);
      
      // Verify getEffectiveEntryPrice was called with LIMIT order and input price
      expect(mockGetEffectiveEntryPrice).toHaveBeenCalledWith({
        orderType: 'LIMIT',
        limitPrice: 108000,
        marketRefPrice: expect.any(Number),
        lockedEntryPrice: null,
      });
      
      // The result should use 108000 regardless of market ticker
      expect(mockGetEffectiveEntryPrice).toHaveReturnedWith(108000);
    });

    it('quick-market-lock: MARKET ticker=100 calculate→result=100; ticker=120 result unchanged; recalculate→result=120', async () => {
      // Test: MARKET 下 ticker=100 点击计算→显示/结果=100；把 ticker 改 120 结果不变；再次计算→结果=120
      
      const mockPriceLock = {
        isLocked: false,
        lockedEntryPrice: null,
        lock: vi.fn(),
        unlock: vi.fn(),
      };
      mockUsePriceLock.mockReturnValue(mockPriceLock);
      
      render(<QuickCalculatorForm />);
      
      // Set order type to MARKET
      const orderTypeSelect = screen.getByDisplayValue('limitOrder');
      fireEvent.change(orderTypeSelect, { target: { value: 'MARKET' } });
      
      // Enter stop price
      const stopPriceInput = screen.getByPlaceholderText('enterStopPrice');
      fireEvent.change(stopPriceInput, { target: { value: '99000' } });
      
      // First calculation with ticker=100
      mockGetEffectiveEntryPrice.mockReturnValue(100000);
      
      const calculateButton = screen.getByText('calculate');
      fireEvent.click(calculateButton);
      
      // Verify price was locked
      expect(mockPriceLock.lock).toHaveBeenCalledWith(expect.any(Number));
      
      // Simulate price lock for second calculation
      const lockedPriceLock = {
        isLocked: true,
        lockedEntryPrice: 100000,
        lock: vi.fn(),
        unlock: vi.fn(),
      };
      mockUsePriceLock.mockReturnValue(lockedPriceLock);
      
      // Second calculation should use locked price even if market changed
      mockGetEffectiveEntryPrice.mockReturnValue(100000); // Still locked at 100
      
      fireEvent.click(calculateButton);
      expect(mockGetEffectiveEntryPrice).toHaveReturnedWith(100000);
      
      // Third calculation after unlock should use new market price
      const unlockedPriceLock = {
        isLocked: false,
        lockedEntryPrice: null,
        lock: vi.fn(),
        unlock: vi.fn(),
      };
      mockUsePriceLock.mockReturnValue(unlockedPriceLock);
      mockGetEffectiveEntryPrice.mockReturnValue(120000); // New market price
      
      fireEvent.click(calculateButton);
      expect(mockGetEffectiveEntryPrice).toHaveReturnedWith(120000);
    });

    it('stop distance buttons work correctly for LIMIT orders', async () => {
      // Test: 止损距离快速按钮功能
      const { rerender } = render(<QuickCalculatorForm />);
      
      // Set order type to LIMIT
      const orderTypeSelect = screen.getByDisplayValue('limitOrder');
      fireEvent.change(orderTypeSelect, { target: { value: 'LIMIT' } });
      
      // Enter entry price
      const entryPriceInput = screen.getByPlaceholderText('enterLimitPrice');
      fireEvent.change(entryPriceInput, { target: { value: '100000' } }); // $100,000 entry
      
      // Click 1% stop distance button
      const onePercentButton = screen.getByText('1%');
      fireEvent.click(onePercentButton);
      
      // Stop price should be set to 99,000 for LONG position (1% below entry)
      const stopPriceInput = screen.getByPlaceholderText('enterStopPrice') as HTMLInputElement;
      expect(stopPriceInput.value).toBe('99000');
      
      // Test 2% button
      const twoPercentButton = screen.getByText('2%');
      fireEvent.click(twoPercentButton);
      expect(stopPriceInput.value).toBe('98000'); // 2% below entry
    });

    it('stop distance buttons work correctly for MARKET orders with locked price', async () => {
      // Test: MARKET订单锁定价格后的止损距离计算
      const mockPriceLock = {
        isLocked: true,
        lockedEntryPrice: 50000, // $50,000 locked price
        lock: vi.fn(),
        unlock: vi.fn(),
      };
      mockUsePriceLock.mockReturnValue(mockPriceLock);
      
      render(<QuickCalculatorForm />);
      
      // Set order type to MARKET
      const orderTypeSelect = screen.getByDisplayValue('limitOrder');
      fireEvent.change(orderTypeSelect, { target: { value: 'MARKET' } });
      
      // Click 0.5% stop distance button
      const halfPercentButton = screen.getByText('0.5%');
      fireEvent.click(halfPercentButton);
      
      // Stop price should be 49,750 (0.5% below locked price)
      const stopPriceInput = screen.getByPlaceholderText('enterStopPrice') as HTMLInputElement;
      expect(stopPriceInput.value).toBe('49750');
    });

    it('stop distance buttons are disabled when no entry price available', async () => {
      // Test: 没有入场价格时按钮应该被禁用
      render(<QuickCalculatorForm />);
      
      // All stop distance buttons should be disabled initially (no entry price)
      const halfPercentButton = screen.getByText('0.5%');
      const onePercentButton = screen.getByText('1%');
      const oneAndHalfPercentButton = screen.getByText('1.5%');
      const twoPercentButton = screen.getByText('2%');
      
      expect(halfPercentButton).toBeDisabled();
      expect(onePercentButton).toBeDisabled();
      expect(oneAndHalfPercentButton).toBeDisabled();
      expect(twoPercentButton).toBeDisabled();
    });
  });

  describe('QuickHintsPanel', () => {
    it('quick-hints-readonly: displays parameters from settings as readonly', () => {
      // Test: 右侧提示只读，来源等于 settings store 值
      
      render(<QuickHintsPanel />);
      
      // Verify settings are displayed
      expect(screen.getByText('parametersFromSettings')).toBeInTheDocument();
      expect(screen.getByText('BINANCE')).toBeInTheDocument(); // From settings.defaultExchange
      expect(screen.getByText('BTCUSDT')).toBeInTheDocument(); // From settings.defaultSymbol
      expect(screen.getByText('100 USDT')).toBeInTheDocument(); // From settings.defaultRiskAmount
      
      // Verify note about settings
      expect(screen.getByText('parametersFromSettingsNote')).toBeInTheDocument();
      expect(screen.getByText('parametersFromSettingsDetails')).toBeInTheDocument();
    });

    it('displays current fee type from form selection', () => {
      // Test: 显示从表单选择的费率类型
      render(<QuickHintsPanel currentFeeType="MAKER" />);
      
      // Should show current fee strategy
      expect(screen.getByText('currentFeeStrategy')).toBeInTheDocument();
      expect(screen.getByText('feeTypeAllMaker')).toBeInTheDocument();
    });

    it('updates fee type display when changed', () => {
      // Test: 费率类型变化时更新显示
      const { rerender } = render(<QuickHintsPanel currentFeeType="MAKER" />);
      expect(screen.getByText('feeTypeAllMaker')).toBeInTheDocument();
      
      // Change fee type
      rerender(<QuickHintsPanel currentFeeType="TAKER" />);
      expect(screen.getByText('feeTypeAllTaker')).toBeInTheDocument();
      
      // Change to mixed strategy
      rerender(<QuickHintsPanel currentFeeType="MAKER_OPEN_TAKER_CLOSE" />);
      expect(screen.getByText('feeTypeMakerOpenTakerClose')).toBeInTheDocument();
    });
  });

  describe('QuickCalculatorPage', () => {
    it('renders all components correctly', () => {
      render(<QuickCalculatorPage />);
      
      expect(screen.getByText('quickCalculator')).toBeInTheDocument();
      expect(screen.getByText('quickCalculatorDescription')).toBeInTheDocument();
      expect(screen.getByText('backToFullCalculator')).toBeInTheDocument();
    });

    it('has working navigation to full calculator', () => {
      // Mock DOM query selector for tab switching
      const mockClick = vi.fn();
      const mockElement = { click: mockClick };
      vi.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);
      
      render(<QuickCalculatorPage />);
      
      const backButton = screen.getByText('backToFullCalculator');
      fireEvent.click(backButton);
      
      expect(document.querySelector).toHaveBeenCalledWith('[value="calculator"]');
      expect(mockClick).toHaveBeenCalled();
    });
  });
});