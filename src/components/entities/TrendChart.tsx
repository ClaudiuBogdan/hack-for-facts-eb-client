import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { TrendPoint } from '@/lib/api/entities';
import { formatCurrency } from '@/lib/utils';

interface TrendChartProps {
  data: TrendPoint[];
  title: string;
  dataKey: keyof TrendPoint;
  color: string;
   xAxisLabel?: string;
  yAxisLabel?: string;
}

export const TrendChart: React.FC<TrendChartProps> = ({ data, title, dataKey, color, xAxisLabel, yAxisLabel }) => {
  if (!data || data.length === 0) {
    return <p className="text-sm text-center py-8 text-slate-500 dark:text-slate-400">No trend data available for {title.toLowerCase()}.</p>;
  }

  return (
    <div style={{ width: '100%', height: 350 }}>
      <h3 className="text-lg font-semibold mb-4 text-center text-slate-800 dark:text-slate-200">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart 
            data={data}
            margin={{
                top: 5,
                right: 30,
                left: 50, // Increased left margin for Y-axis label
                bottom: 40, // Increased bottom for X-axis label
            }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" /> {/* Darker grid for better contrast */} 
          <XAxis 
            dataKey="year" 
            tick={{ fontSize: 12, fill: '#718096' }} 
            label={{ value: xAxisLabel, position: 'insideBottom', dy:30, fontSize: 14, fill: '#4A5568'}}
           />
          <YAxis 
            tickFormatter={(value) => formatCurrency(value, 'compact')} 
            tick={{ fontSize: 12, fill: '#718096' }} 
            label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', dx: -40, fontSize: 14, fill: '#4A5568'}}
          />
          <Tooltip
            formatter={(value: number) => [formatCurrency(value, 'standard'), 'Amount']}
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: '0.5rem', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
            labelStyle={{ fontWeight: 'bold', color: '#2D3748' }}
            itemStyle={{ color: color }}
          />
          <Legend verticalAlign="top" height={36} iconSize={14} wrapperStyle={{color: '#4A5568'}} />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={2.5} 
            activeDot={{ r: 8, strokeWidth: 2, fill: color }} 
            dot={{ r: 4, strokeWidth: 1}} 
            name={title.split(' ')[0]}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}; 