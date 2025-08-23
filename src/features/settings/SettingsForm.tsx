import React, { useEffect, useState } from 'react';
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

  // Loading state for save operation
  const [isSaving, setIsSaving] = useState(false);

  // Auto-clear notification after different durations based on type
  useEffect(() => {
    if (showNotification) {
      const duration = notificationType === 'success' ? 4000 : 
                       notificationType === 'error' ? 5000 : 3000;
      const timer = setTimeout(() => {
        clearNotification();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [showNotification, notificationType, clearNotification]);

  const handleInputChange = (field: keyof typeof settings, value: any) => {
    setSettings({ [field]: value });
    
    // Handle language change
    if (field === 'language') {
      i18n.changeLanguage(value);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    
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
        stopPips: settings.defaultStopPips,
        takeProfitPips: settings.defaultTakeProfitPips,
      });
      
      // Add a small delay to show the saving state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show success notification
      setNotification(t('settingsSaved') || 'Settings saved successfully!', 'success');
      
      // Scroll to top to ensure user sees the notification at the top of the card
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        });
      }, 100);
      
      // Optional: Navigate to calculator tab after a short delay
      setTimeout(() => {
        // This would require access to the tab switching function from parent component
        // For now, we'll focus on making the notification more visible
      }, 2000);
      
    } catch (error) {
      console.error('Settings save error:', error);
      setNotification(t('settingsError') || 'Failed to save settings', 'error');
      
      // Scroll to top to ensure user sees the error notification
      setTimeout(() => {
        window.scrollTo({ 
          top: 0, 
          behavior: 'smooth' 
        });
      }, 100);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (confirm(t('resetConfirm'))) {
      try {
        // Reset settings
        resetSettings();
        
        // Add a small delay to show the reset process
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Show success notification
        setNotification(t('settingsReset') || 'Settings reset to defaults successfully!', 'success');
        
        // Scroll to top to ensure user sees the notification at the top of the card
        setTimeout(() => {
          window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        }, 100);
        
      } catch (error) {
        console.error('Settings reset error:', error);
        setNotification(t('resetError') || 'Failed to reset settings', 'error');
        
        // Scroll to top to ensure user sees the error notification
        setTimeout(() => {
          window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        }, 100);
      }
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
      
      {/* Notification at top of card content */}
      {showNotification && (
        <div className="mx-6 mb-4">
          <div className={`
            p-4 rounded-lg border-l-4 flex items-center gap-3 animate-in slide-in-from-top-2 duration-300
            ${notificationType === 'success' ? 'bg-green-50 dark:bg-green-950/50 border-green-500 text-green-800 dark:text-green-200' : 
              notificationType === 'error' ? 'bg-red-50 dark:bg-red-950/50 border-red-500 text-red-800 dark:text-red-200' : 
              'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-800 dark:text-blue-200'}
          `}>
            <div className="flex-shrink-0">
              {notificationType === 'success' && <Check className="w-5 h-5 text-green-600 dark:text-green-400" />}
              {notificationType === 'error' && <X className="w-5 h-5 text-red-600 dark:text-red-400" />}
              {notificationType === 'info' && <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            </div>
            <div className="flex-1 text-center">
              <p className="font-medium">
                {notificationType === 'success' ? t('successTitle') : 
                 notificationType === 'error' ? t('errorTitle') : 
                 t('infoTitle')}
              </p>
              <p className="text-sm opacity-75 mt-1">{notificationMessage}</p>
            </div>
            <button
              onClick={clearNotification}
              className="flex-shrink-0 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
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
                placeholder={t('enterValue') + ' (e.g. BTCUSDT)'}
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
                  handleInputChange('defaultStopMode', e.target.value as 'PRICE' | 'ATR' | 'PIPS')
                }
              >
                <option value="PRICE">{t('priceStop')}</option>
                <option value="ATR">{t('atrStop')}</option>
                <option value="PIPS">{t('pipsStop')}</option>
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
                placeholder={t('enterValue') + ' (1-200x)'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('leverageSettingHelp')}
              </p>
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
                placeholder={t('enterAmount') + ' (USDT)'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('accountEquityHelp')}
              </p>
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
                placeholder={t('enterPercentage') + ' (%)'}
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
                placeholder={t('enterAmount') + ' (USDT)'}
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
          
          <div className="text-sm text-muted-foreground mb-3 p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
            <p className="flex items-center gap-1 mb-1">
              <span className="text-blue-600 dark:text-blue-400">💡</span>
              <strong>{t('feeSettingsHelp')}</strong>
            </p>
            <p className="ml-5 text-blue-700 dark:text-blue-300 text-xs">
              {t('feeSettingsDescription')}
            </p>
          </div>
          
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
                placeholder={t('enterValue') + ' (0.0004 = 0.04%)'}
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
                placeholder={t('enterValue') + ' (0.0004 = 0.04%)'}
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
                placeholder={t('enterValue') + ' (0.0005 = 0.05%)'}
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
                placeholder={t('enterMultiplier') + ' (e.g. 2.0)'}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('atrMultiplierHelp')}
              </p>
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
                    handleInputChange('defaultTakeProfitMode', e.target.value as 'PRICE' | 'ATR' | 'RR_RATIO' | 'PIPS')
                  }
                >
                  <option value="PRICE">{t('priceTakeProfit')}</option>
                  <option value="ATR">{t('atrTakeProfit')}</option>
                  <option value="RR_RATIO">{t('rrRatioTakeProfit')}</option>
                  <option value="PIPS">{t('pipsTakeProfit')}</option>
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
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <span className="text-blue-500">💡</span>
                  {t('takeProfitPriceHelp')}
                </p>
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
                  placeholder={t('enterMultiplier') + ' (e.g. 2.0)'}
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
                  placeholder={t('enterValue') + ' (e.g. 2.0)'}
                />
              </div>
              
              <div>
                <Label>{t('defaultStopPips')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={settings.defaultStopPips}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultStopPips', e.target.value)
                  }
                  placeholder={t('enterPips') + ' (e.g. 50)'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('pipsSettingHelp')}
                </p>
              </div>
              
              <div>
                <Label>{t('defaultTakeProfitPips')}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={settings.defaultTakeProfitPips}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                    handleInputChange('defaultTakeProfitPips', e.target.value)
                  }
                  placeholder={t('enterPips') + ' (e.g. 100)'}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t('pipsSettingHelp')}
                </p>
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
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'SUIUSDT', 'ADAUSDT', 'XRPUSDT'];
                    const currentList = settings.symbolList || [];
                    const newSymbols = defaultSymbols.filter(symbol => !currentList.includes(symbol));
                    if (newSymbols.length > 0) {
                      handleInputChange('symbolList', [...currentList, ...newSymbols]);
                      setNotification(
                        `${t('addedDefaultSymbols')} ${newSymbols.length}: ${newSymbols.join(', ')}`,
                        'success'
                      );
                    } else {
                      setNotification(t('allDefaultSymbolsExist'), 'info');
                    }
                  }}
                  className="flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  {t('addDefaultSymbols')}
                </Button>
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
            </div>
            
            <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
              <p className="flex items-center gap-1 mb-1">
                <span className="text-blue-600 dark:text-blue-400">💡</span>
                <strong>{t('defaultSymbolsInfo')}:</strong>
              </p>
              <p className="ml-5 text-blue-700 dark:text-blue-300">
                BTCUSDT, ETHUSDT, SUIUSDT, ADAUSDT, XRPUSDT
              </p>
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
            
            {(!settings.symbolList || settings.symbolList.length === 0) && (
              <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
                  <span className="inline-block mr-1">⚠️</span>
                  {t('emptySymbolListWarning')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const defaultSymbols = ['BTCUSDT', 'ETHUSDT', 'SUIUSDT', 'ADAUSDT', 'XRPUSDT'];
                    handleInputChange('symbolList', defaultSymbols);
                    setNotification(t('defaultSymbolsAdded'), 'success');
                  }}
                  className="flex items-center gap-1 border-yellow-300 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-300 dark:hover:bg-yellow-900"
                >
                  <Plus className="w-3 h-3" />
                  {t('loadDefaultSymbols')}
                </Button>
              </div>
            )}
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
                  <option value="MA_CROSS_EXIT">{t('maCrossExit')}</option>
                  <option value="MA_BAND_STOP">{t('maBandStop')}</option>
                  <option value="MA_CHANDELIER">{t('maChandelier')}</option>
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
                  placeholder={t('enterPeriod') + ' (e.g. 20)'}
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
                  placeholder={t('enterPeriod') + ' (e.g. 14)'}
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
                        placeholder={t('enterMultiplier') + ' (e.g. 2.0)'}
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
                        placeholder={t('enterPercentage') + ' (e.g. 0.5%)'}
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
                        placeholder={t('enterAmount') + ' (USDT)'}
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
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 btn-modern">
            {isSaving ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('save')}
              </>
            )}
          </Button>
          
          <Button onClick={handleReset} variant="outline" className="btn-modern">
            <RotateCcw className="w-4 h-4 mr-2" />
            {t('resetToDefaults')}
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}