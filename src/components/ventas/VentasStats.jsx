import { Target, BarChart2, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { Skeleton } from '../ui/Skeleton';

export function VentasStats({ deals, loading }) {
  const stats = {
    pipeline: deals.reduce((acc, d) => acc + (d.status !== 'ganados' ? d.value : 0), 0),
    ganados: deals.reduce((acc, d) => acc + (d.status === 'ganados' ? d.value : 0), 0),
    conversion: deals.length > 0 ? Math.round((deals.filter(d => d.status === 'ganados').length / deals.length) * 100) : 0
  };

  return (
    <div className="ventas-stats">
      <div className="glass-card stat-card">
        <div className="stat-title">Pronóstico en Pipeline</div>
        <div className="stat-value text-gradient">
          {loading ? <Skeleton width="120px" height="32px" /> : formatCurrency(stats.pipeline)}
        </div>
        <div className="stat-meta">Oportunidades abiertas</div>
      </div>
      <div className="glass-card stat-card">
        <div className="stat-title">Total Ganado</div>
        <div className="stat-value success">
          {loading ? <Skeleton width="120px" height="32px" /> : formatCurrency(stats.ganados)}
        </div>
        <div className="stat-meta">Ingresos cerrados</div>
      </div>
      <div className="glass-card stat-card">
        <div className="stat-title">Tasa de Cierre</div>
        <div className="stat-value">
          {loading ? <Skeleton width="60px" height="32px" /> : `${stats.conversion}%`}
        </div>
        <div className="stat-meta">Eficiencia comercial</div>
      </div>
    </div>
  );
}
