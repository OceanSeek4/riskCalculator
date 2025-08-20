# 固定风险仓位计算器 (Position Risk Calculator)

A professional Tauri + React + TypeScript application for calculating cryptocurrency trading position sizes based on fixed risk management principles. Supports both Chinese and English interfaces.

## 📈 项目进展 (Project Progress)

### ✅ 已完成功能 (Completed Features)
1. **多交易所支持** - 支持 Binance、Bybit、Bitget、OKX 四大交易所
2. **双风险模式** - 固定USDT金额 & 账户权益百分比风险计算
3. **订单类型** - 市价单/限价单，智能滑点处理
4. **ATR止损** - 自动ATR计算和倍数止损
5. **完整国际化** - 中英文双语界面，动态切换
6. **专业结果展示** - 多卡片布局，风险等级颜色编码
7. **智能风险警告** - 15+种风险提示，包括清算、杠杆、保证金使用率分析
8. **数据持久化** - 设置和预设自动保存
9. **离线支持** - 静态数据回退，网络故障时仍可使用
10. **主题支持** - 明暗主题自动切换

### 🎯 最新更新 (Latest Updates - 2025.01)
- ✅ 新增 Bitget 交易所完整支持
- ✅ 新增 OKX 交易所完整支持  
- ✅ 优化交易所适配器架构
- ✅ 增强静态数据回退机制
- ✅ 完善多语言交易所名称翻译
- ✅ 统一API接口规范

### 🔄 下一步计划 (Next Milestones)
#### Phase 1 - 核心功能完善 (Q1 2025)
- [ ] 分层保证金率计算系统
- [ ] 反向合约 (Coin-Margined) 全面支持
- [ ] 高级杠杆风险分析
- [ ] 批量计算功能

#### Phase 2 - 用户体验优化 (Q2 2025)  
- [ ] 实时价格推送集成
- [ ] 图表可视化分析
- [ ] 历史计算记录
- [ ] 自定义风险模板

#### Phase 3 - 高级功能 (Q3 2025)
- [ ] 组合风险分析
- [ ] API密钥集成（实时余额）
- [ ] 风险报告导出
- [ ] 移动端适配

## Project Structure

```
src/
├── components/ui/          # Reusable UI components (Button, Card, Input, etc.)
├── features/
│   ├── calculator/         # Main calculator functionality
│   │   ├── CalculatorForm.tsx  # Main form with market settings, stops, risk inputs
│   │   └── ResultCard.tsx      # Display calculated position details
│   ├── presets/           # Preset management
│   │   └── PresetManager.tsx   # Save/load trading configurations
│   └── settings/          # Application settings
│       └── SettingsForm.tsx    # Global preferences and defaults
├── lib/
│   ├── adapters/          # Exchange API adapters (Binance, Bybit)
│   ├── core/             # Core calculation logic (formulas, ATR, math)
│   ├── i18n/             # Internationalization (future)
│   ├── store.ts          # Zustand state management
│   ├── theme.tsx         # Theme provider (dark/light/system)
│   ├── utils.ts          # Utility functions
│   └── validation.ts     # Form validation and schemas
└── App.tsx               # Main app with tabbed navigation
```

## Key Features

### Calculator
- **Market Selection**: Exchange (Binance/Bybit/Bitget/OKX), Symbol, Contract Mode (Spot/USDT Perp/Inverse)
- **Order Types**: Market orders or Limit orders with intelligent slippage handling
- **Position Settings**: Entry price, side (Long/Short)
- **Stop Loss**: Price-based or ATR-based stops with automatic calculation
- **Risk Management**: 
  - Fixed USDT amount mode
  - Account percentage mode (r% × Account Equity = Risk Amount)
- **Advanced Options**: Trading fees, slippage (when enabled in settings)
- **Professional Results**: Multi-card layout with risk-coded visualization
  - Main position metrics (quantity, notional value)
  - Stop loss and liquidation prices with risk indicators
  - Profit targets with R:R ratios
  - Intelligent risk warnings and margin analysis

### Presets
- Save current calculator configurations as named presets
- Quick-load presets from dropdown in calculator
- Manage saved presets (view, load, delete)
- Presets exclude entry price and risk amount (strategy-specific only)

### Settings
- **Market Defaults**: Default exchange, symbol, contract mode
- **Fee Defaults**: Open/close fees, slippage
- **ATR Defaults**: Period, timeframe, multiplier
- **Risk/Reward Ratios**: Configurable profit targets
- **UI Preferences**: Theme (light/dark/system), language
- **Advanced Options**: Auto-fetch ATR, show advanced calculator options

## State Management

Uses Zustand with persistence middleware:
- `useCalculatorStore`: Form data, results, loading states, errors
- `useSettingsStore`: User preferences (persisted to localStorage)
- `usePresetStore`: Saved configurations (persisted to localStorage)

## Build Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run test` - Run tests (Vitest)
- `npm run tauri` - Tauri desktop app commands

## Exchange Integration

- **Binance**: Market metadata, OHLCV data, ATR calculation
- **Bybit**: Market metadata, OHLCV data, ATR calculation  
- **Bitget**: Market metadata, OHLCV data, ATR calculation
- **OKX**: Market metadata, OHLCV data, ATR calculation
- Adapter pattern with fallback for offline usage
- Static market data included for development
- Unified API interface across all exchanges

## Calculation Logic

- **Position Sizing**: Based on fixed risk amount and stop distance
- **ATR Stops**: Automatic stop placement using Average True Range
- **Fee Calculation**: Optional trading cost inclusion
- **Leverage**: Auto-calculation for perpetual contracts
- **Risk/Reward**: Multiple profit targets with configurable ratios

## Theme Support

- CSS custom properties for consistent theming
- System preference detection
- Automatic switching between light/dark modes
- Theme persistence across sessions

## Risk Warning System

### 智能风险提示 (Intelligent Risk Warnings)

The application includes comprehensive risk analysis with color-coded warnings:

#### 🚨 Critical Risks
- **Stop beyond liquidation**: When stop price is beyond liquidation price
- **High account risk**: Risking >5% of account equity on single trade

#### ⚡ High Risks  
- **Liquidation proximity**: Liquidation within 1% of stop price
- **Extreme leverage**: >50x leverage usage
- **High margin usage**: >80% of account equity as margin

#### 📊 Moderate Risks
- **Leverage warnings**: 20-50x leverage monitoring
- **Stop distance**: Very tight (<0.5%) or very wide (>10%) stops
- **Margin utilization**: 50-80% account equity usage

#### ❌ Exchange Rule Violations
- Minimum quantity/notional requirements not met
- Price/quantity precision violations

## Mathematical Formulas

### Core Position Sizing Formula

按照你的详细计划中的公式实现：

```
Risk per Unit = |P_entry - P_stop| + Fees + Slippage (if included)
Position Size = Risk Amount (USDT) / Risk per Unit
```

### Account Percentage Risk
```
Risk Amount = Account Equity × Risk Percentage / 100
```

### Liquidation Price (Simplified)
```
For LONG: P_liq = P_entry × (1 - (1/L - mmr))
For SHORT: P_liq = P_entry × (1 + (1/L - mmr))
```

### Profit Targets
```
For LONG: TP = P_entry + RR × (P_entry - P_stop)  
For SHORT: TP = P_entry - RR × (P_stop - P_entry)
```

## Development Notes

- TypeScript with strict mode enabled
- Tailwind CSS for styling with custom design system  
- Lucide React for icons with professional trading UI
- Form validation using Zod schemas with enhanced error handling
- Decimal.js for precise financial calculations
- React-i18next for internationalization support
- All components follow professional trading application conventions
- Comprehensive risk analysis system with multi-level warnings

## Language Support

### 中文支持
应用程序完全支持中文界面，包括：
- 所有界面文字的中文翻译
- 风险警告的中文提示
- 专业交易术语的准确翻译
- 动态语言切换功能

### English Support  
Full English interface with professional trading terminology and comprehensive risk analysis in English.