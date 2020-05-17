import { Interval, IntervalPredicate, PriceTrend } from './types';

type TrendMatcher = [ (n: number) => boolean, PriceTrend ];

type LocalTrendMatcher = (far: PriceTrend, close: PriceTrend) => boolean;

const TREND_MATCHERS: TrendMatcher[] = [
  [ delta => Math.abs(delta) <= 0.001, PriceTrend.FLAT ],
  [ delta => delta > 0.05, PriceTrend.UPWARD_SPIKE ],
  [ delta => delta > 0.01, PriceTrend.UPWARD ],
  [ delta => delta <= -0.05, PriceTrend.DOWNWARD_SPIKE ],
  [ delta => delta < 0, PriceTrend.DOWNWARD ]
];

const isDownward = (trend: PriceTrend) => trend === PriceTrend.DOWNWARD || trend === PriceTrend.DOWNWARD_SPIKE;
const isUpward = (trend: PriceTrend) => trend === PriceTrend.UPWARD || trend === PriceTrend.UPWARD_SPIKE;

const LOCAL_TREND_MATCHERS: [LocalTrendMatcher, PriceTrend][] = [
  [ (far, close) => isDownward(far) && isDownward(close), PriceTrend.DOWNWARD ],
  [ (far, close) => isUpward(far) && isDownward(close), PriceTrend.DOWNWARD_REVERSAL ],
  [ (_, close) => close === PriceTrend.DOWNWARD_SPIKE, PriceTrend.DOWNWARD_SPIKE ],
  [ (far, close) => isUpward(far) && isUpward(close), PriceTrend.UPWARD ],
  [ (far, close) => isDownward(far) && isUpward(close), PriceTrend.UPWARD_REVERSAL ],
  [ (_, close) => close === PriceTrend.UPWARD_SPIKE , PriceTrend.UPWARD_SPIKE ]
];

function getAverage(numbers: number[]) {
  return numbers.reduce((total, n) => total + n, 0) / numbers.length;
}

function isReversal(intervals: Interval[], index: number, predicate: IntervalPredicate): boolean {
  const interval = intervals[index];

  const isImmediateReversal = [
    ...intervals.slice(index - 5, index - 1),
    ...intervals.slice(index + 1, index + 5)
  ].filter(Boolean).every(comparison => predicate(interval, comparison));

  const isLocalReversal = [
    ...intervals.slice(index - 25, index - 1),
    ...intervals.slice(index + 1, index + 25)
  ].filter(Boolean).filter(comparison => predicate(interval, comparison)).length > 45;

  return isImmediateReversal && isLocalReversal;
}

function getReversals(intervals: Interval[], predicate: IntervalPredicate): number[] {
  const reversals: number[] = [];

  for (let i = 1; i < intervals.length; i++) {
    if (isReversal(intervals, i, predicate)) {
      reversals.push(i);

      i += 10;
    }
  }

  return reversals;
}

function getPriceTrend(a: Interval, b: Interval): PriceTrend {
  const delta = 1 - a.open / b.close;

  for (const [ matcher, trend ] of TREND_MATCHERS) {
    if (matcher(delta)) {
      return trend;
    }
  }

  return PriceTrend.FLAT;
}

export function getMovingAverage(intervals: Interval[], limit: number): number[] {
  const intervalAverages = intervals.map(({ high, low }) => (high + low) / 2);

  return intervalAverages.reduce((movingAverage, _, index) => {
    const start = Math.max(index - limit, 0);
    const end = index + 1;
    const runningAverage = getAverage(intervalAverages.slice(start, end));

    movingAverage.push(runningAverage);

    return movingAverage;
  }, []);
}

export function getDips(intervals: Interval[]): number[] {
  return getReversals(intervals, (first, next) => first.low < next.low);
}

export function getPeaks(intervals: Interval[]): number[] {
  return getReversals(intervals, (first, next) => first.high > next.high);
}

export function getLocalPriceTrend(intervals: Interval[], index: number): PriceTrend {
  const interval = intervals[index];
  const closeSample = intervals[index - 4];
  const farSample = intervals[index - 15];
  const closeTrend = getPriceTrend(closeSample, interval);
  const farTrend = getPriceTrend(farSample, closeSample);

  for (const [ predicate, trend ] of LOCAL_TREND_MATCHERS) {
    if (predicate(farTrend, closeTrend)) {
      return trend;
    }
  }

  return PriceTrend.FLAT;
}