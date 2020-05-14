import { SymbolData, Interval } from '../server/types';

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

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function getRange(intervals: Interval[]): Range {
  return {
    low: Math.min(...intervals.map(({ low }) => low)),
    high: Math.max(...intervals.map(({ high }) => high))
  };
}

function line(start: Point, end: Point): void {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function rectangle({ x, y, width, height }: Rect): void {
  ctx.beginPath();
  ctx.rect(x, y, width, height);
  ctx.fill();
}

function circle(point: Point, radius: number, color: string): void {
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCandlestick({ open, close, high, low }: Interval, bounds: Rect, shouldShowCandle: boolean): void {
  const dy = bounds.height / (high - low);
  const isGreen = close > open;
  const color = isGreen ? '#0f0' : '#f00';
  const candleTop = isGreen ? close : open;
  const candleBottom = isGreen ? open : close;
  const topWickHeight = (high - candleTop) * dy;
  const bottomWickHeight = (candleBottom - low) * dy;

  ctx.strokeStyle = ctx.fillStyle = color;

  if (shouldShowCandle) {
    rectangle({
      x: bounds.x,
      y: bounds.y + topWickHeight,
      width: bounds.width,
      height: Math.max(bounds.height - topWickHeight - bottomWickHeight, 1)
    });
  }

  line(
    { x: bounds.x + bounds.width / 2, y: bounds.y },
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
  );
}

function drawIntervals({ intervals }: SymbolData, scale: number = 1.0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const step = Math.max(intervals.length / canvas.width, 1);

  if (step > 2) {
    return;
  }

  ctx.save();

  ctx.globalAlpha = 2 - step;

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
  }

  ctx.restore();
}

function drawMovingAverage({ intervals, movingAverage }: SymbolData, scale: number = 1.0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / movingAverage.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;

  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;

  for (let i = 0; i < movingAverage.length; i++) {
    const previousIndex = i > 0 ? i - 1 : i;
    const previousAverage = movingAverage[previousIndex];
    const average = movingAverage[i];

    line(
      { x: previousIndex * dx + dx / 2, y: (high - previousAverage) * dy + offset },
      { x: i * dx + dx / 2, y: (high - average) * dy + offset }
    );
  }
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

    circle(point, 8, '#000');
    circle(point, 5, '#0f0');
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

    circle(point, 8, '#000');
    circle(point, 5, '#f00');
  }
}

function drawVolume(intervals: Interval[]): void {
  const dx = canvas.width / intervals.length;
  const highestVolume = Math.max(...intervals.map(({ volume }) => volume));
  const step = Math.max(intervals.length / canvas.width, 1);

  if (step > 1.5) {
    return;
  }

  ctx.save();

  ctx.globalAlpha = 1.5 - step;

  for (let i = 0; i < intervals.length; i++) {
    const { volume, open, close } = intervals[i];
    const height = volume / highestVolume * 100;

    ctx.fillStyle = close > open ? '#0f0' : '#f00';

    rectangle({
      x: dx * i,
      y: canvas.height - height,
      width: dx,
      height
    });
  }

  ctx.restore();
}

export function plotData(data: SymbolData, leftCutoff: number = 0, rightCutoff: number = 0): void {
  ctx.fillStyle = '#015';

  rectangle({
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
  });

  const scale = 0.9;
  const start = leftCutoff;
  const end = data.intervals.length - rightCutoff;

  data = {
    ...data,
    intervals: data.intervals.slice(start, end),
    movingAverage: data.movingAverage.slice(start, end)
  };

  drawIntervals(data, scale);
  drawMovingAverage(data, scale);
  drawReversals(data, scale, leftCutoff);
  drawVolume(data.intervals);
}