import { Interval, Rect } from '../types';
import Canvas from './Canvas';

enum Color {
  GREEN = '#0f0',
  RED = '#f00'
}

type PatternRenderer = (canvas: Canvas, interval: Interval, bounds: Rect) => void;

const WeightedColors = [
  [ '#020', '#200' ],
  [ '#030', '#300' ],
  [ '#060', '#600' ],
  [ '#0b0', '#b00' ],
  [ '#0f0', '#f00' ],
];

function getCandleRect(interval: Interval, bounds: Rect): Rect {
  const { high, low, open, close } = interval;
  const dy = bounds.height / (high - low);
  const isBullish = close > open;
  const candleTop = isBullish ? close : open;
  const candleBottom = isBullish ? open : close;
  const topWickHeight = (high - candleTop) * dy;
  const bottomWickHeight = (candleBottom - low) * dy;

  return {
    x: bounds.x + 2,
    y: bounds.y + topWickHeight,
    width: bounds.width - 2,
    height: Math.max(bounds.height - topWickHeight - bottomWickHeight, 1)
  };
}

export const renderIntervalLine: PatternRenderer = (canvas, { open, close }, bounds) => {
  const color = close > open ? Color.GREEN : Color.RED;

  canvas.setColor(color);

  canvas.line({
    from: { x: bounds.x + bounds.width / 2, y: bounds.y },
    to: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
  });
};

export const renderCandlestick: PatternRenderer = (canvas, interval, bounds) => {
  const { open, close } = interval;
  const isBullish = close > open;

  canvas.setColor(isBullish ? Color.GREEN : Color.RED);
  canvas.rect(getCandleRect(interval, bounds));

  renderIntervalLine(canvas, interval, bounds);
};

export const renderVolumeWeightedCandlestick: PatternRenderer = (canvas, interval, bounds) => {
  const { open, close } = interval;
  const isBullish = close > open;

  function getStickColor(): string {
    const prev = interval.previous;
    const prev2 = prev.previous;
    const prev3 = prev2.previous;
    const prev4 = prev3.previous;
    let weight = 0;

    for (const { volume } of [ prev, prev2, prev3, prev4 ]) {
      if (interval.volume > volume) {
        weight++;
      }
    }

    return WeightedColors[weight][isBullish ? 0 : 1];
  }

  renderIntervalLine(canvas, interval, bounds);

  canvas.setColor(getStickColor());
  canvas.rect(getCandleRect(interval, bounds));
};