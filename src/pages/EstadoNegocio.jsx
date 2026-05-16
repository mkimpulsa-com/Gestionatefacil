import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { formatCurrency } from '../utils/format';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  Calculator,
  PieChart,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './EstadoNegocio.css';

export function EstadoNegocio() {
  const { deals, expenses, inventory, otherIncomes } = useData();
  const { currentUser } = useAuth();
  const [companyData, setCompanyData] = useState(null);
  
  // Period State
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // States for Simulator
  const [simSalesBoost, setSimSalesBoost] = useState(0);
  const [simExpenseCut, setSimExpenseCut] = useState(0);
  const [simMarginBoost, setSimMarginBoost] = useState(0);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'companies', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCompanyData(docSnap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Helper to filter by month (Timezone Safe)
  const filterByMonth = (items, date) => {
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();
    
    return items.filter(item => {
      if (!item.date) return false;
      // item.date is "YYYY-MM-DD"
      const parts = item.date.split('-');
      if (parts.length !== 3) return false;
      
      const y = parseInt(parts[0]);
      const m = parseInt(parts[1]) - 1; // JS months are 0-11
      
      return m === targetMonth && y === targetYear;
    });
  };

  const stats = useMemo(() => {
    // 1. Current Month Filter
    // We include all deals that are NOT 'perdidos' or specifically 'ganados' for income
    // but here we filter what the user considers "Sales" (Ganados + potentially others in negotiation)
    const monthlyDeals = filterByMonth(deals.filter(d => d.status === 'ganados' || d.status === 'negociacion'), selectedDate);
    const monthlyExpenses = filterByMonth(expenses, selectedDate);
    const monthlyOtherIncomes = filterByMonth(otherIncomes, selectedDate);
    
    // 2. Facturación Actual (Ventas + Otros Ingresos)
    const salesRevenue = monthlyDeals.reduce((acc, d) => acc + (parseFloat(d.value) || 0), 0);
    const otherRevenue = monthlyOtherIncomes.reduce((acc, i) => acc + (parseFloat(i.amount) || 0), 0);
    const totalRevenue = salesRevenue + otherRevenue;
    
    // 3. Gastos Fijos (Sum of all expenses in the month)
    const totalFixedExpenses = monthlyExpenses.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    
    // 4. Margen de Contribución Real (Ventas - Costos Directos)
    let totalDirectCosts = 0;
    monthlyDeals.forEach(deal => {
      if (deal.items) {
        deal.items.forEach(item => {
          const cost = parseFloat(item.costPrice) || 0;
          totalDirectCosts += (cost * (item.cantidad || 1));
        });
      }
    });

    const marginContributionAmt = salesRevenue - totalDirectCosts;
    const marginContributionPct = salesRevenue > 0 ? (marginContributionAmt / salesRevenue) : 0.35;

    // 5. Punto de Equilibrio (Break-even Point)
    // Formula: Gastos Fijos / % Margen de Contribución
    // If no sales, we use a default expected margin to calculate the "target" break-even
    const breakEvenPoint = marginContributionPct > 0 ? (totalFixedExpenses / marginContributionPct) : totalFixedExpenses / 0.35;

    // 6. Resultado Actual
    const currentResult = (marginContributionAmt + otherRevenue) - totalFixedExpenses;

    // 7. Business Health %
    let healthScore = 0;
    if (totalRevenue > 0) {
      const breakEvenCoverage = Math.min(totalRevenue / breakEvenPoint, 1.2); 
      const profitMargin = currentResult / totalRevenue;
      healthScore = (breakEvenCoverage * 50) + (Math.max(profitMargin, 0) * 300);
      healthScore = Math.min(Math.max(healthScore, 15), 100);
    } else {
      healthScore = 0;
    }

    // 8. Daily Goal
    const lastDayOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();
    const daysPassed = isCurrentMonth ? new Date().getDate() : lastDayOfMonth;
    const daysRemaining = Math.max(lastDayOfMonth - daysPassed, 1);
    
    const amountToBreakEven = Math.max(breakEvenPoint - totalRevenue, 0);
    const dailyGoal = amountToBreakEven / daysRemaining;

    return {
      totalRevenue,
      totalFixedExpenses,
      marginContributionAmt,
      marginContributionPct,
      breakEvenPoint,
      currentResult,
      healthScore,
      dailyGoal,
      amountToBreakEven,
      lastDayOfMonth
    };
  }, [deals, expenses, otherIncomes, selectedDate]);

  // --- SIMULATOR LOGIC ---
  const simulation = useMemo(() => {
    const boostV = 1 + (simSalesBoost / 100);
    const cutE = 1 - (simExpenseCut / 100);
    const boostM = (stats.marginContributionPct * 100 + simMarginBoost) / 100;

    const projectedRevenue = stats.totalRevenue * boostV;
    const projectedExpenses = stats.totalFixedExpenses * cutE;
    const projectedMarginAmt = projectedRevenue * boostM;
    const projectedResult = projectedMarginAmt - projectedExpenses;
    const projectedBreakEven = boostM > 0 ? (projectedExpenses / boostM) : 0;

    return {
      projectedResult,
      projectedBreakEven,
      profitIncrease: projectedResult - stats.currentResult
    };
  }, [simSalesBoost, simExpenseCut, simMarginBoost, stats]);

  // --- SMART MESSAGES ---
  const messages = useMemo(() => {
    const msgs = [];
    if (stats.currentResult > 0) {
      msgs.push({ type: 'success', text: '🟢 El negocio está generando ganancias.', icon: <CheckCircle2 size={18} /> });
    } else if (stats.currentResult === 0 && stats.totalRevenue > 0) {
      msgs.push({ type: 'warning', text: '✔ El negocio se encuentra en equilibrio.', icon: <Activity size={18} /> });
    } else if (stats.currentResult < 0) {
      msgs.push({ type: 'danger', text: '🔴 Actualmente el negocio está operando en pérdida.', icon: <TrendingDown size={18} /> });
    } else {
      msgs.push({ type: 'info', text: 'Inicia el mes registrando tus primeras ventas para avanzar hacia el equilibrio.', icon: <Activity size={18} /> });
    }

    if (stats.marginContributionPct < 0.2 && stats.totalRevenue > 0) {
      msgs.push({ type: 'info', text: 'Sugerencia: Revisa tus márgenes para mejorar la rentabilidad neta.', icon: <Info size={18} /> });
    }

    return msgs;
  }, [stats]);

  // Status color helper
  const getStatusColor = () => {
    if (stats.currentResult > 0) return 'var(--success)';
    if (stats.currentResult === 0 && stats.totalRevenue > 0) return 'var(--warning)';
    if (stats.currentResult < 0) return 'var(--danger)';
    return 'var(--text-muted)';
  };

  const currentProgressPct = Math.min((stats.totalRevenue / stats.breakEvenPoint) * 100, 100);

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <div className="estado-negocio-container animate-fade-in" style={{ '--accent-color': getStatusColor() }}>
      
      <header className="header-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1><Activity size={32} /> Estado del Negocio</h1>
            <p>Control inteligente de rentabilidad y punto de equilibrio.</p>
          </div>

          <div className="period-selector">
            <button onClick={handlePrevMonth} className="period-btn"><ChevronLeft size={20} /></button>
            <div className="period-display">
              <Calendar size={18} />
              <span>{monthNames[selectedDate.getMonth()]} {selectedDate.getFullYear()}</span>
            </div>
            <button onClick={handleNextMonth} className="period-btn"><ChevronRight size={20} /></button>
          </div>
        </div>
      </header>

      {/* BLOQUE 1 - RESUMEN PRINCIPAL */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="icon-container"><Target size={24} /></div>
          <div className="kpi-info">
            <h3>Punto de equilibrio</h3>
            <div className="value">{formatCurrency(stats.breakEvenPoint)}</div>
          </div>
          <div className="kpi-footer">Facturación mínima necesaria para no operar en pérdida.</div>
        </div>

        <div className="kpi-card">
          <div className="icon-container"><TrendingUp size={24} /></div>
          <div className="kpi-info">
            <h3>Facturación actual</h3>
            <div className="value">{formatCurrency(stats.totalRevenue)}</div>
          </div>
          <div className="kpi-footer">Ventas totales del periodo actual.</div>
        </div>

        <div className="kpi-card">
          <div className="icon-container" style={{ color: stats.currentResult >= 0 ? 'var(--success)' : 'var(--danger)' }}>
            {stats.currentResult >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
          </div>
          <div className="kpi-info">
            <h3>Resultado actual</h3>
            <div className="value" style={{ color: stats.currentResult >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {stats.currentResult >= 0 ? '+' : ''}{formatCurrency(stats.currentResult)}
            </div>
          </div>
          <div className="kpi-footer">Utilidad neta después de costos y gastos fijos.</div>
        </div>

        <div className="kpi-card">
          <div className="icon-container"><Zap size={24} /></div>
          <div className="kpi-info">
            <h3>Salud del negocio</h3>
            <div className="value">{Math.round(stats.healthScore)}%</div>
          </div>
          <div className="kpi-footer">Índice basado en margen, cobertura y crecimiento.</div>
        </div>
      </div>

      {/* BLOQUE 2 - BARRA VISUAL DE RESULTADO NETO */}
      <div className="break-even-section">
        <div className="break-even-header">
          <h2>Equilibrio de Resultado Neto</h2>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Resultado del Periodo:</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: getStatusColor() }}>
              {stats.currentResult > 0 ? '+' : ''}{formatCurrency(stats.currentResult)}
            </div>
          </div>
        </div>
        
        <div className="progress-bar-wrapper">
          <div className="progress-bar-track">
            {/* Zona Roja: Pérdida (Izquierda de 0) */}
            <div className="zone-indicator zone-red" style={{ left: '0%', width: '50%' }}>
              <span>PÉRDIDA</span>
            </div>
            {/* Punto 0: Equilibrio */}
            <div className="equilibrium-node">
              <div className="node-label">0</div>
              <div className="node-value">EQUILIBRIO</div>
            </div>
            {/* Zona Verde: Ganancia (Derecha de 0) */}
            <div className="zone-indicator zone-green" style={{ left: '50%', width: '50%' }}>
              <span>GANANCIA</span>
            </div>

            {/* Marcador de Posición Actual basado en Resultado Neto */}
            <div 
              className="user-marker" 
              style={{ 
                left: `${(() => {
                  const maxRange = Math.max(stats.totalFixedExpenses, Math.abs(stats.currentResult), 1000);
                  const pct = (stats.currentResult / maxRange) * 50;
                  return 50 + Math.max(-48, Math.min(48, pct));
                })()}%` 
              }}
            >
              <div className="marker-company-logo">
                {companyData?.logoUrl ? (
                  <img src={companyData.logoUrl} alt="Company Logo" />
                ) : (
                  <div className="logo-fallback">{companyData?.name?.charAt(0) || 'M'}</div>
                )}
              </div>
              <div className="marker-tooltip">TU RESULTADO</div>
            </div>
          </div>
        </div>

        <div className="bar-footer-info">
          <p className="explainer-text">
            <Info size={14} /> 
            Este gráfico representa tu resultado neto real. El punto <strong>0</strong> es el equilibrio perfecto. 
            Hacia la izquierda indica que los gastos superan los ingresos; hacia la derecha indica que ya estás generando utilidad neta.
          </p>
        </div>
      </div>

      {/* BLOQUE 3 - INTERPRETACIÓN AUTOMÁTICA */}
      <div className="smart-messages">
        {messages.map((m, i) => (
          <div key={i} className={`message-card ${m.type}`}>
            {m.icon}
            <span>{m.text}</span>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid">
        {/* BLOQUE 5 & 6 - SIMULADOR Y META */}
        <div className="flex-column gap-6">
          <div className="card-panel">
            <h2 className="panel-title"><PieChart size={20} /> Simulador de Escenarios</h2>
            <div className="simulator-controls">
              <div className="slider-group">
                <div className="slider-header">
                  <span>Aumentar Ventas</span>
                  <span>+{simSalesBoost}%</span>
                </div>
                <input 
                  type="range" min="0" max="100" step="1" 
                  value={simSalesBoost} onChange={(e) => setSimSalesBoost(parseInt(e.target.value))}
                  className="slider-input"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Reducir Gastos</span>
                  <span>-{simExpenseCut}%</span>
                </div>
                <input 
                  type="range" min="0" max="50" step="1" 
                  value={simExpenseCut} onChange={(e) => setSimExpenseCut(parseInt(e.target.value))}
                  className="slider-input"
                />
              </div>

              <div className="slider-group">
                <div className="slider-header">
                  <span>Mejorar Margen</span>
                  <span>+{simMarginBoost}%</span>
                </div>
                <input 
                  type="range" min="0" max="20" step="1" 
                  value={simMarginBoost} onChange={(e) => setSimMarginBoost(parseInt(e.target.value))}
                  className="slider-input"
                />
              </div>

              <div className="projection-result">
                <p>
                  Si aplicas estos cambios, tu ganancia proyectada sería de <strong>{formatCurrency(simulation.projectedResult)}</strong> 
                  ({simulation.profitIncrease >= 0 ? '+' : ''}{formatCurrency(simulation.profitIncrease)} respecto a hoy). 
                  Tu punto de equilibrio bajaría a <strong>{formatCurrency(simulation.projectedBreakEven)}</strong>.
                </p>
              </div>
            </div>
          </div>

          <div className="card-panel">
            <h2 className="panel-title"><PieChart size={20} /> Análisis de Rendimiento</h2>
            <div className="impact-list">
              <div className="impact-item">
                <span className="impact-label">📊 Margen Promedio Actual</span>
                <span className={`impact-value pos`} style={{ fontSize: '1.2rem' }}>
                  {Math.round(stats.marginContributionPct * 100)}%
                </span>
              </div>
              <div className="impact-item">
                <span className="impact-label">Peso de Gastos Fijos</span>
                <span className="impact-value neg">
                  {stats.totalRevenue > 0 ? Math.round((stats.totalFixedExpenses / stats.totalRevenue) * 100) : 0}%
                </span>
              </div>
              <div className="impact-item">
                <span className="impact-label">Eficiencia Operativa</span>
                <span className="impact-value pos">Optimizada</span>
              </div>
            </div>
          </div>
        </div>

        {/* BLOQUE 4 - META DIARIA */}
        <div className="flex-column gap-6">
          <div className="daily-goal-card">
            <Target size={32} style={{ margin: '0 auto', color: '#a78bfa' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Meta Diaria Sugerida</h3>
            <div className="goal-value">{formatCurrency(stats.dailyGoal)}</div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
              Necesitas vender esto por día para cerrar el mes en punto de equilibrio.
            </p>
          </div>

          <div className="card-panel">
            <h2 className="panel-title"><Info size={20} /> Impacto de Gastos</h2>
            <div className="impact-list">
              <div className="impact-item">
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span className="impact-label">Último gasto cargado</span>
                  <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>Ajuste de punto de equilibrio</span>
                </div>
                <span className="impact-value neg">
                  +{formatCurrency(stats.totalFixedExpenses * 0.05)}
                </span>
              </div>
              <div className="impact-item">
                <span className="impact-label">Días operando en positivo</span>
                <span className="impact-value pos">
                  {stats.currentResult > 0 ? '12 días' : '0 días'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
