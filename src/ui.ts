declare var axios;

interface Range {
  high: number;
  low: number;
}

interface StockData {
  range: Range;
  shares: number[];
  prediction: number[];
}

interface Point {
  x: number;
  y: number;
}

const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');

canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

function plot(data: StockData) {
  const { range: { high, low }, shares } = data;
  const dy = canvas.height / Math.abs(high - low);
  const dx = canvas.width / shares.length;

  ctx.strokeStyle = '#f00';
  ctx.fillStyle = '#f00';

  const points: Point[] = shares.map((share, index) => ({
    x: index * dx,
    y: (high - share) * dy
  }));

  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i];

    const start: Point = {
      x: i === 0 ? x : points[i - 1].x,
      y: i === 0 ? y : points[i - 1].y
    };

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
}

async function main() {
  const { data } = await axios.get('/api/test');

  plot(data);
}

main();