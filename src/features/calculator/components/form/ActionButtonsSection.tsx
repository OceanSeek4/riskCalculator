import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ActionButtonsSectionProps {
  onCalculate: () => void;
  isCalculating?: boolean;
  marketMeta?: any;
  calculationError?: string | null;
}

export function ActionButtonsSection({
  onCalculate,
  isCalculating,
  marketMeta,
  calculationError
}: ActionButtonsSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      {/* Calculate Button */}
      <Button
        onClick={onCalculate}
        disabled={isCalculating || !marketMeta}
        className="w-full"
      >
        {isCalculating ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            {t('calculating')}
          </>
        ) : (
          t('calculatePosition')
        )}
      </Button>

      {calculationError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <AlertCircle className="w-4 h-4" />
          {calculationError}
        </div>
      )}
    </div>
  );
}