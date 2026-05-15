import { formatCurrency } from '../../utils/format';
import { Skeleton } from '../ui/Skeleton';
import { TrendingUp, DollarSign, PieChart, BarChart3 } from 'lucide-react';

export function InventarioStats({ 
  loading, 
  totalCostValue, 
  totalInventoryValue, 
  totalExpectedProfit 
}) {
  return (
    <div className="premium-stats-grid">
      <div className="premium-stat-card">
        <div className="card-inner">
           <div className="stat-icon cost">
              <DollarSign size={20} />
           </div>
           <div className="stat-data">
              <span className="label">Inversión (Costo)</span>
              <div className="value">
                 {loading ? <Skeleton width="120px" height="28px" /> : formatCurrency(totalCostValue)}
              </div>
              <span className="desc">Capital inmovilizado</span>
           </div>
        </div>
        <div className="card-glow cost" />
      </div>

      <div className="premium-stat-card">
        <div className="card-inner">
           <div className="stat-icon value">
              <BarChart3 size={20} />
           </div>
           <div className="stat-data">
              <span className="label">Valor Inventario</span>
              <div className="value highlight">
                 {loading ? <Skeleton width="120px" height="28px" /> : formatCurrency(totalInventoryValue)}
              </div>
              <span className="desc">Venta proyectada total</span>
           </div>
        </div>
        <div className="card-glow value" />
      </div>

      <div className="premium-stat-card">
        <div className="card-inner">
           <div className="stat-icon profit">
              <TrendingUp size={20} />
           </div>
           <div className="stat-data">
              <span className="label">Ganancia Neta</span>
              <div className="value success">
                 {loading ? <Skeleton width="120px" height="28px" /> : formatCurrency(totalExpectedProfit)}
              </div>
              <span className="desc">Margen total de utilidad</span>
           </div>
        </div>
        <div className="card-glow profit" />
      </div>
    </div>
  );
}
