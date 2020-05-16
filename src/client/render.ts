import { SymbolData, Interval, IntervalType, IntervalPredicate } from '../server/types';

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

function drawBatched<T>(elements: T[], color: string, handler: (element: T) => void): void {
  ctx.fillStyle = color;

  ctx.beginPath();

  for (const element of elements) {
    handler(element);
  }

  ctx.fill();
}

function drawRectanglesBatched(rects: Rect[], color: string): void {
  drawBatched(rects, color, ({ x, y, width, height }) => ctx.rect(x, y, width, height));
}

function drawCirclesBatched(points: Point[], radius: number, color: string): void {
  drawBatched(points, color, ({ x, y }) => {
    ctx.moveTo(x, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  });
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

function drawGridLines({ intervals, type }: SymbolData, scale: number = 1.0, mouseY: number): void {
  const dx = canvas.width / intervals.length;
  const offset = canvas.height * (1 - scale) * 0.5;
  const canvasMouseY = mouseY - canvas.getBoundingClientRect().top;

  const dividerPredicate: IntervalPredicate = type === IntervalType.INTRADAY
    ? (previousInterval, nextInterval) => isLaterDay(new Date(nextInterval.time), new Date(previousInterval.time))
    : (previousInterval, nextInterval) => isLaterYear(new Date(nextInterval.time), new Date(previousInterval.time));

  const getDividerLabel = type === IntervalType.INTRADAY
    ? ({ time }: Interval) => `${new Date(time).getMonth() + 1}/${new Date(time).getDate()}`
    : ({ time }: Interval) => `${new Date(time).getFullYear()}`;

  ctx.strokeStyle = '#237';
  ctx.lineWidth = 1;

  line({ x: 0, y: offset }, { x: canvas.width, y: offset });
  line({ x: 0, y: canvas.height / 2 }, { x: canvas.width, y: canvas.height / 2 });
  line({ x: 0, y: canvas.height - offset }, { x: canvas.width, y: canvas.height - offset });
  line({ x: 0, y: canvasMouseY }, { x: canvas.width, y: canvasMouseY });

  for (let i = 1; i < intervals.length; i++) {
    const previousInterval = intervals[i - 1];
    const interval = intervals[i];

    if (dividerPredicate(previousInterval, interval)) {
      line({ x: i * dx, y: 0 }, { x: i * dx, y: canvas.height });

      ctx.font = '14px Arial';
      ctx.fillStyle = '#fff';

      ctx.fillText(getDividerLabel(interval), i * dx, 20);
    }
  }
}

function drawIntervals({ intervals }: SymbolData, scale: number = 1.0, mouseY: number): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const step = Math.max(intervals.length / canvas.width, 1);
  const canvasMouseY = mouseY - canvas.getBoundingClientRect().top;

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

    if (y < canvasMouseY && y + height > canvasMouseY) {
      ctx.strokeStyle = '#fff';

      line({ x: bounds.x, y: canvasMouseY }, { x: bounds.x + bounds.width, y: canvasMouseY });
    }
  }

  ctx.restore();
}

function drawMovingAverages({ intervals, movingAverage50, movingAverage100 }: SymbolData, scale: number = 1.0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;

  function drawMovingAverage(movingAverage: number[], color: string): void {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
  
    for (let i = 0; i < movingAverage.length; i++) {
      const previousIndex = i > 0 ? i - 1 : i;
      const previousAverage = movingAverage[previousIndex];
      const average = movingAverage[i];

      ctx.moveTo(previousIndex * dx + dx / 2, (high - previousAverage) * dy + offset);
      ctx.lineTo(i * dx + dx / 2, (high - average) * dy + offset);
    }

    ctx.stroke();
  }

  drawMovingAverage(movingAverage50, '#0ff');
  drawMovingAverage(movingAverage100, '#ff0');
}

function drawReversals({ intervals, peaks, dips }: SymbolData, scale: number = 1.0, leftCutoff: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;

  const peakPoints: Point[] = [];
  const dipPoints: Point[] = [];

  for (const peak of peaks) {
    const index = peak - leftCutoff;
    const interval = intervals[index];

    if (!interval) {
      continue;
    }

    peakPoints.push({
      x: index * dx + dx / 2,
      y: (high - interval.high) * dy + offset
    });
  }

  for (const dip of dips) {
    const index = dip - leftCutoff;
    const interval = intervals[index];

    if (!interval) {
      continue;
    }

    dipPoints.push({
      x: index * dx + dx / 2,
      y: (high - interval.low) * dy + offset
    });
  }

  drawCirclesBatched(peakPoints, 10, '#000');
  drawCirclesBatched(peakPoints, 7, '#0f0');

  drawCirclesBatched(dipPoints, 10, '#000');
  drawCirclesBatched(dipPoints, 7, '#f00');
}

function drawPredictions({ intervals, predictedDips, predictedPeaks }: SymbolData, scale: number = 1.0, leftCutoff: number = 0): void {
  const { high, low } = getRange(intervals);
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low) * scale;
  const offset = canvas.height * (1 - scale) * 0.5;
  const peakPoints: Point[] = [];
  const dipPoints: Point[] = [];

  ctx.lineWidth = 3;

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

    peakPoints.push(point);

    ctx.strokeStyle = '#f00';

    line(point, { x: point.x + 100, y: point.y + 100 });
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

    dipPoints.push(point);

    ctx.strokeStyle = '#0f0';

    line(point, { x: point.x + 100, y: point.y - 100 });
  }

  drawCirclesBatched(peakPoints, 10, '#000');
  drawCirclesBatched(peakPoints, 7, '#0ff');

  drawCirclesBatched(dipPoints, 10, '#000');
  drawCirclesBatched(dipPoints, 7, '#ff0');
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

  const greenRects: Rect[] = [];
  const redRects: Rect[] = [];

  for (let i = 0; i < intervals.length; i++) {
    const { volume, open, close } = intervals[i];
    const height = volume / highestVolume * 100;
    const target = close > open ? greenRects : redRects;

    target.push({
      x: dx * i,
      y: canvas.height - height,
      width: dx,
      height
    });
  }

  drawRectanglesBatched(redRects, '#f00');
  drawRectanglesBatched(greenRects, '#0f0');

  ctx.restore();
}

function drawDollarValues({ intervals }: SymbolData, scale: number, mouseY: number): void {
  const { high, low } = getRange(intervals);
  const offset = canvas.height * (1 - scale) * 0.5;
  const median = (high + low) / 2;
  const properHigh = median + (high - median) / scale;
  const properLow = median - (median - low) / scale;
  const mouseYRatio = (mouseY - canvas.getBoundingClientRect().top) / canvas.height;
  const mouseYPrice = Math.max(properLow + (properHigh - properLow) * (1 - mouseYRatio), 0);

  ctx.font = '18px Arial';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#126';

  ctx.fillText(getDollarValue(high), 10, offset + 6);
  ctx.fillText(getDollarValue(median), 10, canvas.height / 2 + 6);
  ctx.fillText(getDollarValue(low), 10, canvas.height - offset + 6);
  ctx.fillText(getDollarValue(mouseYPrice), 10, mouseYRatio * canvas.height + 6);
}

export function plotData(data: SymbolData, leftCutoff: number = 0, rightCutoff: number = 0, mouseY: number = 0): void {
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

  const visibleData = {
    ...data,
    intervals: data.intervals.slice(start, end),
    movingAverage50: data.movingAverage50.slice(start, end),
    movingAverage100: data.movingAverage100.slice(start, end)
  };

  drawGridLines(visibleData, scale, mouseY);
  drawVolume(visibleData.intervals);
  drawIntervals(visibleData, scale, mouseY);
  drawMovingAverages(visibleData, scale);
  drawReversals(visibleData, scale, leftCutoff);
  drawPredictions(visibleData, scale, leftCutoff);
  drawDollarValues(visibleData, scale, mouseY);
}