import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, Legend } from 'recharts';
import { BarChart3, MapPin, Clock } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { getTechnicianDisplayName, getActivityStatus } from '@/utils/activityHelpers';

export const ChartSection: React.FC = () => {
  const { filteredData } = useDashboard();

  // Atendimentos por Técnico
  const technicianData = useMemo(() => {
    const counts: Record<string, { total: number; productive: number }> = {};
    
    filteredData.forEach(item => {
      const tech = getTechnicianDisplayName(item.Recurso);
      if (tech === 'Não Informado') return;
      
      if (!counts[tech]) {
        counts[tech] = { total: 0, productive: 0 };
      }
      counts[tech].total++;
      if (getActivityStatus(item) === 'Produtiva') {
        counts[tech].productive++;
      }
    });

    return Object.entries(counts)
      .map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 15) + '...' : name,
        fullName: name,
        total: data.total,
        productivity: data.total > 0 ? ((data.productive / data.total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredData]);

  // Atendimentos por Bairro
  const neighborhoodData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    filteredData.forEach(item => {
      const neighborhood = item.Bairro || item.bairro || 'Não Informado';
      if (neighborhood && neighborhood !== 'Não Informado') {
        counts[neighborhood] = (counts[neighborhood] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ 
        name: name.length > 18 ? name.substring(0, 18) + '...' : name, 
        fullName: name,
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [filteredData]);

  // Distribuição por Horário
  const hourlyData = useMemo(() => {
    const timeSlots: Record<string, number> = {
      '08:00 - 10:00': 0,
      '10:00 - 12:00': 0,
      '12:00 - 14:00': 0,
      '14:00 - 16:00': 0,
      '16:00 - 17:00': 0,
      '17:00 - 18:00': 0,
      'Não Informado': 0
    };

    filteredData.forEach(item => {
      const interval = item['Intervalo de Tempo'] || '';
      let matched = false;
      
      Object.keys(timeSlots).forEach(slot => {
        if (slot !== 'Não Informado' && interval.includes(slot.split(' - ')[0])) {
          timeSlots[slot]++;
          matched = true;
        }
      });
      
      if (!matched && interval) {
        // Try to extract hour
        const hourMatch = interval.match(/(\d{2}):(\d{2})/);
        if (hourMatch) {
          const hour = parseInt(hourMatch[1], 10);
          if (hour >= 8 && hour < 10) timeSlots['08:00 - 10:00']++;
          else if (hour >= 10 && hour < 12) timeSlots['10:00 - 12:00']++;
          else if (hour >= 12 && hour < 14) timeSlots['12:00 - 14:00']++;
          else if (hour >= 14 && hour < 16) timeSlots['14:00 - 16:00']++;
          else if (hour >= 16 && hour < 17) timeSlots['16:00 - 17:00']++;
          else if (hour >= 17 && hour < 18) timeSlots['17:00 - 18:00']++;
          else timeSlots['Não Informado']++;
        } else {
          timeSlots['Não Informado']++;
        }
      }
    });

    return Object.entries(timeSlots)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const barColors = ['#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d', '#831843', '#701a3b', '#5c1530', '#4a1025', '#3a0b1b'];

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum dado para exibir gráficos</p>
      </div>
    );
  }
  const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Atendimentos por Técnico */}
        <div className="productivity-card">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold">
            <BarChart3 className="w-5 h-5 text-accent" />
            Atendimentos por Técnico
          </h4>
          <div className="h-[300px]">
            
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={technicianData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fill: 'hsl(223 16% 70%)', fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: 'hsl(223 16% 70%)', fontSize: 10 }} 
                  width={95}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  formatter={(value, name, props) => [
                    `${value} (${props.payload.productivity}%)`,
                    'Atendimentos'
                  ]}
                  labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                />
                <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                  {technicianData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Atendimentos por Bairro */}
        <div className="productivity-card">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold">
            <MapPin className="w-5 h-5 text-success" />
            Atendimentos por Bairro
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={neighborhoodData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fill: 'hsl(223 16% 70%)', fontSize: 11 }} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fill: 'hsl(223 16% 70%)', fontSize: 10 }} 
                  width={115}
                />
                <Tooltip 
                  contentStyle={tooltipStyle}
                  labelFormatter={(label, payload) => payload[0]?.payload?.fullName || label}
                />
                <Bar dataKey="value" fill="#43e97b" radius={[0, 4, 4, 0]}>
                  {neighborhoodData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`hsl(${160 + index * 8}, 70%, ${55 - index * 3}%)`} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribuição por Horário */}
        <div className="productivity-card">
          <h4 className="mb-4 flex items-center gap-2 text-base font-bold">
            <Clock className="w-5 h-5 text-warning" />
            Distribuição por Horário
          </h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#43e97b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#43e97b" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'hsl(223 16% 70%)', fontSize: 9 }} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fill: 'hsl(223 16% 70%)', fontSize: 11 }} />
                <Tooltip 
                  contentStyle={tooltipStyle}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#43e97b" 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
