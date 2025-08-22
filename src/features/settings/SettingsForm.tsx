import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RotateCcw, Save, Settings, Check, X, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { useSettingsStore, useCalculatorStore } from '@/lib/store';
import { getSupportedTimeframes } from '@/lib/market-service';
import { useTranslation } from 'react-i18next';

export function SettingsForm() {
  const { 
    settings, 
    setSettings, 
    resetSettings,
    showNotification,
    notificationMessage,
    notificationType,
    setNotification,
    clearNotification
  } = useSettingsStore();
  const { setFormData } = useCalculatorStore();
  const { t, i18n } = useTranslation();

  // Auto-clear notification after 3 seconds
  useEffect(() => {
    if (showNotification) {
      const timer = setTimeout(() => {
        clearNotification();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showNotification, clearNotification]);

  const handleInputChange = (field: keyof typeof settings, value: any) => {
    setSettings({ [field]: value });
    
    // Handle language change
    if (field === 'language') {
      i18n.changeLanguage(value);
    }
  };

  const handleSave = () => {
    try {
      // Settings are automatically persisted via Zustand persist middleware
      // Apply new defaults to calculator form - this will update the displayed values
      setFormData({
        exchange: settings.defaultExchange,
        symbol: settings.defaultSymbol,
        contractMode: settings.defaultContractMode,
        stopMode: settings.defaultStopMode,
        riskMode: settings.defaultRiskMode,
        orderType: settings.defaultOrderType,
        leverage: settings.defaultLeverage,
        accountEquity: settings.defaultAccountEquity,
        riskPercent: settings.defaultRiskPercent,
        riskAmount: settings.defaultRiskAmount,
        atrPeriod: settings.defaultAtrPeriod,
        atrTimeframe: settings.defaultAtrTimeframe,
        atrMultiplier: settings.defaultAtrMultiplier,
        feeOpen: settings.defaultFeeOpen,
        feeClose: settings.defaultFeeClose,
        slippage: settings.defaultSlippage,
        includeFees: settings.defaultIncludeFees,
      });
      
      setNotification(t('settingsSaved') || 'Settings saved successfully!', 'success');
    } catch (error) {
      setNotification(t('settingsError') || 'Failed to save settings', 'error');
    }
  };

  const handleReset = () => {
    if (confirm(t('resetConfirm'))) {
      resetSettings();
    }
  };

  const handleRRRatiosChange = (value: string) => {
    try {
      // Split by comma and clean up whitespace
      const ratios = value
        .split(',')
        .map(r => r.trim())
        .filter(r => r !== '') // Remove empty strings
        .map(r => parseFloat(r))
        .filter(r => !isNaN(r) && r > 0); // Keep only valid positive numbers
      
      setSettings({ rrRatios: ratios });
    } catch (error) {
      console.error('Invalid RR ratios format');
    }
  };

  const handleAddRatio = () => {
    setSettings({ rrRatios: [...(settings.rrRatios || []), 1] });
  };

  const handleRemoveRatio = (index: number) => {
    const newRatios = (settings.rrRatios || []).filter((_, i) => i !== index);
    setSettings({ rrRatios: newRatios });
  };

  const handleRatioChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      const newRatios = [...(settings.rrRatios || [])];
      newRatios[index] = numValue;
      setSettings({ rrRatios: newRatios });
    }
  };

  const supportedIntervals = getSupportedTimeframes(settings.defaultExchange);

  return (
    <Card className="w-full max-w-2xl modern-card fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 text-white">
            <Settings className="w-5 h-5" />
          </div>
          <CardTitle className="text-xl">{t('settingsTitle')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Default Market Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            {t('defaultMarketSettings')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('defaultExchange')}</Label>
              <Select
                value={settings.defaultExchange}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('defaultExchange', e.target.value as 'BINANCE' | 'BYBIT' | 'BITGET' | 'OKX')
                }
              >
                <option value="BINANCE">{t('binance')}</option>
                <option value="BYBIT">{t('bybit')}</option>
                <option value="BITGET">{t('bitget')}</option>
                <option value="OKX">{t('okx')}</option>
              </Select>
            </div>
            
            <div>
              <Label>{t('defaultSymbol')}</Label>
              <Input
                value={settings.defaultSymbol}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultSymbol', e.target.value)
                }
                placeholder="BTCUSDT"
              />
            </div>
            
            <div>
              <Label>{t('defaultContractMode')}</Label>
              <Select
                value={settings.defaultContractMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('defaultContractMode', e.target.value as 'SPOT' | 'USDT_PERP' | 'INVERSE')
                }
              >
                <option value="SPOT">{t('spot')}</option>
                <option value="USDT_PERP">{t('usdtPerp')}</option>
                <option value="INVERSE">{t('inverse')}</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Default Mode Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
            {t('defaultModeSettings')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('defaultStopMode')}</Label>
              <Select
                value={settings.defaultStopMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('defaultStopMode', e.target.value as 'PRICE' | 'ATR')
                }
              >
                <option value="PRICE">{t('priceStop')}</option>
                <option value="ATR">{t('atrStop')}</option>
              </Select>
            </div>
            
            <div>
              <Label>{t('defaultRiskMode')}</Label>
              <Select
                value={settings.defaultRiskMode}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('defaultRiskMode', e.target.value as 'FIXED_USDT' | 'ACCOUNT_PERCENT')
                }
              >
                <option value="FIXED_USDT">{t('fixedUSDTAmount')}</option>
                <option value="ACCOUNT_PERCENT">{t('accountPercentage')}</option>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('defaultOrderType')}</Label>
              <Select
                value={settings.defaultOrderType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('defaultOrderType', e.target.value as 'MARKET' | 'LIMIT')
                }
              >
                <option value="MARKET">{t('marketOrder')}</option>
                <option value="LIMIT">{t('limitOrder')}</option>
              </Select>
            </div>
            
            <div>
              <Label>{t('defaultLeverage')}</Label>
              <Input
                type="number"
                min="1"
                max="200"
                value={settings.defaultLeverage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultLeverage', parseInt(e.target.value) || 1)
                }
                placeholder="10"
              />
            </div>
          </div>
        </div>

        {/* Default Risk Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            {t('defaultRiskSettings')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('defaultAccountEquity')}</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.defaultAccountEquity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultAccountEquity', e.target.value)
                }
                placeholder="10000"
              />
            </div>
            
            <div>
              <Label>{t('defaultRiskPercent')}</Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={settings.defaultRiskPercent}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultRiskPercent', e.target.value)
                }
                placeholder="1"
              />
            </div>
            
            <div>
              <Label>{t('defaultRiskAmount')}</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.defaultRiskAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultRiskAmount', e.target.value)
                }
                placeholder="100"
              />
            </div>
          </div>
        </div>

        {/* Default Fee Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            {t('defaultFeeSettings')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('openFee')}</Label>
              <Input
                type="number"
                step="0.0001"
                value={settings.defaultFeeOpen}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultFeeOpen', e.target.value)
                }
                placeholder="0.0004"
              />
            </div>
            
            <div>
              <Label>{t('closeFee')}</Label>
              <Input
                type="number"
                step="0.0001"
                value={settings.defaultFeeClose}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultFeeClose', e.target.value)
                }
                placeholder="0.0004"
              />
            </div>
            
            <div>
              <Label>{t('slippage')}</Label>
              <Input
                type="number"
                step="0.0001"
                value={settings.defaultSlippage}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultSlippage', e.target.value)
                }
                placeholder="0.0005"
              />
            </div>
          </div>
        </div>

        {/* ATR Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            {t('defaultAtrSettings')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('atrPeriod')}</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={settings.defaultAtrPeriod}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultAtrPeriod', parseInt(e.target.value))
                }
              />
            </div>
            
            <div>
              <Label>{t('atrTimeframe')}</Label>
              <Select
                value={settings.defaultAtrTimeframe}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('defaultAtrTimeframe', e.target.value)
                }
              >
                {supportedIntervals.map((interval: string) => (
                  <option key={interval} value={interval}>{interval}</option>
                ))}
              </Select>
            </div>
            
            <div>
              <Label>{t('atrMultiplier')}</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.defaultAtrMultiplier}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultAtrMultiplier', e.target.value)
                }
                placeholder="2"
              />
            </div>
          </div>
        </div>

        {/* Take Profit Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
            {t('defaultTakeProfitSettings')}
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.defaultUseTakeProfit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultUseTakeProfit', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('defaultUseTakeProfit')}</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('defaultTakeProfitMode')}</Label>
                <Select
                  value={settings.defaultTakeProfitMode}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleInputChange('defaultTakeProfitMode', e.target.value as 'PRICE' | 'ATR' | 'RR_RATIO')
                  }
                >
                  <option value="PRICE">{t('priceTakeProfit')}</option>
                  <option value="ATR">{t('atrTakeProfit')}</option>
                  <option value="RR_RATIO">{t('rrRatioTakeProfit')}</option>
                </Select>
              </div>
              
              <div>
                <Label>{t('defaultTakeProfitPrice')}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.defaultTakeProfitPrice}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultTakeProfitPrice', e.target.value)
                  }
                  placeholder={t('takeProfitPricePlaceholder')}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('defaultTakeProfitATRMultiplier')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.defaultTakeProfitATRMultiplier}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultTakeProfitATRMultiplier', e.target.value)
                  }
                  placeholder="2.0"
                />
              </div>
              
              <div>
                <Label>{t('defaultTakeProfitRRRatio')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.defaultTakeProfitRRRatio}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultTakeProfitRRRatio', e.target.value)
                  }
                  placeholder="2.0"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Risk/Reward Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            {t('rrSettings')}
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('rrRatiosList')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRatio}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {t('addRatio')}
              </Button>
            </div>
            
            <div className="space-y-2">
              {(settings.rrRatios || []).map((ratio, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={ratio}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        handleRatioChange(index, e.target.value)
                      }
                      placeholder={t('ratioPlaceholder')}
                      className="text-center"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground min-w-0">
                    1:{ratio}
                  </div>
                  {settings.rrRatios.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveRatio(index)}
                      className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {t('rrRatiosHelp')}
            </p>
          </div>
        </div>

        {/* UI Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
            {t('uiPreferences')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('theme')}</Label>
              <Select
                value={settings.theme}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('theme', e.target.value as 'light' | 'dark' | 'system')
                }
              >
                <option value="system">{t('system')}</option>
                <option value="light">{t('light')}</option>
                <option value="dark">{t('dark')}</option>
              </Select>
            </div>
            
            <div>
              <Label>{t('language')}</Label>
              <Select
                value={settings.language}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                  handleInputChange('language', e.target.value as 'en' | 'zh')
                }
              >
                <option value="en">{t('english')}</option>
                <option value="zh">{t('chinese')}</option>
              </Select>
            </div>
          </div>
        </div>

        {/* Symbol List Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>
            {t('symbolListSettings')}
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t('symbolList')}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newSymbol = prompt(t('enterSymbolPrompt'));
                  if (newSymbol && newSymbol.trim()) {
                    const trimmedSymbol = newSymbol.trim().toUpperCase();
                    const currentList = settings.symbolList || [];
                    if (!currentList.includes(trimmedSymbol)) {
                      handleInputChange('symbolList', [...currentList, trimmedSymbol]);
                    }
                  }
                }}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                {t('addSymbol')}
              </Button>
            </div>
            
            <div className="space-y-2">
              {(settings.symbolList || []).map((symbol, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      type="text"
                      value={symbol}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const newList = [...(settings.symbolList || [])];
                        newList[index] = e.target.value.toUpperCase();
                        handleInputChange('symbolList', newList);
                      }}
                      placeholder={t('symbolPlaceholder')}
                      className="text-center"
                    />
                  </div>
                  {(settings.symbolList || []).length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newList = (settings.symbolList || []).filter((_, i) => i !== index);
                        handleInputChange('symbolList', newList);
                      }}
                      className="px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            
            <p className="text-xs text-muted-foreground">
              {t('symbolListHelp')}
            </p>
          </div>
        </div>

        {/* Trailing Stop Defaults */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
            {t('defaultTrailingSettings')}
          </h3>
          
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.defaultTrailingEnabled}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultTrailingEnabled', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('defaultTrailingEnabled')}</span>
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('defaultTrailingStrategy')}</Label>
                <Select
                  value={settings.defaultTrailingStrategy}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleInputChange('defaultTrailingStrategy', e.target.value as 'MA_CROSS_EXIT' | 'MA_BAND_STOP' | 'MA_CHANDELIER')
                  }
                >
                  <option value="MA_CROSS_EXIT">{t('trailingStrategies.maCrossExit', 'MA Cross Exit')}</option>
                  <option value="MA_BAND_STOP">{t('trailingStrategies.maBandStop', 'MA Band Stop')}</option>
                  <option value="MA_CHANDELIER">{t('trailingStrategies.maChandelier', 'MA Chandelier')}</option>
                </Select>
              </div>
              
              <div>
                <Label>{t('defaultTrailingMaType')}</Label>
                <Select
                  value={settings.defaultTrailingMaType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleInputChange('defaultTrailingMaType', e.target.value as 'EMA' | 'SMA')
                  }
                >
                  <option value="EMA">{t('trailingParams.ema', 'EMA')}</option>
                  <option value="SMA">{t('trailingParams.sma', 'SMA')}</option>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t('defaultTrailingMaPeriod')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="200"
                  value={settings.defaultTrailingMaPeriod}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultTrailingMaPeriod', parseInt(e.target.value) || 20)
                  }
                  placeholder="20"
                />
              </div>
              
              <div>
                <Label>{t('defaultTrailingAtrPeriod')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.defaultTrailingAtrPeriod}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultTrailingAtrPeriod', parseInt(e.target.value) || 14)
                  }
                  placeholder="14"
                />
              </div>
              
              <div>
                <Label>{t('defaultTrailingTimeframe')}</Label>
                <Select
                  value={settings.defaultTrailingTimeframe}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                    handleInputChange('defaultTrailingTimeframe', e.target.value)
                  }
                >
                  {supportedIntervals.map((interval: string) => (
                    <option key={interval} value={interval}>{interval}</option>
                  ))}
                </Select>
              </div>
            </div>
            
            {(settings.defaultTrailingStrategy === 'MA_BAND_STOP' || settings.defaultTrailingStrategy === 'MA_CHANDELIER') && (
              <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Label className="text-sm font-medium">{t('defaultTrailingOffsetSettings')}</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('defaultTrailingOffsetType')}</Label>
                    <Select
                      value={settings.defaultTrailingOffsetType}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
                        handleInputChange('defaultTrailingOffsetType', e.target.value as 'ATRx' | 'PCT' | 'ABS')
                      }
                    >
                      <option value="ATRx">{t('trailingParams.atrMultiplier', 'ATR x')}</option>
                      <option value="PCT">{t('trailingParams.percentage', 'Percentage')}</option>
                      <option value="ABS">{t('trailingParams.absolute', 'Absolute')}</option>
                    </Select>
                  </div>
                  
                  {settings.defaultTrailingOffsetType === 'ATRx' && (
                    <div>
                      <Label>{t('defaultTrailingAtrMultiplier')}</Label>
                      <Input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={settings.defaultTrailingAtrMultiplier}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleInputChange('defaultTrailingAtrMultiplier', parseFloat(e.target.value) || 2)
                        }
                        placeholder="2.0"
                      />
                    </div>
                  )}
                  
                  {settings.defaultTrailingOffsetType === 'PCT' && (
                    <div>
                      <Label>{t('defaultTrailingPercentage')}</Label>
                      <Input
                        type="number"
                        min="0.01"
                        max="10"
                        step="0.01"
                        value={settings.defaultTrailingPercentage}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleInputChange('defaultTrailingPercentage', parseFloat(e.target.value) || 0.5)
                        }
                        placeholder="0.5"
                      />
                    </div>
                  )}
                  
                  {settings.defaultTrailingOffsetType === 'ABS' && (
                    <div>
                      <Label>{t('defaultTrailingAbsolute')}</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={settings.defaultTrailingAbsolute}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                          handleInputChange('defaultTrailingAbsolute', parseFloat(e.target.value) || 10)
                        }
                        placeholder="10"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.defaultTrailingOnCloseOnly}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultTrailingOnCloseOnly', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('defaultTrailingOnCloseOnly')}</span>
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {t('advancedSettings')}
          </h3>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.autoFetchATR}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('autoFetchATR', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('autoFetchATR')}</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.showAdvancedOptions}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('showAdvancedOptions', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('showAdvancedOptions')}</span>
            </label>
            
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={settings.defaultIncludeFees}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleInputChange('defaultIncludeFees', e.target.checked)
                }
                className="rounded border-gray-300"
              />
              <span className="text-sm">{t('defaultIncludeFees')}</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <Button onClick={handleSave} className="flex-1 btn-modern">
            <Save className="w-4 h-4 mr-2" />
            {t('save')}
          </Button>
          
          <Button onClick={handleReset} variant="outline" className="btn-modern">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('resetToDefaults')}
          </Button>
        </div>

        {/* Notification */}
        {showNotification && (
          <div className={`
            fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 flex items-center gap-3 min-w-[300px] animate-in slide-in-from-right-full duration-300
            ${notificationType === 'success' ? 'bg-green-50 border-green-500 text-green-800' : 
              notificationType === 'error' ? 'bg-red-50 border-red-500 text-red-800' : 
              'bg-blue-50 border-blue-500 text-blue-800'}
          `}>
            <div className="flex-shrink-0">
              {notificationType === 'success' && <Check className="w-5 h-5 text-green-600" />}
              {notificationType === 'error' && <X className="w-5 h-5 text-red-600" />}
              {notificationType === 'info' && <AlertCircle className="w-5 h-5 text-blue-600" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{notificationMessage}</p>
            </div>
            <button
              onClick={clearNotification}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}