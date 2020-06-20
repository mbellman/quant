interface Point {
  x: number;
  y: number;
}

interface Line {
  from: Point;
  to: Point;
}

interface Rect extends Point {
  width: number;
  height: number;
}

interface Circle extends Point {
  radius: number;
}

interface Text extends Point {
  font: string;
  color: string;
  message: string;
}

enum Shape {
  LINE,
  RECTANGLE,
  CIRCLE
}

interface ShapeQueue {
  lines: Line[];
  rects: Rect[];
  circles: Circle[];
}

class RenderQueue {
  private color: string;
  private ctx: CanvasRenderingContext2D;
  private shapeQueueMap: Record<string, ShapeQueue> = {};

  private get shapeQueue(): ShapeQueue {
    return this.shapeQueueMap[this.color];
  }

  public constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;

    this.setColor('#000');
  }

  public flush(): void {
    Object.keys(this.shapeQueueMap).forEach(color => {
      this.ctx.fillStyle = color;
      this.ctx.strokeStyle = color;

      const queue = this.shapeQueueMap[color];
      const { lines, circles, rects } = queue;

      this.drawBatched(lines, ({ from, to }) => {
        this.ctx.moveTo(from.x, from.y);
        this.ctx.lineTo(to.x, to.y);
      }, () => this.ctx.stroke());

      this.drawBatched(circles, ({ x, y, radius }) => {
        this.ctx.moveTo(x, y);
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
      }, () => this.ctx.fill());

      this.drawBatched(rects, ({ x, y, width, height }) => {
        this.ctx.rect(x, y, width, height);
      }, () => this.ctx.fill());
    });
  }

  public queueCircle(circle: Circle): void {
    this.shapeQueue.circles.push(circle);
  }

  public queueLine(line: Line): void {
    this.shapeQueue.lines.push(line);
  }

  public queueRect(rect: Rect): void {
    this.shapeQueue.rects.push(rect);
  }

  public setColor(color: string): void {
    if (!this.shapeQueueMap[color]) {
      this.shapeQueueMap[color] = {
        lines: [],
        rects: [],
        circles: []
      };
    }

    this.color = color;
  }

  private drawBatched<T>(shapes: T[], callback: (shape: T) => void, finish: () => void): void {
    this.ctx.beginPath();

    for (const shape of shapes) {
      callback(shape);
    }

    finish();
  }
}

export default class Canvas {
  private alpha: number = 1.0;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderQueueMap: Record<number, RenderQueue> = {};
  private textQueue: Text[] = [];

  public get bounds(): DOMRect {
    return this.canvas.getBoundingClientRect();
  }

  public get height(): number {
    return this.canvas.height;
  }

  public get width(): number {
    return this.canvas.width;
  }

  private get renderQueue(): RenderQueue {
    return this.renderQueueMap[this.alpha];
  }

  public constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.canvas.width = canvas.clientWidth;
    this.canvas.height = canvas.clientHeight;

    this.setAlpha(1.0);
  }
  
  public circle(circle: Circle): void {
    this.renderQueue.queueCircle(circle);
  }

  public clear(color: string): void {
    this.ctx.globalAlpha = 1.0;
    this.ctx.fillStyle = color;

    this.ctx.rect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fill();
  }

  public line(line: Line): void {
    this.renderQueue.queueLine(line);
  }

  public multiline(points: Point[]): void {
    for (let i = 1; i < points.length; i++) {
      const previous = points[i - 1];
      const current = points[i];

      this.line({
        from: previous,
        to: current
      });
    }
  }

  public rect(rect: Rect): void {
    this.renderQueue.queueRect(rect);
  }

  public render(): void {
    Object.keys(this.renderQueueMap)
      .sort((a, b) => Number(a) > Number(b) ? 1 : -1)
      .forEach(key => {
        const alpha = Number(key);

        this.ctx.globalAlpha = alpha;

        this.renderQueueMap[alpha].flush();
      });

    this.ctx.globalAlpha = 1.0;

    for (const { font, color, message, x, y } of this.textQueue) {
      this.ctx.font = font;
      this.ctx.fillStyle = color;

      this.ctx.fillText(message, x, y);
    }

    this.renderQueueMap = {};
    this.textQueue.length = 0;

    this.setAlpha(1.0);
  }

  public setAlpha(alpha: number): void {
    if (!this.renderQueueMap[alpha]) {
      this.renderQueueMap[alpha] = new RenderQueue(this.ctx);
    }

    this.alpha = alpha;
  }

  public setColor(color: string): void {
    this.renderQueue.setColor(color);
  }

  public text(font: string, color: string, message: string, { x, y }: Point): void {
    this.textQueue.push({
      font,
      color,
      message,
      x,
      y
    });
  }
}