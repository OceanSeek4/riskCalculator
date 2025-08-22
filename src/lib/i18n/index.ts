import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
  en: {
    translation: {
      // App Title
      appTitle: 'Position Risk Calculator',
      appSubtitle: 'Calculate position sizes based on fixed risk for cryptocurrency trading',
      
      // Navigation
      calculator: 'Calculator',
      presets: 'Presets',
      settings: 'Settings',
      
      // Calculator Form
      loadPreset: 'Load Preset',
      selectPreset: 'Select a preset...',
      
      // Market Settings
      exchange: 'Exchange',
      symbol: 'Symbol',
      contractMode: 'Mode',
      side: 'Side',
      long: 'Long',
      short: 'Short',
      
      // Exchange Names
      binance: 'Binance',
      bybit: 'Bybit',
      bitget: 'Bitget',
      okx: 'OKX',
      
      // Contract Modes
      spot: 'Spot',
      usdtPerp: 'USDT Perp',
      inverse: 'Inverse',
      
      // Entry Settings
      orderType: 'Order Type',
      marketOrder: 'Market Order',
      limitOrder: 'Limit Order',
      entryPrice: 'Entry Price (Current/Expected)',
      limitPrice: 'Limit Price',
      marketOrderNote: 'For market orders, enter the expected execution price',
      realTimePriceUpdated: 'Price updates automatically from market',
      realTimePrice: 'Live Price',
      
      // Stop Loss
      stopMode: 'Stop Mode',
      priceStop: 'Price Stop',
      atrStop: 'ATR Stop',
      stopPrice: 'Stop Price',
      atrPeriod: 'Period',
      atrTimeframe: 'Timeframe',
      atrMultiplier: 'ATR Multiplier',
      fetchATR: 'Fetch ATR',
      maStop: 'MA Stop',
      emaStop: 'EMA Stop',
      fetchMA: 'Fetch MA',
      stopMAPeriod: 'MA Period',
      stopMATimeframe: 'MA Timeframe',
      maMustBeFetched: 'MA must be fetched first',
      failedToFetchMA: 'Failed to fetch MA',
      maStopExplanation: 'Uses Simple Moving Average as stop loss level',
      emaStopExplanation: 'Uses Exponential Moving Average as stop loss level',
      
      // Take Profit
      takeProfitSettings: 'Take Profit Settings',
      useTakeProfit: 'Enable Take Profit',
      takeProfitMode: 'Take Profit Mode',
      priceTakeProfit: 'Price Target',
      atrTakeProfit: 'ATR Target',
      rrRatioTakeProfit: 'R:R Ratio Target',
      maTakeProfit: 'MA Target',
      emaTakeProfit: 'EMA Target',
      takeProfitPrice: 'Take Profit Price',
      takeProfitATRMultiplier: 'ATR Multiplier',
      takeProfitRRRatio: 'Risk:Reward Ratio',
      takeProfitMAPeriod: 'MA Period',
      takeProfitMATimeframe: 'MA Timeframe',
      expectedTakeProfit: 'Expected Take Profit',
      usesCurrentATRValue: 'Uses current ATR value from stop loss settings',
      rrRatioTakeProfitDescription: 'Set take profit based on risk:reward ratio including fees and slippage',
      movingAverageExplanation: 'Take profit when price reaches the moving average level',
      emaExplanation: 'Take profit when price reaches the exponential moving average level',
      
      // Trailing Stop Settings
      trailingStopSettings: 'Trailing Stop Settings',
      trailingStrategy: 'Strategy',
      trailingTimeframe: 'Timeframe',
      trailingMAType: 'MA Type',
      trailingMAPeriod: 'MA Period',
      trailingATRPeriod: 'ATR Period',
      trailingATRMultiplier: 'ATR Multiplier',
      trailingOnCloseOnly: 'Update only on bar close',
      trailingExplanation: 'Dynamic stop loss that follows price using moving averages',
      testTrailingData: 'Test Trailing Data',
      maCrossExit: 'MA Cross Exit',
      maBandStop: 'MA Band Stop',
      maChandelier: 'MA Chandelier',
      ema: 'EMA',
      sma: 'SMA',
      trailingStopResults: 'Trailing Stop Results',
      currentMA: 'Current MA',
      currentPrice: 'Current Price',
      trailingStopPrice: 'Trailing Stop Price',
      exitTriggerPrice: 'Exit Trigger Price',
      expectedPnL: 'Expected P&L',
      maxLoss: 'Max Loss',
      target: 'Target',
      strategy: 'Strategy',
      timeframe: 'Timeframe',
      maType: 'MA Type',
      loading: 'Loading...',
      
      // Risk Settings
      riskMode: 'Risk Mode',
      fixedUSDTAmount: 'Fixed USDT Amount',
      accountPercentage: 'Account Percentage',
      riskAmount: 'Risk Amount (USDT)',
      accountEquity: 'Account Equity (USDT)',
      riskPercentage: 'Risk Percentage (%)',
      
      // Advanced Options
      advancedOptions: 'Advanced Options',
      includeFees: 'Include trading fees in calculation',
      openFee: 'Open Fee (%)',
      closeFee: 'Close Fee (%)',
      slippage: 'Slippage (%)',
      
      // Leverage
      leverage: 'Leverage (optional)',
      autoSuggest: 'Auto-suggest',
      
      // Actions
      calculatePosition: 'Calculate Position',
      calculating: 'Calculating...',
      copyOrderSummary: 'Copy Order Summary',
      
      // Results
      results: 'Results',
      positionResults: 'Position Results',
      rawQuantity: 'Raw Quantity',
      roundedQuantity: 'Opening Size',
      notionalValue: 'Notional Value',
      initialMargin: 'Initial Margin',
      estLiquidation: 'Est. Liquidation',
      targets: 'Targets (Risk:Reward)',
      breakeven: 'Breakeven',
      warnings: 'Warnings',
      orderSummary: 'Order Summary:',
      enterAndCalculate: 'Enter parameters and calculate to see results',
      
      // Footer
      educationalOnly: '⚠️ For educational purposes only. Not financial advice.',
      verifyCalculations: 'Always verify calculations and comply with exchange rules.',
      
      // Common
      save: 'Save',
      delete: 'Delete',
      load: 'Load',
      reset: 'Reset',
      confirm: 'Confirm',
      
      // Placeholders
      enterAmount: 'Enter amount',
      enterPrice: 'Enter price',
      enterExpectedEntryPrice: 'Enter expected entry price',
      enterLimitPrice: 'Enter limit price',
      enterStopPrice: 'Enter stop price',
      enterRiskAmount: 'Enter risk amount',
      totalEquity: 'Total equity',
      
      // Settings
      settingsTitle: 'Settings',
      defaultMarketSettings: 'Default Market Settings',
      defaultExchange: 'Default Exchange',
      defaultSymbol: 'Default Symbol',
      defaultContractMode: 'Default Contract Mode',
      defaultModeSettings: 'Default Mode Settings',
      defaultStopMode: 'Default Stop Mode',
      defaultRiskMode: 'Default Risk Mode',
      defaultOrderType: 'Default Order Type',
      defaultLeverage: 'Default Leverage',
      defaultRiskSettings: 'Default Risk Settings',
      defaultAccountEquity: 'Default Account Equity',
      defaultRiskPercent: 'Default Risk Percentage',
      defaultRiskAmount: 'Default Risk Amount',
      defaultFeeSettings: 'Default Fee Settings',
      defaultAtrSettings: 'Default ATR Settings',
      rrSettings: 'Risk/Reward Settings',
      rrRatios: 'R/R Ratios (comma separated)',
      rrRatiosHelp: 'Enter target ratios like: 1, 1.5, 2, 3',
      rrRatiosList: 'Risk/Reward Ratios',
      addRatio: 'Add Ratio',
      removeRatio: 'Remove',
      ratioPlaceholder: 'Enter ratio (e.g., 2.0)',
      uiPreferences: 'UI Preferences',
      theme: 'Theme',
      language: 'Language',
      system: 'System',
      light: 'Light',
      dark: 'Dark',
      english: 'English',
      chinese: 'Chinese',
      advancedSettings: 'Advanced Settings',
      autoFetchATR: 'Auto-fetch ATR when symbol changes',
      showAdvancedOptions: 'Show advanced options in calculator',
      defaultIncludeFees: 'Include fees in calculations by default',
      
      // Take Profit Settings
      defaultTakeProfitSettings: 'Default Take Profit Settings',
      defaultUseTakeProfit: 'Enable take profit by default',
      defaultTakeProfitMode: 'Default take profit mode',
      defaultTakeProfitPrice: 'Default take profit price',
      defaultTakeProfitATRMultiplier: 'Default ATR multiplier for take profit',
      defaultTakeProfitRRRatio: 'Default risk/reward ratio',
      takeProfitPricePlaceholder: 'Leave empty for no default',
      resetToDefaults: 'Reset to Defaults',
      resetConfirm: 'Are you sure you want to reset all settings to defaults?',
      settingsSaved: 'Settings saved successfully',
      settingsError: 'Failed to save settings',
      
      // Presets
      presetsTitle: 'Presets Manager',
      saveCurrentPreset: 'Save Current Configuration as Preset',
      savePreset: 'Save Preset',
      enterPresetName: 'Enter preset name...',
      deletePreset: 'Delete',
      deletePresetConfirm: 'Are you sure you want to delete this preset?',
      noPresets: 'No presets saved yet',
      saveFirstPreset: 'Save your first preset to get started',
      enterPresetNameAlert: 'Please enter a preset name',
      
      // Form Labels & Inputs
      marketSettings: 'Market Settings',
      entrySettings: 'Entry Settings', 
      stopLossSettings: 'Stop Loss Settings',
      riskSettings: 'Risk Settings',
      positionSettings: 'Position Settings',
      
      // Validation & Errors
      fieldRequired: 'This field is required',
      mustBePositive: 'Must be a positive number',
      invalidNumber: 'Invalid number',
      fetchingATR: 'Fetching ATR...',
      atrFetchFailed: 'Failed to fetch ATR',
      calculationFailed: 'Calculation failed',
      atrMustBeFetched: 'ATR must be fetched or manually entered',
      failedToFetchATR: 'Failed to fetch ATR data',
      copiedToClipboard: 'Copied to clipboard',
      clickToCopy: 'Click to copy value',
      
      // Market Data
      fetchingPrice: 'Fetching current price...',
      priceUpdated: 'Price updated',
      failedToFetchPrice: 'Failed to fetch current price',
      lockedAtCalculation: 'Locked at calculation time',
      symbolNotSupported: 'Symbol not supported on this exchange',
      getCurrentPrice: 'Get Current Price',
      autoFetchPrice: 'Auto-fetch current price',
      
      // Additional messages
      
      // Buttons & Actions
      fetchATRButton: 'Fetch ATR',
      fetchMetadata: 'Fetch Metadata',
      fetchingMetadata: 'Fetching Meta...',
      metadataLoaded: 'Loaded',
      riskAmountUSDT: 'Risk Amount (USDT)',
      autoSuggestLeverage: 'Auto-suggest',
      rawQuantityPrefix: 'Raw',
      calculate: 'Calculate',
      ok: 'OK',
      
      // Results
      calculationResults: 'Calculation Results',
      positionSize: 'Position Size',
      stopLoss: 'Stop Loss',
      riskReward: 'Risk:Reward Targets',
      tradingFees: 'Trading Fees',
      riskRewardRatio: 'Risk:Reward Ratio',
      includesFees: 'Includes Fees',
      yes: 'Yes',
      no: 'No',
      stopLossRisk: 'Stop Loss Risk',
      maxPotentialLoss: 'Max Potential Loss',
      expectedProfit: 'Expected Profit',
      potentialGain: 'Potential Gain',
      
      // Header Features
      riskManagement: 'Risk Management',
      exchanges: 'Exchanges',
      realTimeCalc: 'Real-time Calculation',
      
      // Warning Messages
      warningExchangeRule: 'EXCHANGE RULE',
      warningTightStop: 'TIGHT STOP: Stop distance <0.5% - high chance of premature stop-out',
      warningWideStop: 'WIDE STOP: Stop distance >10% - consider reducing risk amount',
      warningHighRiskPercent: 'HIGH RISK %: Risking >5% of account on single trade',
      warningElevatedRiskPercent: 'ELEVATED RISK %: Risking >2% of account on single trade',
      warningCriticalLiquidation: 'CRITICAL: Stop price is beyond liquidation price - position will be liquidated before stop trigger',
      warningHighRiskLiquidation: 'HIGH RISK: Liquidation price is within 1% of stop price',
      warningModerateRiskLiquidation: 'MODERATE RISK: Liquidation price is within 2% of stop price',
      warningExtremeLeverage: 'EXTREME LEVERAGE: Consider reducing leverage for better risk management',
      warningHighLeverage: 'HIGH LEVERAGE: Monitor position closely for rapid price movements',
      warningHighMarginUsage: 'HIGH MARGIN USAGE: Using >80% of account equity as margin',
      warningModerateMarginUsage: 'MODERATE MARGIN USAGE: Using >50% of account equity as margin',
      warningLeverageNotSpecified: 'Leverage not specified for contract trading',
      
      // Order Summary
      orderSummaryEntry: 'Entry',
      orderSummaryStop: 'Stop',
      orderSummaryQty: 'Qty',
      orderSummaryNotional: 'Notional',
      orderSummaryLeverage: 'Leverage',
      orderSummaryMargin: 'Margin',
      orderSummaryEstLiquidation: 'Est. Liquidation',
      orderSummaryFees: 'Fees',
      orderSummaryOpen: 'Open',
      orderSummaryClose: 'Close',
      orderSummaryBreakeven: 'Breakeven',
      orderSummaryTarget: 'Target',
      orderSummaryCompliance: 'Compliance',
      orderSummaryWarnings: 'Warnings',
      orderSummaryNote: 'Note: Estimates only. Exchange rules prevail.',
      
      // Trailing Exits
      trailingExits: {
        title: 'Trailing Exits',
        optional: 'Optional',
        enable: 'Enable',
      },
      trailingStrategies: {
        maCrossExit: 'MA Crossover Exit',
        maCrossExitDesc: 'Exit when price crosses below/above moving average',
        maBandStop: 'MA Offset Trailing Stop',
        maBandStopDesc: 'Trailing stop with fixed offset from moving average',
        maChandelier: 'MA-ATR Chandelier Exit',
        maChandelierDesc: 'Dynamic trailing stop using MA and ATR volatility',
      },
      trailingParams: {
        strategy: 'Strategy',
        maType: 'MA Type',
        ema: 'EMA',
        sma: 'SMA',
        maPeriod: 'MA Period',
        atrPeriod: 'ATR Period',
        timeframe: 'Timeframe',
        onCloseOnly: 'On Close Only',
        offsetConfiguration: 'Offset Configuration',
        offsetType: 'Offset Type',
        atrMultiplier: 'ATR x',
        percentage: 'Percentage',
        absolute: 'Absolute',
        multiplier: 'Multiplier',
        absoluteValue: 'Absolute Value',
      },
      trailingReadings: {
        title: 'Real-time Readings',
        currentPrice: 'Current Price',
        exitTrigger: 'Exit Trigger',
        stopPrice: 'Stop Price',
      },
      trailingResults: {
        targets: 'R:R Target Prices',
        rrRatio: 'R:R',
        targetPrice: 'Target Price',
        expectedProfit: 'Expected Profit',
        expectedLoss: 'Expected Loss',
        bestTarget: 'Best Target ({{rr}}:1)',
        basedOnQuantity: 'Based on {{qty}} units',
        priceIncludesFees: 'Includes fees if enabled',
        exitTriggerPnL: 'Exit Trigger P&L',
        exitTriggerPnLDesc: 'Expected P&L when price reaches exit trigger and trailing stop activates',
        exitTriggerProfit: 'Exit Trigger Profit',
        exitTriggerLoss: 'Exit Trigger Loss',
      },
      trailingNotices: {
        roundingTitle: 'Price Rounding',
        roundingDescription: 'Prices are rounded to tickSize={{tickSize}}. LONG stops round down, SHORT stops round up.',
      }
    }
  },
  zh: {
    translation: {
      // App Title
      appTitle: '固定风险仓位计算器',
      appSubtitle: '基于固定风险管理计算加密货币交易仓位大小',
      
      // Navigation
      calculator: '计算器',
      presets: '预设',
      settings: '设置',
      
      // Calculator Form
      loadPreset: '加载预设',
      selectPreset: '选择一个预设...',
      
      // Market Settings
      exchange: '交易所',
      symbol: '交易对',
      contractMode: '模式',
      side: '方向',
      long: '做多',
      short: '做空',
      
      // Exchange Names
      binance: '币安',
      bybit: 'Bybit',
      bitget: 'Bitget',
      okx: 'OKX',
      
      // Contract Modes
      spot: '现货',
      usdtPerp: 'USDT永续',
      inverse: '反向合约',
      
      // Entry Settings
      orderType: '订单类型',
      marketOrder: '市价单',
      limitOrder: '限价单',
      entryPrice: '入场价格（当前/预期）',
      limitPrice: '限价',
      marketOrderNote: '市价单请输入预期成交价格',
      realTimePriceUpdated: '价格自动从市场更新',
      realTimePrice: '实时价格',
      
      // Stop Loss
      stopMode: '止损模式',
      priceStop: '价格止损',
      atrStop: 'ATR止损',
      stopPrice: '止损价格',
      atrPeriod: '周期',
      atrTimeframe: '时间框架',
      atrMultiplier: 'ATR倍数',
      fetchATR: '获取ATR',
      maStop: '均线止损',
      emaStop: 'EMA止损',
      fetchMA: '获取均线',
      stopMAPeriod: '均线周期',
      stopMATimeframe: '均线时间框架',
      maMustBeFetched: '必须先获取均线',
      failedToFetchMA: '获取均线失败',
      maStopExplanation: '使用简单移动平均线作为止损位',
      emaStopExplanation: '使用指数移动平均线作为止损位',
      
      // Take Profit
      takeProfitSettings: '止盈设置',
      useTakeProfit: '启用止盈',
      takeProfitMode: '止盈模式',
      priceTakeProfit: '价格目标',
      atrTakeProfit: 'ATR目标',
      rrRatioTakeProfit: '盈亏比目标',
      maTakeProfit: '均线目标',
      emaTakeProfit: 'EMA目标',
      takeProfitPrice: '止盈价格',
      takeProfitATRMultiplier: 'ATR倍数',
      takeProfitRRRatio: '风险收益比',
      takeProfitMAPeriod: '均线周期',
      takeProfitMATimeframe: '均线时间框架',
      expectedTakeProfit: '预期止盈',
      usesCurrentATRValue: '使用止损设置中的当前ATR值',
      rrRatioTakeProfitDescription: '基于风险收益比设置止盈，包含手续费和滑点',
      movingAverageExplanation: '价格达到移动平均线水平时止盈',
      emaExplanation: '价格达到指数移动平均线水平时止盈',
      
      // Trailing Stop Settings
      trailingStopSettings: '移动止损设置',
      trailingStrategy: '策略',
      trailingTimeframe: '时间框架',
      trailingMAType: '均线类型',
      trailingMAPeriod: '均线周期',
      trailingATRPeriod: 'ATR周期',
      trailingATRMultiplier: 'ATR倍数',
      trailingOnCloseOnly: '仅在K线收盘时更新',
      trailingExplanation: '使用移动平均线跟踪价格的动态止损',
      testTrailingData: '测试移动止损数据',
      maCrossExit: '均线交叉退出',
      maBandStop: '均线带状止损',
      maChandelier: '均线吊灯止损',
      ema: 'EMA',
      sma: 'SMA',
      trailingStopResults: '移动止损结果',
      currentMA: '当前均线',
      currentPrice: '当前价格',
      trailingStopPrice: '移动止损价格',
      exitTriggerPrice: '退出触发价格',
      expectedPnL: '预期盈亏',
      maxLoss: '最大亏损',
      target: '目标',
      strategy: '策略',
      timeframe: '时间框架',
      maType: '均线类型',
      loading: '加载中...',
      
      // Risk Settings
      riskMode: '风险模式',
      fixedUSDTAmount: '固定USDT金额',
      accountPercentage: '账户百分比',
      riskAmount: '风险金额 (USDT)',
      accountEquity: '账户权益 (USDT)',
      riskPercentage: '风险百分比 (%)',
      
      // Advanced Options
      advancedOptions: '高级选项',
      includeFees: '在风险计算中包含交易费用',
      openFee: '开仓费率 (%)',
      closeFee: '平仓费率 (%)',
      slippage: '滑点 (%)',
      
      // Leverage
      leverage: '杠杆（可选）',
      autoSuggest: '自动建议',
      
      // Actions
      calculatePosition: '计算仓位',
      calculating: '计算中...',
      copyOrderSummary: '复制订单摘要',
      
      // Results
      results: '结果',
      positionResults: '仓位结果',
      rawQuantity: '原始数量',
      roundedQuantity: '开仓数量',
      notionalValue: '名义价值',
      initialMargin: '初始保证金',
      estLiquidation: '预估清算价',
      targets: '目标位（风险：收益）',
      breakeven: '保本位',
      warnings: '警告',
      orderSummary: '订单摘要：',
      enterAndCalculate: '输入参数并计算以查看结果',
      
      // Footer
      educationalOnly: '⚠️ 仅供教育目的，不构成投资建议。',
      verifyCalculations: '请务必验证计算结果并遵守交易所规则。',
      
      // Common
      save: '保存',
      cancel: '取消',
      delete: '删除',
      load: '加载',
      reset: '重置',
      confirm: '确认',
      
      // Placeholders
      enterAmount: '输入金额',
      enterPrice: '输入价格',
      enterExpectedEntryPrice: '输入预期入场价格',
      enterLimitPrice: '输入限价',
      enterStopPrice: '输入止损价格',
      enterRiskAmount: '输入风险金额',
      totalEquity: '总权益',
      
      // Settings
      settingsTitle: '设置',
      defaultMarketSettings: '默认市场设置',
      defaultExchange: '默认交易所',
      defaultSymbol: '默认交易对',
      defaultContractMode: '默认合约模式',
      defaultModeSettings: '默认模式设置',
      defaultStopMode: '默认止损模式',
      defaultRiskMode: '默认风险模式',
      defaultOrderType: '默认订单类型',
      defaultLeverage: '默认杠杆倍数',
      defaultRiskSettings: '默认风险设置',
      defaultAccountEquity: '默认账户权益',
      defaultRiskPercent: '默认风险百分比',
      defaultRiskAmount: '默认风险金额',
      defaultFeeSettings: '默认费率设置',
      defaultAtrSettings: '默认ATR设置',
      rrSettings: '风险收益比设置',
      rrRatios: '风险收益比率 (逗号分隔)',
      rrRatiosHelp: '输入目标比率，如：1, 1.5, 2, 3',
      rrRatiosList: '风险收益比率',
      addRatio: '添加比率',
      removeRatio: '删除',
      ratioPlaceholder: '输入比率 (例如: 2.0)',
      uiPreferences: '界面偏好',
      theme: '主题',
      language: '语言',
      system: '跟随系统',
      light: '浅色',
      dark: '深色',
      english: 'English',
      chinese: '中文',
      advancedSettings: '高级设置',
      autoFetchATR: '交易对变化时自动获取ATR',
      showAdvancedOptions: '在计算器中显示高级选项',
      defaultIncludeFees: '默认在计算中包含手续费',
      
      // Take Profit Settings
      defaultTakeProfitSettings: '默认止盈设置',
      defaultUseTakeProfit: '默认启用止盈',
      defaultTakeProfitMode: '默认止盈模式',
      defaultTakeProfitPrice: '默认止盈价格',
      defaultTakeProfitATRMultiplier: '默认止盈ATR倍数',
      defaultTakeProfitRRRatio: '默认风险收益比',
      takeProfitPricePlaceholder: '留空表示无默认值',
      resetToDefaults: '重置为默认值',
      resetConfirm: '确定要将所有设置重置为默认值吗？',
      settingsSaved: '设置保存成功',
      settingsError: '设置保存失败',
      
      // Presets
      presetsTitle: '预设管理器',
      saveCurrentPreset: '将当前配置保存为预设',
      savePreset: '保存预设',
      enterPresetName: '输入预设名称...',
      deletePreset: '删除',
      deletePresetConfirm: '确定要删除这个预设吗？',
      noPresets: '尚未保存任何预设',
      saveFirstPreset: '保存您的第一个预设以开始使用',
      enterPresetNameAlert: '请输入预设名称',
      
      // Form Labels & Inputs
      marketSettings: '市场设置',
      entrySettings: '入场设置',
      stopLossSettings: '止损设置',
      riskSettings: '风险设置',
      positionSettings: '仓位设置',
      
      // Validation & Errors
      fieldRequired: '此字段为必填项',
      mustBePositive: '必须是正数',
      invalidNumber: '无效数字',
      fetchingATR: '获取ATR中...',
      atrFetchFailed: 'ATR获取失败',
      calculationFailed: '计算失败',
      atrMustBeFetched: 'ATR必须获取或手动输入',
      failedToFetchATR: '获取ATR数据失败',
      copiedToClipboard: '已复制到剪贴板',
      clickToCopy: '点击复制数值',
      
      // Market Data
      fetchingPrice: '正在获取当前价格...',
      priceUpdated: '价格已更新',
      failedToFetchPrice: '获取当前价格失败',
      lockedAtCalculation: '计算时锁定价格',
      symbolNotSupported: '该交易所不支持此交易对',
      getCurrentPrice: '获取当前价格',
      autoFetchPrice: '自动获取当前价格',
      
      // Additional messages
      
      // Buttons & Actions
      fetchATRButton: '获取ATR',
      fetchMetadata: '获取市场信息',
      fetchingMetadata: '获取中...',
      metadataLoaded: '已加载',
      riskAmountUSDT: '风险金额 (USDT)',
      autoSuggestLeverage: '自动建议',
      rawQuantityPrefix: '原始数量',
      calculate: '计算',
      ok: '确定',
      
      // Results
      calculationResults: '计算结果',
      positionSize: '仓位大小',
      stopLoss: '止损',
      riskReward: '风险收益目标',
      tradingFees: '交易手续费',
      riskRewardRatio: '风险收益比',
      includesFees: '包含手续费',
      yes: '是',
      no: '否',
      stopLossRisk: '止损风险',
      maxPotentialLoss: '最大潜在损失',
      expectedProfit: '预期盈利',
      potentialGain: '潜在收益',
      
      // Header Features
      riskManagement: '风险管理',
      exchanges: '交易所',
      realTimeCalc: '实时计算',
      
      // Warning Messages
      warningExchangeRule: '交易所规则',
      warningTightStop: '止损过紧：止损距离 <0.5% - 容易被提前止损',
      warningWideStop: '止损过宽：止损距离 >10% - 建议减少风险金额',
      warningHighRiskPercent: '高风险%：单笔交易风险超过账户的5%',
      warningElevatedRiskPercent: '风险偏高%：单笔交易风险超过账户的2%',
      warningCriticalLiquidation: '严重警告：止损价格超出强平价格 - 将在止损触发前被强制平仓',
      warningHighRiskLiquidation: '高风险：强平价格在止损价格1%范围内',
      warningModerateRiskLiquidation: '中等风险：强平价格在止损价格2%范围内',
      warningExtremeLeverage: '极高杠杆：建议降低杠杆以改善风险管理',
      warningHighLeverage: '高杠杆：密切监控仓位以应对快速价格变动',
      warningHighMarginUsage: '高保证金使用率：使用了超过80%的账户权益作为保证金',
      warningModerateMarginUsage: '中等保证金使用率：使用了超过50%的账户权益作为保证金',
      warningLeverageNotSpecified: '合约交易未指定杠杆倍数',
      
      // Order Summary
      orderSummaryEntry: '入场',
      orderSummaryStop: '止损',
      orderSummaryQty: '数量',
      orderSummaryNotional: '名义价值',
      orderSummaryLeverage: '杠杆',
      orderSummaryMargin: '保证金',
      orderSummaryEstLiquidation: '预估强平价',
      orderSummaryFees: '手续费',
      orderSummaryOpen: '开仓',
      orderSummaryClose: '平仓',
      orderSummaryBreakeven: '保本位',
      orderSummaryTarget: '目标位',
      orderSummaryCompliance: '合规检查',
      orderSummaryWarnings: '警告',
      orderSummaryNote: '注意：仅为估算值，以交易所规则为准。',
      
      // Trailing Exits
      trailingExits: {
        title: '移动止盈止损',
        optional: '可选',
        enable: '启用',
      },
      trailingStrategies: {
        maCrossExit: '均线穿越退出',
        maCrossExitDesc: '价格突破移动平均线下方/上方时退出',
        maBandStop: '均线偏移追踪止损',
        maBandStopDesc: '基于移动平均线固定偏移距离的追踪止损',
        maChandelier: '均线-ATR吊灯退出',
        maChandelierDesc: '使用移动平均线和ATR波动率的动态追踪止损',
      },
      trailingParams: {
        strategy: '策略',
        maType: '均线类型',
        ema: 'EMA',
        sma: 'SMA',
        maPeriod: '均线周期',
        atrPeriod: 'ATR周期',
        timeframe: '时间框架',
        onCloseOnly: '仅收盘更新',
        offsetConfiguration: '偏移配置',
        offsetType: '偏移类型',
        atrMultiplier: 'ATR倍数',
        percentage: '百分比',
        absolute: '绝对值',
        multiplier: '倍数',
        absoluteValue: '绝对值',
      },
      trailingReadings: {
        title: '实时读数',
        currentPrice: '当前价格',
        exitTrigger: '退出触发线',
        stopPrice: '止损价格',
      },
      trailingResults: {
        targets: '风险收益比目标价',
        rrRatio: '风险收益比',
        targetPrice: '目标价格',
        expectedProfit: '预期收益',
        expectedLoss: '预期损失',
        bestTarget: '最佳目标 ({{rr}}:1)',
        basedOnQuantity: '基于 {{qty}} 单位',
        priceIncludesFees: '如启用则包含手续费',
        exitTriggerPnL: '退出触发盈亏',
        exitTriggerPnLDesc: '价格达到退出触发线并激活追踪止损时的预期盈亏',
        exitTriggerProfit: '退出触发盈利',
        exitTriggerLoss: '退出触发损失',
      },
      trailingNotices: {
        roundingTitle: '价格舍入',
        roundingDescription: '价格按tickSize={{tickSize}}舍入。多头止损向下舍入，空头止损向上舍入。',
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('settings-storage') ? 
      JSON.parse(localStorage.getItem('settings-storage') || '{}').state?.settings?.language || 'en' : 
      'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    
    // Debug mode for development
    debug: false,
  });

export default i18n;