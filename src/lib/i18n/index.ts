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
      
      // Stop Loss
      stopMode: 'Stop Mode',
      priceStop: 'Price Stop',
      atrStop: 'ATR Stop',
      stopPrice: 'Stop Price',
      atrPeriod: 'Period',
      atrTimeframe: 'Timeframe',
      atrMultiplier: 'ATR Multiplier',
      fetchATR: 'Fetch ATR',
      
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
      
      // Market Data
      fetchingPrice: 'Fetching current price...',
      priceUpdated: 'Price updated',
      failedToFetchPrice: 'Failed to fetch current price',
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
      orderSummaryCompliance: 'Compliance',
      orderSummaryWarnings: 'Warnings',
      orderSummaryNote: 'Note: Estimates only. Exchange rules prevail.'
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
      
      // Stop Loss
      stopMode: '止损模式',
      priceStop: '价格止损',
      atrStop: 'ATR止损',
      stopPrice: '止损价格',
      atrPeriod: '周期',
      atrTimeframe: '时间框架',
      atrMultiplier: 'ATR倍数',
      fetchATR: '获取ATR',
      
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
      
      // Market Data
      fetchingPrice: '正在获取当前价格...',
      priceUpdated: '价格已更新',
      failedToFetchPrice: '获取当前价格失败',
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
      orderSummaryCompliance: '合规检查',
      orderSummaryWarnings: '警告',
      orderSummaryNote: '注意：仅为估算值，以交易所规则为准。'
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