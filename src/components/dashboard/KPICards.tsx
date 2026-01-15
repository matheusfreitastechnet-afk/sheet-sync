import React, { useMemo } from 'react';
import { ClipboardList, CheckCircle, XCircle, Users, Clock } from 'lucide-react';
import { useDashboard } from '@/contexts/DashboardContext';
import { calculateKPIs } from '@/utils/activityHelpers';

interface KPICardProps {
  value: string | number;
  label: string;
  icon: React.ReactNode;
  gradient: string;
}

const KPICard: React.FC<KPICardProps> = ({ value, label, icon, gradient }) => (
  <div className="kpi-card">
    <div className="kpi-header">
      <div>
        <div className="kpi-value" style={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {value}
        </div>
        <div className="kpi-label">{label}</div>
      </div>
      <div className="kpi-icon" style={{ background: gradient }}>
        {icon}
      </div>
    </div>
  </div>
);

export const KPICards: React.FC = () => {
  const { filteredData } = useDashboard();

  const kpis = useMemo(() => calculateKPIs(filteredData), [filteredData]);

  return (
    <div className="kpi-grid">
      <KPICard
        value={kpis.total.toLocaleString('pt-BR')}
        label="Total de Atividades"
        icon={<ClipboardList className="w-6 h-6 text-white" />}
        gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
      />
      
      <KPICard
        value={kpis.productive.toLocaleString('pt-BR')}
        label="Atividades Produtivas"
        icon={<CheckCircle className="w-6 h-6 text-white" />}
        gradient="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
      />
      
      <KPICard
        value={kpis.unproductive.toLocaleString('pt-BR')}
        label="Atividades Improdutivas"
        icon={<XCircle className="w-6 h-6 text-white" />}
        gradient="linear-gradient(135deg, #ef4444 0%, #ff6b6b 100%)"
      />
      
      <KPICard
        value={kpis.technicians.toLocaleString('pt-BR')}
        label="Técnicos Ativos"
        icon={<Users className="w-6 h-6 text-white" />}
        gradient="linear-gradient(135deg, #43e97b 0%, #38ef7d 100%)"
      />
      
      <KPICard
        value={kpis.avgDuration}
        label="Tempo Médio de Atendimento"
        icon={<Clock className="w-6 h-6 text-white" />}
        gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
      />
    </div>
  );
};
