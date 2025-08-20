import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { RotateCcw, Save, Settings } from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { getSupportedIntervals } from '@/lib/adapters';
import { useTranslation } from 'react-i18next';

export function SettingsForm() {
  const { settings, setSettings, resetSettings } = useSettingsStore();
  const { t, i18n } = useTranslation();

  const handleInputChange = (field: keyof typeof settings, value: any) => {
    setSettings({ [field]: value });
    
    // Handle language change
    if (field === 'language') {
      i18n.changeLanguage(value);
    }
  };

  const handleSave = () => {
    // Settings are automatically persisted via Zustand persist middleware
    console.log(t('settingsSaved'));
  };

  const handleReset = () => {
    if (confirm(t('resetConfirm'))) {
      resetSettings();
    }
  };

  const handleRRRatiosChange = (value: string) => {
    try {
      const ratios = value.split(',').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
      setSettings({ rrRatios: ratios });
    } catch (error) {
      console.error('Invalid RR ratios format');
    }
  };

  const supportedIntervals = getSupportedIntervals(settings.defaultExchange);

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

        {/* Risk/Reward Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            {t('rrSettings')}
          </h3>
          
          <div>
            <Label>{t('rrRatios')}</Label>
            <Input
              value={settings.rrRatios.join(', ')}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                handleRRRatiosChange(e.target.value)
              }
              placeholder="1, 1.5, 2"
            />
            <p className="text-sm text-muted-foreground mt-1">
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
      </CardContent>
    </Card>
  );
}