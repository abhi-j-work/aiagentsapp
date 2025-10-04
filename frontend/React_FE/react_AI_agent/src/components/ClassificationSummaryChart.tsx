import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ShieldCheck } from 'lucide-react';
import type { ClassificationResult } from '../services/api';

interface ChartProps {
  results: ClassificationResult[];
}

// Define colors for different classification types
const CLASSIFICATION_COLORS: { [key: string]: string } = {
  PII: '#ef4444', // Red
  Sensitive: '#f97316', // Orange
  Confidential: '#eab308', // Yellow
  'Non-Sensitive': '#22c55e', // Green
};

const ClassificationSummaryChart = ({ results }: ChartProps) => {
  // useMemo will re-calculate the chart data only when the 'results' prop changes.
  const chartData = useMemo(() => {
    const counts: { [key: string]: number } = {};

    // Iterate through all tables and columns to count each classification type
    results.forEach(table => {
      table.columns.forEach(column => {
        const classification = column.classification || 'Non-Sensitive';
        counts[classification] = (counts[classification] || 0) + 1;
      });
    });

    // Transform the counts object into an array that Recharts can use
    return Object.entries(counts).map(([name, count]) => ({
      name,
      count,
      fill: CLASSIFICATION_COLORS[name] || '#8884d8', // Use predefined color or a default
    }));
  }, [results]);

  if (!chartData || chartData.length === 0) {
    return null; // Don't render anything if there's no data
  }

  return (
    <div className="my-8 p-6 bg-slate-800/50 rounded-lg border border-slate-700">
      <h4 className="font-semibold text-white flex items-center gap-2 mb-4 text-lg">
        <ShieldCheck className="w-5 h-5 text-indigo-400" />
        Data Classification Summary
      </h4>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: 'rgba(100, 116, 139, 0.1)' }}
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#cbd5e1' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
               <LabelList dataKey="count" position="top" style={{ fill: '#cbd5e1', fontSize: '12px' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ClassificationSummaryChart;