import { cn } from '@/lib/utils';
import uiReducerSelector from '@/store/reducers/ui-reducer/ui-reducer-selector';
import React, { useEffect, useRef, memo } from 'react';
import { useSelector } from 'react-redux';

interface SymbolOverviewWidgetProps {
  ticker: string;
}

const SymbolOverviewWidget: React.FC<SymbolOverviewWidgetProps> = ({ ticker }) => {
  const container = useRef<HTMLDivElement>(null);
  const isHamburgerMenuOpen = useSelector(uiReducerSelector.getIsHamburgerMenuOpen);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = `
        {
          "symbols": [
            [
              "BIST:${ticker}|1D"
            ]
          ],
          "chartOnly": false,
          "width": "100%",
          "height": "200%",
          "locale": "tr",
          "colorTheme": "dark",
          "autosize": true,
          "showVolume": false,
          "showMA": false,
          "hideDateRanges": false,
          "hideMarketStatus": false,
          "hideSymbolLogo": false,
          "scalePosition": "right",
          "scaleMode": "Normal",
          "fontFamily": "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
          "fontSize": "10",
          "noTimeScale": false,
          "valuesTracking": "1",
          "changeMode": "price-and-percent",
          "chartType": "area",
          "maLineColor": "#2962FF",
          "maLineWidth": 1,
          "maLength": 9,
          "headerFontSize": "medium",
          "lineWidth": 2,
          "lineType": 0,
          "dateRanges": [
            "1d|1",
            "1m|30",
            "3m|60",
            "12m|1D",
            "60m|1W",
            "all|1M"
          ]
        }`;
    if (container.current) {
      container.current.innerHTML = '';
      container.current.appendChild(script);
    }
  }, []);

  return (
    <div
      className={cn(
        'tradingview-widget-container',
        isHamburgerMenuOpen ? 'pointer-events-none' : ''
      )}
      ref={container}
    >
      <div className='tradingview-widget-container__widget'></div>
    </div>
  );
};

export default memo(SymbolOverviewWidget);
