import { SymbolData, Interval } from '../server/types';

interface Point {
  x: number;
  y: number;
}

interface Rect extends Point {
  width: number;
  height: number;
}

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

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

function drawCandle({ open, close, high, low }: Interval, bounds: Rect): void {
  const dy = bounds.height / (high - low);
  const isGreen = close > open;
  const color = isGreen ? '#0f0' : '#f00';
  const candleTop = isGreen ? close : open;
  const candleBottom = isGreen ? open : close;
  const topWickHeight = (high - candleTop) * dy;
  const bottomWickHeight = (candleBottom - low) * dy;

  ctx.strokeStyle = ctx.fillStyle = color;

  rectangle({
    x: bounds.x,
    y: bounds.y + topWickHeight,
    width: bounds.width,
    height: Math.max(bounds.height - topWickHeight - bottomWickHeight, 1)
  });

  line(
    { x: bounds.x + bounds.width / 2, y: bounds.y },
    { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height }
  );
}

function drawIntervals({ intervals, range: { high, low } }: SymbolData): void {
  const dx = canvas.width / intervals.length;
  const dy = canvas.height / (high - low);

  ctx.fillStyle = '#015';

  rectangle({
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height
  });

  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    const y = (high - interval.high) * dy;
    const height = (high - interval.low) * dy - y;

    const bounds: Rect = {
      x: dx * i,
      y,
      width: dx,
      height
    };

    drawCandle(interval, bounds);
  }
}

function drawMovingAverage({ movingAverage, range: { high, low } }: SymbolData): void {
  const dx = canvas.width / movingAverage.length;
  const dy = canvas.height / Math.abs(high - low);

  ctx.strokeStyle = '#0ff';
  ctx.lineWidth = 2;

  for (let i = 0; i < movingAverage.length; i++) {
    const previousIndex = i > 0 ? i - 1 : i;
    const previousAverage = movingAverage[previousIndex];
    const average = movingAverage[i];

    line(
      { x: previousIndex * dx + dx / 2, y: (high - previousAverage) * dy },
      { x: i * dx + dx / 2, y: (high - average) * dy }
    );
  }
}

export function plotData(data: SymbolData): void {
  drawIntervals(data);
  drawMovingAverage(data);
}