import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

const CHART_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  USDT: "#26A17B",
};

export interface SeriesPoint {
  t: number;
  v: number;
}

export interface ChartSeries {
  id: string;
  label: string;
  color: string;
  data: SeriesPoint[];
}

interface CryptoPriceChartProps {
  series: ChartSeries[];
  visibleIds: string[];
  selectedPrice: string | null;
  isLoading?: boolean;
  compact?: boolean;
  onPress?: () => void;
  /** When false, hide the "PRICE GRAPH" and value header (e.g. for use inside modal with its own header) */
  showHeader?: boolean;
}

const PAD = 8;
const GRID_LINES = 5;

function buildSmoothPath(
  data: SeriesPoint[],
  width: number,
  height: number,
  pad: number,
  bottomY: number
): { path: string; areaPath: string; endX: number; endY: number } {
  if (!data.length) return { path: "", areaPath: "", endX: 0, endY: 0 };
  const w = width - 2 * pad;
  const h = height - 2 * pad;
  const minV = Math.min(...data.map((d) => d.v));
  const maxV = Math.max(...data.map((d) => d.v));
  const range = maxV - minV || 1;
  const n = data.length - 1;
  const points = data.map((d, i) => ({
    x: pad + (i / n) * w,
    y: pad + h - ((d.v - minV) / range) * h,
  }));

  let path = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    path += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  const last = points[points.length - 1];
  const areaPath = `${path} L ${last.x} ${bottomY} L ${pad} ${bottomY} Z`;
  return { path, areaPath, endX: last.x, endY: last.y };
}

export default function CryptoPriceChart({
  series,
  visibleIds,
  selectedPrice,
  isLoading = false,
  compact = true,
  onPress,
  showHeader = true,
}: CryptoPriceChartProps) {
  const chartHeight = compact ? 150 : 320;
  const chartWidth = 1200;
  const viewBoxHeight = 300;
  const viewBoxWidth = 1200;

  const paths = useMemo(() => {
    return series
      .filter((s) => visibleIds.includes(s.id) && s.data.length >= 2)
      .map((s) => {
        const { path, areaPath, endX, endY } = buildSmoothPath(
          s.data,
          viewBoxWidth,
          viewBoxHeight,
          PAD,
          viewBoxHeight
        );
        return {
          id: s.id,
          color: s.color,
          label: s.label,
          path,
          areaPath,
          endX,
          endY,
        };
      });
  }, [series, visibleIds]);

  const gridLines = useMemo(() => {
    const step = (viewBoxHeight - 2 * PAD) / (GRID_LINES - 1);
    return Array.from({ length: GRID_LINES }, (_, i) => PAD + i * step);
  }, []);

  const content = (
    <>
      {showHeader && (
        <View style={styles.header}>
          <View>
            <Text style={styles.label}>PRICE GRAPH</Text>
            <Text style={styles.value} numberOfLines={1}>
              {isLoading ? "Loading..." : selectedPrice ?? "Tap a coin to view"}
            </Text>
          </View>
        </View>
      )}

      <View style={[styles.chartWrap, { height: chartHeight }]}>
        <View style={StyleSheet.absoluteFill}>
          {gridLines.map((y, i) => (
            <View
              key={i}
              style={[
                styles.gridLine,
                { top: (y / viewBoxHeight) * chartHeight },
              ]}
            />
          ))}
        </View>
        <Svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          preserveAspectRatio="none"
          style={styles.svg}
        >
          <Defs>
            {paths.map((p) => (
              <LinearGradient
                key={`lg-${p.id}`}
                id={`grad-${p.id}`}
                x1="0%"
                y1="0%"
                x2="0%"
                y2="100%"
              >
                <Stop offset="0%" stopColor={p.color} stopOpacity={0.2} />
                <Stop offset="100%" stopColor={p.color} stopOpacity={0} />
              </LinearGradient>
            ))}
          </Defs>
          {paths.map((p) => (
            <React.Fragment key={p.id}>
              <Path
                d={p.areaPath}
                fill={`url(#grad-${p.id})`}
              />
              <Path
                d={p.path}
                fill="none"
                stroke={p.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Circle cx={p.endX} cy={p.endY} r={5} fill={p.color} />
            </React.Fragment>
          ))}
        </Svg>
      </View>

      <View style={styles.legend}>
        {series.map((s) => {
          const visible = visibleIds.includes(s.id);
          return (
            <View
              key={s.id}
              style={[
                styles.legendChip,
                visible && styles.legendChipVisible,
              ]}
            >
              <View style={[styles.legendDot, { backgroundColor: s.color }]} />
              <Text
                style={[
                  styles.legendText,
                  visible && styles.legendTextVisible,
                ]}
                numberOfLines={1}
              >
                {s.label}
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.card, compact && styles.cardCompact]}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {content}
      </TouchableOpacity>
    );
  }
  return <View style={[styles.card, compact && styles.cardCompact]}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardCompact: {
    padding: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#71717A",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 2,
  },
  chartWrap: {
    width: "100%",
    position: "relative",
    marginBottom: 8,
  },
  gridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.08)",
  },
  svg: {
    backgroundColor: "transparent",
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  legendChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    opacity: 0.6,
  },
  legendChipVisible: {
    backgroundColor: "#F3F4F6",
    opacity: 1,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#6B7280",
  },
  legendTextVisible: {
    color: "#1F2937",
    fontWeight: "600",
  },
});

export { CHART_COLORS };
