import Canvas from './Canvas';
import { SymbolData, Interval, IntervalType, IntervalPredicate, EnhancedSymbolData, Point, Rect, Range } from '../types';
import { renderIntervalLine, renderCandlestick, renderVolumeWeightedCandlestick } from './patterns';
import { getIntervalAverage } from './utilities';

const canvas = new Canvas(document.querySelector('canvas'));

const Color = {
  RED: '#f00',
  GREEN: '#0f0',
  BACKGROUND: '#000',
  GRID_LINE: '#222',
  MOMENTUM_LINE: '#a0f',
  WHITE: '#fff',
  BLACK: '#000',
  VWAP_LINE: '#f0a'
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

function drawGridLines({ intervals, type }: SymbolData, scale: number = 1.0, mouseX: number, mouseY: number): void {
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
  canvas.line({ from: { x: mouseX - canvas.bounds.left, y: 0 }, to: { x: mouseX - canvas.bounds.left, y: canvas.height } });
  canvas.line({ from: { x: 0, y: canvasMouseY }, to: { x: canvas.width, y: canvasMouseY } });

  canvas.setColor(Color.GRID_LINE);
  canvas.line({ from: { x: 0, y: offset }, to: { x: canvas.width, y: offset } });
  canvas.line({ from: { x: 0, y: canvas.height / 2 }, to: { x: canvas.width, y: canvas.height / 2 } });
  canvas.line({ from: { x: 0, y: canvas.height - offset }, to: { x: canvas.width, y: canvas.height - offset } });

  canvas.text('14px Arial', Color.WHITE, getDividerLabel(intervals[0]), { x: 5, y: 20 });

  for (let i = 1; i < intervals.length; i++) {
    const previousInterval = intervals[i - 1];
    const interval = intervals[i];

    if (dividerPredicate(previousInterval, interval)) {
      canvas.line({ from: { x: i * dx, y: 0 }, to: { x: i * dx, y: canvas.height } });
      canvas.text('14px Arial', Color.WHITE, getDividerLabel(interval), { x: i * dx, y: 20 });
    }
  }
}

function drawIntervals(intervals: Interval[], scale: number = 1.0, buffer: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = (canvas.width - buffer) / Math.max(intervals.length, 50);
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const step = Math.max(intervals.length / canvas.width, 1);
  const render = step === 1 ? renderVolumeWeightedCandlestick : renderIntervalLine;

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

    render(canvas, interval, bounds);
  }

  canvas.setAlpha(1.0);
}

function drawMovingAverages({ intervals, shortMovingAverage, longMovingAverage }: EnhancedSymbolData, scale: number = 1.0): void {
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

function drawReversals({ intervals, peaks, dips }: EnhancedSymbolData, scale: number = 1.0, leftCutoff: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;

  function plotReversals(reversals: number[], color: string, offsetDeterminant: (interval: Interval) => number): void {
    for (const reversal of reversals) {
      const index = reversal - leftCutoff;
      const interval = intervals[index];
  
      if (!interval) {
        continue;
      }
  
      const point: Point = {
        x: index * dx + dx / 2,
        y: offsetDeterminant(interval)
      };
  
      canvas.setColor(Color.BLACK);
      canvas.circle({ x: point.x, y: point.y, radius: 8 });
      canvas.setColor(color);
      canvas.circle({ x: point.x, y: point.y, radius: 6 });
    }
  }

  plotReversals(peaks, Color.GREEN, interval => (high - interval.high) * dy + offset - 10);
  plotReversals(dips, Color.RED, interval => (high - interval.low) * dy + offset + 10);
}

function drawVolume(intervals: Interval[], buffer: number = 0): void {
  const dx = (canvas.width - buffer) / Math.max(intervals.length, 50);
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

function drawVwap({ intervals, vwap }: EnhancedSymbolData, scale: number = 1.0, buffer: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = (canvas.width - buffer) / Math.max(vwap.length, 50);
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const points: Point[] = [];

  canvas.setColor(Color.VWAP_LINE);

  for (let i = 0; i < vwap.length; i++) {
    const p = vwap[i];

    points.push({
      x: i * dx + dx / 2,
      y: (high - p) * dy + offset
    });
  }

  canvas.multiline(points);
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

function drawDollarValues({ intervals }: SymbolData, scale: number, mouseX: number, mouseY: number): void {
  const { high, low } = getRange(intervals);
  const offset = canvas.height * (1 - scale) * 0.5;
  const median = (high + low) / 2;
  const properHigh = median + (high - median) / scale;
  const properLow = median - (median - low) / scale;
  const mouseXRatio = (mouseX - canvas.bounds.left) / canvas.width;
  const mouseXIntervalIndex = Math.floor(intervals.length * mouseXRatio);
  const mouseXInterval = intervals[mouseXIntervalIndex] || intervals[0];
  const mouseXPrice = getIntervalAverage(mouseXInterval);
  const mouseYRatio = (mouseY - canvas.bounds.top) / canvas.height;
  const mouseYPrice = Math.max(properLow + (properHigh - properLow) * (1 - mouseYRatio), 0);
  const mouseXTime = new Date(mouseXInterval.time).toLocaleString();

  const font16 = '16px Arial';
  const font14 = '14px Arial';

  canvas.text(font16, Color.WHITE, getDollarValue(high), { x: 10, y: offset + 6 });
  canvas.text(font16, Color.WHITE, getDollarValue(median), { x: 10, y: canvas.height / 2 + 6 });
  canvas.text(font16, Color.WHITE, getDollarValue(low), { x: 10, y: canvas.height - offset + 6 });
  canvas.text(font14, Color.WHITE, `${getDollarValue(mouseXPrice)} (${mouseXTime})`, { x: mouseXRatio * canvas.width + 6, y: offset + 5 });
  canvas.text(font14, Color.WHITE, getDollarValue(mouseYPrice), { x: 10, y: mouseYRatio * canvas.height + 5 });
}

export function plotData(data: EnhancedSymbolData, leftCutoff: number = 0, rightCutoff: number = 0, mouseX: number = 0, mouseY: number = 0): void {
  canvas.clear(Color.BACKGROUND);

  const { intervals, vwap, momentum, shortMovingAverage, longMovingAverage } = data;
  const scale = 0.9;
  const start = leftCutoff;
  const end = intervals.length - rightCutoff;

  const visibleData = {
    ...data,
    vwap: vwap.slice(start, end),
    momentum: momentum.slice(start, end),
    intervals: intervals.slice(start, end),
    shortMovingAverage: shortMovingAverage.slice(start, end),
    longMovingAverage: longMovingAverage.slice(start, end)
  };

  drawGridLines(visibleData, scale, mouseX, mouseY);
  drawVolume(visibleData.intervals);
  drawIntervals(visibleData.intervals, scale);
  drawMovingAverages(visibleData, scale);
  drawReversals(visibleData, scale, leftCutoff);
  drawVwap(visibleData, scale);
  drawMomentum(visibleData.momentum);
  drawDollarValues(visibleData, scale, mouseX, mouseY);

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
    const dayGroups = dayKeys.map(key => dayGroupedIntervals[key]);
    const intervalsPerDay = Math.max(...dayGroups.map(group => group.length));
    const scale = 0.5;

    function getAverage(numbers: number[]) {
      return numbers.reduce((total, n) => total + n, 0) / numbers.length;
    }

    for (let i = 0; i < intervalsPerDay; i++) {
      const compositedValues: number[] = [];

      for (const key of dayKeys) {
        const intervals: Interval[] = dayGroupedIntervals[key];
        const interval: Interval = intervals[i] || intervals[intervals.length - 1];

        compositedValues.push(interval.open);
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

export function plotPartialDay(intervals: Interval[], vwap: number[], indexLimit: number): void {
  canvas.clear(Color.BACKGROUND);

  const visibleIntervals = intervals.slice(0, indexLimit);
  const visibleVwap = vwap.slice(0, indexLimit);

  drawIntervals(visibleIntervals, 0.8, 200);
  drawVwap({ intervals: visibleIntervals, vwap: visibleVwap } as EnhancedSymbolData, 0.8, 200);
  drawVolume(visibleIntervals, 200);

  canvas.render();
}