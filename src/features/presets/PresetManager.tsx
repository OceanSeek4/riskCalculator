import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Download, Calendar, Bookmark } from 'lucide-react';
import { usePresetStore, useCalculatorStore } from '@/lib/store';
import { CalculatorFormData } from '@/lib/validation';
import { useTranslation } from 'react-i18next';

export function PresetManager() {
  const { presets, addPreset, removePreset, loadPreset } = usePresetStore();
  const { formData, setFormData } = useCalculatorStore();
  const { t } = useTranslation();
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      alert(t('enterPresetNameAlert'));
      return;
    }

    // Only save relevant form data for presets
    const presetData: Partial<CalculatorFormData> = {
      exchange: formData.exchange,
      symbol: formData.symbol,
      contractMode: formData.contractMode,
      side: formData.side,
      stopMode: formData.stopMode,
      atrPeriod: formData.atrPeriod,
      atrTimeframe: formData.atrTimeframe,
      atrMultiplier: formData.atrMultiplier,
      includeFees: formData.includeFees,
      feeOpen: formData.feeOpen,
      feeClose: formData.feeClose,
      slippage: formData.slippage,
      autoLeverage: formData.autoLeverage,
      maxEquityUsage: formData.maxEquityUsage,
      leverage: formData.leverage,
    };

    addPreset(newPresetName, presetData);
    setNewPresetName('');
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (id: string) => {
    const presetData = loadPreset(id);
    if (presetData) {
      setFormData(presetData);
    }
  };

  const handleDeletePreset = (id: string) => {
    if (confirm(t('deletePresetConfirm'))) {
      removePreset(id);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="w-full max-w-4xl space-y-6 fade-in">
      {/* Save New Preset Section */}
      <Card className="modern-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-blue-600 text-white">
              <Bookmark className="w-5 h-5" />
            </div>
            <CardTitle className="text-xl">{t('presetsTitle')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('saveCurrentPreset')}
            </p>
            
            {!showSaveDialog ? (
              <Button onClick={() => setShowSaveDialog(true)} className="btn-modern">
                <Plus className="w-4 h-4 mr-2" />
                {t('savePreset')}
              </Button>
            ) : (
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label>{t('enterPresetName')}</Label>
                  <Input
                    value={newPresetName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setNewPresetName(e.target.value)
                    }
                    placeholder={t('enterPresetName')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSavePreset();
                      if (e.key === 'Escape') setShowSaveDialog(false);
                    }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button onClick={handleSavePreset} className="btn-modern">{t('save')}</Button>
                  <Button 
                    variant="outline"
                    className="btn-modern" 
                    onClick={() => {
                      setShowSaveDialog(false);
                      setNewPresetName('');
                    }}
                  >
                    {t('cancel')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Saved Presets */}
      <Card className="modern-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">{t('presets')}</CardTitle>
        </CardHeader>
        <CardContent>
          {presets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">{t('noPresets')}</p>
              <p className="text-sm">{t('saveFirstPreset')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md hover:scale-[1.01]"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{preset.name}</h4>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        {preset.data.exchange}
                      </span>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        {preset.data.symbol}
                      </span>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        {preset.data.contractMode}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {formatDate(preset.createdAt)}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span>Side: {preset.data.side}</span>
                      {preset.data.stopMode && (
                        <>
                          <span className="mx-2">•</span>
                          <span>Stop: {preset.data.stopMode}</span>
                        </>
                      )}
                      {preset.data.atrTimeframe && (
                        <>
                          <span className="mx-2">•</span>
                          <span>ATR: {preset.data.atrPeriod || 14}{preset.data.atrTimeframe}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="btn-modern"
                      onClick={() => handleLoadPreset(preset.id)}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('loadPreset')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeletePreset(preset.id)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300 btn-modern"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preset Details */}
      {presets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm space-y-2 text-muted-foreground">
              <p>• Presets save your market settings, stop loss configuration, and fee settings</p>
              <p>• Entry price and risk amount are not saved in presets</p>
              <p>• Loading a preset will override your current form settings</p>
              <p>• You can edit preset names by deleting and re-saving</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}