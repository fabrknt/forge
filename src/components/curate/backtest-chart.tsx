"use client";

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

interface DataPoint {
    date: string;
    [key: string]: string | number;
}

interface BacktestResult {
    poolId: string;
    project: string;
    symbol: string;
    dataPoints: {
        date: string;
        cumulativeValue: number;
    }[];
}

interface BacktestChartProps {
    results: BacktestResult[];
    initialAmount: number;
}

// Color palette for different pools
const COLORS = [
    "#22c55e", // green
    "#3b82f6", // blue
    "#f59e0b", // amber
    "#8b5cf6", // purple
    "#ec4899", // pink
];

// Format date for display
function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Format currency
function formatValue(value: number) {
    return `$${value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

function CustomTooltip({
    active,
    payload,
    label,
    results,
}: {
    active?: boolean;
    payload?: { color: string; name: string; value: number }[];
    label?: string;
    results: BacktestResult[];
}) {
    if (!active || !payload || !label) return null;

    return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-lg">
            <p className="text-slate-400 text-xs mb-2">{formatDate(label)}</p>
            {payload.map((entry, index) => {
                const result = results.find((r) => r.poolId === entry.name);
                return (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-slate-300 truncate max-w-[120px]">
                            {result?.project || entry.name}
                        </span>
                        <span className="text-white font-medium ml-auto">
                            {formatValue(entry.value)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export function BacktestChart({ results, initialAmount }: BacktestChartProps) {
    if (results.length === 0) {
        return (
            <div className="h-64 flex items-center justify-center text-slate-500">
                No data to display
            </div>
        );
    }

    // Merge all data points by date
    const mergedData: DataPoint[] = [];
    const dateSet = new Set<string>();

    // Collect all unique dates
    results.forEach((result) => {
        result.dataPoints.forEach((dp) => {
            dateSet.add(dp.date);
        });
    });

    // Sort dates
    const sortedDates = Array.from(dateSet).sort();

    // Create merged data
    sortedDates.forEach((date) => {
        const point: DataPoint = { date };
        results.forEach((result) => {
            const dp = result.dataPoints.find((d) => d.date === date);
            point[result.poolId] = dp?.cumulativeValue || initialAmount;
        });
        mergedData.push(point);
    });

    return (
        <ResponsiveContainer width="100%" height={280}>
            <LineChart data={mergedData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={{ stroke: "#475569" }}
                />
                <YAxis
                    tickFormatter={formatValue}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#475569" }}
                    tickLine={{ stroke: "#475569" }}
                    domain={["dataMin - 100", "dataMax + 100"]}
                />
                <Tooltip content={<CustomTooltip results={results} />} />
                <Legend
                    formatter={(value) => {
                        const result = results.find((r) => r.poolId === value);
                        return (
                            <span className="text-slate-300 text-xs">
                                {result?.project} ({result?.symbol})
                            </span>
                        );
                    }}
                />
                {results.map((result, index) => (
                    <Line
                        key={result.poolId}
                        type="monotone"
                        dataKey={result.poolId}
                        stroke={COLORS[index % COLORS.length]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: COLORS[index % COLORS.length] }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
