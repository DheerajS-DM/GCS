import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const CustomChart = ({
  title,
  labels = [],
  datasets = [],
  yAxisLabel = '',
  height = 360
}) => {
  const [datasetVisibility, setDatasetVisibility] = useState(
    datasets.map(() => true)
  );

  const toggleDataset = (index) => {
    setDatasetVisibility((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
  };

  const chartData = {
    labels,
    datasets: datasets.map((ds, idx) => ({
      label: ds.label,
      data: ds.data,
      borderColor: ds.borderColor || '#38bdf8',
      backgroundColor: ds.backgroundColor || 'rgba(56, 189, 248, 0.05)',
      fill: ds.fill ?? false,
      tension: 0.25,
      pointRadius: 0,
      borderWidth: 2.5,
      hidden: !datasetVisibility[idx]
    }))
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11, family: 'JetBrains Mono' }, maxTicksLimit: 10 }
      },
      y: {
        title: { display: !!yAxisLabel, text: yAxisLabel, color: '#9ca3af', font: { size: 12 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af', font: { size: 11, family: 'JetBrains Mono' } }
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#38bdf8',
        bodyColor: '#f3f4f6',
        borderColor: '#1e293b',
        borderWidth: 1,
        padding: 12
      }
    }
  };

  return (
    <div className="glass-panel p-6 flex flex-col justify-between" id={`chart-panel-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      {/* Header & Toggle Chips */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h4 className="text-xs font-mono font-bold tracking-wider text-slate-300 uppercase">
          {title}
        </h4>

        {/* Dataset Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {datasets.map((ds, idx) => {
            const isVisible = datasetVisibility[idx];
            return (
              <button
                key={idx}
                onClick={() => toggleDataset(idx)}
                className={`px-3 py-1.5 text-xs font-mono rounded-lg border transition-all duration-150 flex items-center gap-2 ${
                  isVisible
                    ? 'bg-slate-900 border-slate-700 text-slate-200'
                    : 'bg-slate-950 border-slate-800 text-slate-600 line-through'
                }`}
                style={{ borderColor: isVisible ? ds.borderColor : undefined }}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: isVisible ? ds.borderColor : '#4b5563' }}
                />
                {ds.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart Canvas */}
      <div style={{ height: `${height}px` }} className="w-full relative">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
};
