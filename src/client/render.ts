import { SymbolData, Interval, IntervalType, IntervalPredicate } from '../server/types';
import Canvas from './Canvas';

interface Point {
  x: number;
  y: number;
}

interface Rect extends Point {
  width: number;
  height: number;
}

interface Range {
  high: number;
  low: number;
}

const canvas = new Canvas(document.querySelector('canvas'));

const Color = {
  RED: '#f00',
  GREEN: '#0f0',
  BACKGROUND: '#000',
  GRID_LINE: '#222',
  MOMENTUM_LINE: '#a0f',
  WHITE: '#fff',
  BLACK: '#000'
};

function getRange(intervals: Interval[]): Range {
  return {
    low: Math.min(...intervals.map(({ low }) => low)),
    high: Math.max(...intervals.map(({ high }) => high))
  };
}

function padRight(string: string, pad: string, limit: number): string {
  while (string.length < limit) {
    string += pad;
  }

  return string;
}

function getDollarValue(number: number): string {
  let [ dollars, cents = '' ] = `${Math.round(number * 100) / 100}`.split('.');

  return `$${dollars}.${padRight(cents, '0', 2)}`;
}

function isLaterYear(a: Date, b: Date): boolean {
  return a.getFullYear() > b.getFullYear();
}

function isLaterDay(a: Date, b: Date): boolean {
  return (
    a.getDate() > b.getDate() ||
    a.getMonth() > b.getMonth() ||
    a.getFullYear() > b.getFullYear()
  );
}

function drawCandlestick({ open, close, high, low }: Interval, bounds: Rect, shouldShowCandle: boolean): void {
  const dy = bounds.height / (high - low);
  const isGreen = close > open;
  const color = isGreen ? Color.GREEN : Color.RED;
  const candleTop = isGreen ? close : open;
  const candleBottom = isGreen ? open : close;
  const topWickHeight = (high - candleTop) * dy;
  const bottomWickHeight = (candleBottom - low) * dy;

  canvas.setColor(color);

  if (shouldShowCandle) {
    canvas.rect({
      x: bounds.x,
      y: bounds.y + topWickHeight,
      width: bounds.width,
      height: Math.max(bounds.height - topWickHeight - bottomWickHeight, 1)
    });
  }

  canvas.line({
    from: { x: bounds.x + bounds.width / 2, y: bounds.y },
    to: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
  });
}

function drawGridLines({ intervals, type }: SymbolData, scale: number = 1.0, mouseY: number): void {
  const dx = canvas.width / intervals.length;
  const offset = canvas.height * (1 - scale) * 0.5;
  const canvasMouseY = mouseY - canvas.bounds.top;

  const dividerPredicate: IntervalPredicate = type === IntervalType.INTRADAY
    ? (previousInterval, nextInterval) => isLaterDay(new Date(nextInterval.time), new Date(previousInterval.time))
    : (previousInterval, nextInterval) => isLaterYear(new Date(nextInterval.time), new Date(previousInterval.time));

  const getDividerLabel = type === IntervalType.INTRADAY
    ? ({ time }: Interval) => `${new Date(time).getMonth() + 1}/${new Date(time).getDate()}`
    : ({ time }: Interval) => `${new Date(time).getFullYear()}`;

  canvas.setColor('#666');
  canvas.line({ from: { x: 0, y: canvasMouseY }, to: { x: canvas.width, y: canvasMouseY } });

  canvas.setColor(Color.GRID_LINE);
  canvas.line({ from: { x: 0, y: offset }, to: { x: canvas.width, y: offset } });
  canvas.line({ from: { x: 0, y: canvas.height / 2 }, to: { x: canvas.width, y: canvas.height / 2 } });
  canvas.line({ from: { x: 0, y: canvas.height - offset }, to: { x: canvas.width, y: canvas.height - offset } });

  for (let i = 1; i < intervals.length; i++) {
    const previousInterval = intervals[i - 1];
    const interval = intervals[i];

    if (dividerPredicate(previousInterval, interval)) {
      canvas.line({ from: { x: i * dx, y: 0 }, to: { x: i * dx, y: canvas.height } });
      canvas.text('14px Arial', Color.WHITE, getDividerLabel(interval), { x: i * dx, y: 20 });
    }
  }
}

function drawIntervals({ intervals }: SymbolData, scale: number = 1.0, mouseY: number): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const step = Math.max(intervals.length / canvas.width, 1);
  const canvasMouseY = mouseY - canvas.bounds.top;

  if (step > 2) {
    return;
  }

  canvas.setAlpha(2 - step);

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const y = (high - interval.high) * dy + offset;
    const height = (high - interval.low) * dy + offset - y;

    const bounds: Rect = {
      x: dx * i,
      y,
      width: dx,
      height
    };

    drawCandlestick(interval, bounds, /* shouldShowCandle */ step === 1);

    if (y < canvasMouseY && y + height > canvasMouseY) {
      canvas.setColor(Color.WHITE);
      canvas.line({ from: { x: bounds.x, y: canvasMouseY }, to: { x: bounds.x + bounds.width, y: canvasMouseY } });
    }
  }

  canvas.setAlpha(1.0);
}

function drawMovingAverages({ intervals, shortMovingAverage, longMovingAverage }: SymbolData, scale: number = 1.0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;

  function drawMovingAverage(movingAverage: number[], color: string): void {
    canvas.setColor(color);
  
    for (let i = 0; i < movingAverage.length; i++) {
      const previousIndex = i > 0 ? i - 1 : i;
      const previousAverage = movingAverage[previousIndex];
      const average = movingAverage[i];

      canvas.line({
        from: { x: previousIndex * dx + dx / 2, y: (high - previousAverage) * dy + offset },
        to: { x: i * dx + dx / 2, y: (high - average) * dy + offset }
      });
    }
  }

  drawMovingAverage(shortMovingAverage, '#0ff');
  drawMovingAverage(longMovingAverage, '#ff0');
}

function drawReversals({ intervals, peaks, dips }: SymbolData, scale: number = 1.0, leftCutoff: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;

  for (const peak of peaks) {
    const index = peak - leftCutoff;
    const interval = intervals[index];

    if (!interval) {
      continue;
    }

    const point: Point = {
      x: index * dx + dx / 2,
      y: (high - interval.high) * dy + offset
    };

    canvas.setColor(Color.BLACK);
    canvas.circle({ x: point.x, y: point.y, radius: 8 });
    canvas.setColor(Color.GREEN);
    canvas.circle({ x: point.x, y: point.y, radius: 6 });
  }

  for (const dip of dips) {
    const index = dip - leftCutoff;
    const interval = intervals[index];

    if (!interval) {
      continue;
    }

    const point: Point = {
      x: index * dx + dx / 2,
      y: (high - interval.low) * dy + offset
    };

    canvas.setColor(Color.BLACK);
    canvas.circle({ x: point.x, y: point.y, radius: 8 });
    canvas.setColor(Color.RED);
    canvas.circle({ x: point.x, y: point.y, radius: 6 });
  }
}

function drawPredictions({ intervals, predictedDips, predictedPeaks }: SymbolData, scale: number = 1.0, leftCutoff: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const lineLength = 50;

  for (const peak of predictedPeaks) {
    const index = peak - leftCutoff;
    const interval = intervals[index];

    if (!interval) {
      continue;
    }

    const average = (interval.high + interval.low) / 2;

    const point: Point = {
      x: index * dx + dx / 2,
      y: (high - average) * dy + offset
    };

    canvas.setColor(Color.BLACK);
    canvas.circle({ x: point.x, y: point.y, radius: 8 });
    canvas.setColor(Color.RED);
    canvas.line({ from: point, to: { x: point.x + lineLength, y: point.y + lineLength } });
    canvas.setColor('#fa0');
    canvas.circle({ x: point.x, y: point.y, radius: 6 });
  }

  for (const dip of predictedDips) {
    const index = dip - leftCutoff;
    const interval = intervals[index];

    if (!interval) {
      continue;
    }

    const average = (interval.high + interval.low) / 2;

    const point: Point = {
      x: index * dx + dx / 2,
      y: (high - average) * dy + offset
    };


    canvas.setColor(Color.BLACK);
    canvas.circle({ x: point.x, y: point.y, radius: 8 });
    canvas.setColor(Color.GREEN);
    canvas.line({ from: point, to: { x: point.x + lineLength, y: point.y - lineLength } });
    canvas.setColor('#0fa');
    canvas.circle({ x: point.x, y: point.y, radius: 6 });
  }
}

function drawVolume(intervals: Interval[]): void {
  const dx = canvas.width / intervals.length;
  const highestVolume = Math.max(...intervals.map(({ volume }) => volume));
  const step = Math.max(intervals.length / canvas.width, 1);

  if (step > 1.5) {
    return;
  }

  canvas.setAlpha(1.5 - step);

  for (let i = 0; i < intervals.length; i++) {
    const { volume, open, close } = intervals[i];
    const height = volume / highestVolume * 100;

    canvas.setColor(close > open ? Color.GREEN : Color.RED);

    canvas.rect({
      x: i * dx,
      y: canvas.height - height,
      width: dx,
      height
    });
  }

  canvas.setAlpha(1.0);
}

function drawMomentum(momentum: number[]): void {
  const height = 100;
  const high = Math.max(...momentum);
  const low = Math.min(...momentum);
  const range = high - low;
  const dy = height / range;
  const dx = canvas.width / momentum.length;
  const points: Point[] = [];

  for (let i = 0; i < momentum.length; i++) {
    points.push({
      x: dx + i * dx,
      y: canvas.height - height + (high - momentum[i]) * dy
    });
  }

  canvas.setColor(Color.MOMENTUM_LINE);
  canvas.multiline(points);
}

function drawDollarValues({ intervals }: SymbolData, scale: number, mouseY: number): void {
  const { high, low } = getRange(intervals);
  const offset = canvas.height * (1 - scale) * 0.5;
  const median = (high + low) / 2;
  const properHigh = median + (high - median) / scale;
  const properLow = median - (median - low) / scale;
  const mouseYRatio = (mouseY - canvas.bounds.top) / canvas.height;
  const mouseYPrice = Math.max(properLow + (properHigh - properLow) * (1 - mouseYRatio), 0);

  const font = '16px Arial';

  canvas.text(font, Color.WHITE, getDollarValue(high), { x: 10, y: offset + 6 });
  canvas.text(font, Color.WHITE, getDollarValue(median), { x: 10, y: canvas.height / 2 + 6 });
  canvas.text(font, Color.WHITE, getDollarValue(low), { x: 10, y: canvas.height - offset + 6 });
  canvas.text(font, Color.WHITE, getDollarValue(mouseYPrice), { x: 10, y: mouseYRatio * canvas.height + 6 });
}

export function plotData(data: SymbolData, leftCutoff: number = 0, rightCutoff: number = 0, mouseY: number = 0): void {
  canvas.clear(Color.BACKGROUND);

  const scale = 0.9;
  const start = leftCutoff;
  const end = data.intervals.length - rightCutoff;

  const visibleData = {
    ...data,
    momentum: data.momentum.slice(start, end),
    intervals: data.intervals.slice(start, end),
    shortMovingAverage: data.shortMovingAverage.slice(start, end),
    longMovingAverage: data.longMovingAverage.slice(start, end)
  };

  drawGridLines(visibleData, scale, mouseY);
  drawVolume(visibleData.intervals);
  drawIntervals(visibleData, scale, mouseY);
  drawMovingAverages(visibleData, scale);
  drawReversals(visibleData, scale, leftCutoff);
  drawPredictions(visibleData, scale, leftCutoff);
  drawMomentum(visibleData.momentum);
  drawDollarValues(visibleData, scale, mouseY);

  canvas.render();
}

export function plotDailyComposite({ intervals }: SymbolData): void {
  canvas.clear(Color.BACKGROUND);

  const dayGroupedIntervals = {};

  function plotSingleDay(intervals: Interval[]): void {
    const dailyHigh = Math.max(...intervals.map(({ high }) => high));
    const dailyLow = Math.min(...intervals.map(({ low }) => low));
    const dx = canvas.width / intervals.length;
    const dy = canvas.height / (dailyHigh - dailyLow);
    const points: Point[] = [];

    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];
      const { open } = interval;

      points.push({
        x: i * dx,
        y: canvas.height - dy * (dailyHigh - open)
      });
    }

    canvas.setColor(Color.GRID_LINE);
    canvas.multiline(points);
  }

  function plotAverageDay(): void {
    const averages: number[] = [];
    const dayKeys = Object.keys(dayGroupedIntervals);
    const INTERVALS_PER_DAY = 78;
    const scale = 0.5;

    function getAverage(numbers: number[]) {
      return numbers.reduce((total, n) => total + n, 0) / numbers.length;
    }

    for (let i = 0; i < INTERVALS_PER_DAY; i++) {
      const compositedValues: number[] = [];

      for (const key of dayKeys) {
        const interval: Interval = dayGroupedIntervals[key][i];

        compositedValues.push(interval?.open || compositedValues[compositedValues.length - 1]);
      }

      averages.push(getAverage(compositedValues));
    }

    const highestAverage = Math.max(...averages);
    const lowestAverage = Math.min(...averages);
    const dx = canvas.width / averages.length;
    const dy = canvas.height / (highestAverage - lowestAverage);
    const points: Point[] = [];

    for (let i = 0; i < averages.length; i++) {
      points.push({
        x: i * dx,
        y: canvas.height - dy * (highestAverage - averages[i]) * scale - canvas.height * (1 - scale) * 0.5
      });
    }

    canvas.setColor('#fa0');
    canvas.multiline(points);
  }

  for (const interval of intervals) {
    const date = new Date(interval.time);
    const groupKey = `${date.getMonth()}:${date.getDate()}:${date.getFullYear()}`;

    if (!dayGroupedIntervals[groupKey]) {
      dayGroupedIntervals[groupKey] = [];
    }

    dayGroupedIntervals[groupKey].push(interval);
  }

  Object.keys(dayGroupedIntervals).forEach(key => plotSingleDay(dayGroupedIntervals[key]));

  plotAverageDay();
  canvas.render();
}