import { useMemo, useState } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { DailySales } from '../../types';
import { formatMzn } from '../../utils/currency';

interface SalesTrendChartProps {
  data: DailySales[];
}

const WEEKDAY_LABELS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const VIEW_W = 700;
const VIEW_H = 260;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 12;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;
const BAR_MAX_WIDTH = 24;
const BAR_RADIUS = 4;

function niceMax(value: number): number {
  if (value <= 0) return 100;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  let niceNormalized: number;
  if (normalized <= 1) niceNormalized = 1;
  else if (normalized <= 2) niceNormalized = 2;
  else if (normalized <= 5) niceNormalized = 5;
  else niceNormalized = 10;
  return niceNormalized * magnitude;
}

function formatAxisValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
  return `${Math.round(value)}`;
}

export default function SalesTrendChart({ data }: SalesTrendChartProps) {
  const theme = useTheme();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const chartWidth = VIEW_W - PADDING_LEFT - PADDING_RIGHT;
  const chartHeight = VIEW_H - PADDING_TOP - PADDING_BOTTOM;

  const maxValue = useMemo(() => {
    const rawMax = Math.max(0, ...data.map((d) => d.totalAmount));
    return niceMax(rawMax);
  }, [data]);

  const gridLines = [0, 0.5, 1];
  const barSlotWidth = data.length > 0 ? chartWidth / data.length : chartWidth;
  const barWidth = Math.min(BAR_MAX_WIDTH, barSlotWidth * 0.55);

  const barColor = theme.palette.primary.main;
  const gridColor = theme.palette.divider;
  const axisTextColor = theme.palette.text.secondary;

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoveredCenterXPct =
    hoverIndex !== null
      ? ((PADDING_LEFT + barSlotWidth * (hoverIndex + 0.5)) / VIEW_W) * 100
      : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: '100%' }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1.5 }}>
        Vendas dos últimos 7 dias
      </Typography>
      <Box sx={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          height="auto"
          style={{ display: 'block', overflow: 'visible' }}
          role="img"
          aria-label="Gráfico de barras com o total de vendas por dia nos últimos 7 dias"
        >
          {gridLines.map((fraction) => {
            const y = PADDING_TOP + chartHeight * (1 - fraction);
            return (
              <g key={fraction}>
                <line
                  x1={PADDING_LEFT}
                  x2={VIEW_W - PADDING_RIGHT}
                  y1={y}
                  y2={y}
                  stroke={gridColor}
                  strokeWidth={1}
                />
                <text
                  x={PADDING_LEFT - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={axisTextColor}
                >
                  {formatAxisValue(maxValue * fraction)}
                </text>
              </g>
            );
          })}

          {data.map((day, index) => {
            const barHeight = maxValue > 0 ? (day.totalAmount / maxValue) * chartHeight : 0;
            const slotX = PADDING_LEFT + barSlotWidth * index;
            const barX = slotX + (barSlotWidth - barWidth) / 2;
            const barY = PADDING_TOP + chartHeight - barHeight;
            const isHovered = hoverIndex === index;
            const date = new Date(`${day.date}T00:00:00Z`);
            const weekdayLabel = WEEKDAY_LABELS[date.getUTCDay()];

            return (
              <g key={day.date}>
                <rect
                  x={slotX}
                  y={PADDING_TOP}
                  width={barSlotWidth}
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(index)}
                  onMouseLeave={() => setHoverIndex((current) => (current === index ? null : current))}
                  style={{ cursor: 'pointer', pointerEvents: 'all' }}
                />
                {barHeight > 0 && (
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={Math.max(barHeight, 1)}
                    rx={BAR_RADIUS}
                    ry={BAR_RADIUS}
                    fill={barColor}
                    opacity={isHovered ? 1 : 0.85}
                    style={{ pointerEvents: 'none', transition: 'opacity 0.1s ease' }}
                  />
                )}
                {/* square off the bottom corners so only the data-end is rounded */}
                {barHeight > BAR_RADIUS && (
                  <rect
                    x={barX}
                    y={PADDING_TOP + chartHeight - BAR_RADIUS}
                    width={barWidth}
                    height={BAR_RADIUS}
                    fill={barColor}
                    opacity={isHovered ? 1 : 0.85}
                    style={{ pointerEvents: 'none' }}
                  />
                )}
                <text
                  x={slotX + barSlotWidth / 2}
                  y={VIEW_H - PADDING_BOTTOM + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fill={axisTextColor}
                >
                  {weekdayLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {hovered && (
          <Box
            sx={{
              position: 'absolute',
              left: `${hoveredCenterXPct}%`,
              top: 0,
              transform: 'translate(-50%, -100%)',
              bgcolor: 'grey.900',
              color: 'common.white',
              px: 1.25,
              py: 0.75,
              borderRadius: 1,
              fontSize: 12,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              boxShadow: 3,
              zIndex: 1,
            }}
          >
            <Box sx={{ fontWeight: 600 }}>{formatMzn(hovered.totalAmount)}</Box>
            <Box sx={{ opacity: 0.75, fontSize: 11 }}>
              {new Date(`${hovered.date}T00:00:00Z`).toLocaleDateString('pt-MZ', {
                day: '2-digit',
                month: '2-digit',
              })}
            </Box>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
