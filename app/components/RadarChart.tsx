"use client";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const data = [
  { subject: 'Analysis', finance: 90, tech: 85, fullMark: 100 },
  { subject: 'Architecture', finance: 90, tech: 80, fullMark: 100 },
  { subject: 'Execution', finance: 95, tech: 85, fullMark: 100 },
  { subject: 'Innovation', finance: 80, tech: 95, fullMark: 100 },
  { subject: 'Integration', finance: 85, tech: 90, fullMark: 100 },
];

export default function SkillsRadar() {
  return (
    <div className="w-full bg-bb-black text-xs" style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
          <PolarGrid stroke="#333333" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#FFB800', fontSize: 10 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
          <Radar name="Finance" dataKey="finance" stroke="#FF6600" fill="#FF6600" fillOpacity={0.3} />
          <Radar name="Tech" dataKey="tech" stroke="#FFB800" fill="#FFB800" fillOpacity={0.3} />
          <Legend
            wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', paddingTop: 8 }}
            formatter={(value: string) => <span style={{ color: value === 'Finance' ? '#FF6600' : '#FFB800' }}>{value}</span>}
          />
          <Tooltip
            contentStyle={{ backgroundColor: '#000', border: '1px solid #FF6600', borderRadius: 0, fontFamily: 'monospace' }}
            itemStyle={{ color: '#FFF' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
