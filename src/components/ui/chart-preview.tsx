
import React from 'react';
import { Group } from '@visx/group';
import { BarGroup } from '@visx/shape';
import { AxisBottom, AxisLeft } from '@visx/axis';
import { scaleBand, scaleLinear, scaleOrdinal } from '@visx/scale';

interface DataPoint {
  category: string;
  values: {
    key: string;
    value: number;
  }[];
}

interface BarChartProps {
  width: number;
  height: number;
  data: DataPoint[];
  keys: string[];
  margin?: { top: number; right: number; bottom: number; left: number };
}

export default function ChartPreview({
  width,
  height,
  data,
  keys,
  margin = { top: 40, right: 40, bottom: 40, left: 40 },
}: BarChartProps) {
  // Bounds
  const xMax = width - margin.left - margin.right;
  const yMax = height - margin.top - margin.bottom;

  // Scales
  const xScale = scaleBand<string>({
    domain: data.map((d) => d.category),
    padding: 0.2,
  });
  xScale.rangeRound([0, xMax]);

  const innerScale = scaleBand<string>({
    domain: keys,
    padding: 0.1,
  });
  innerScale.rangeRound([0, xScale.bandwidth()]);

  const colorScale = scaleOrdinal<string, string>({
    domain: keys,
    range: ['#6E59A5', '#9b87f5', '#D6BCFA', '#E5DEFF'],
  });

  const yScale = scaleLinear<number>({
    domain: [
      0,
      Math.max(...data.flatMap((d) => d.values.map((v) => v.value))),
    ],
  });
  yScale.range([yMax, 0]);

  return (
    <svg width={width} height={height}>
      <Group top={margin.top} left={margin.left}>
        <BarGroup
          data={data}
          keys={keys}
          height={yMax}
          x0={(d) => d.category}
          x0Scale={xScale}
          x1Scale={innerScale}
          yScale={yScale}
          color={colorScale}
        >
          {(barGroups) =>
            barGroups.map((barGroup) => (
              <Group
                key={`bar-group-${barGroup.index}-${barGroup.x0}`}
                left={barGroup.x0}
              >
                {barGroup.bars.map((bar) => (
                  <rect
                    key={`bar-group-bar-${barGroup.index}-${bar.index}-${bar.value}-${bar.key}`}
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    fill={bar.color}
                    rx={4}
                    onClick={() => {
                      console.log(`clicked: ${bar.key}`, bar.value);
                    }}
                  />
                ))}
              </Group>
            ))
          }
        </BarGroup>
        <AxisBottom
          top={yMax}
          scale={xScale}
          tickFormat={(value) => value}
          stroke="#ccc"
          tickStroke="#ccc"
          tickLabelProps={() => ({
            fill: '#666',
            fontSize: 12,
            textAnchor: 'middle',
          })}
        />
        <AxisLeft
          scale={yScale}
          stroke="#ccc"
          tickStroke="#ccc"
          tickLabelProps={() => ({
            fill: '#666',
            fontSize: 12,
            textAnchor: 'end',
            dx: '-0.25em',
            dy: '0.25em',
          })}
        />
      </Group>
    </svg>
  );
}
