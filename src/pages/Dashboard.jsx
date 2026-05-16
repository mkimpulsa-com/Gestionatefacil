import { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { subDays, subMonths, format, eachDayOfInterval, eachMonthOfInterval, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { ArrowUpRight, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, BrainCircuit, Loader2, Landmark, Package, Users, Search } from 'lucide-react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { formatCurrency, parseCurrency } from '../utils/format';
import { Skeleton } from '../components/ui/Skeleton';
import './Dashboard.css';

export function Dashboard() {
  const { currentUser } = useAuth();
  const { 
    inventory: productsList, 
    deals: allDealsRaw, 
    purchases: allPurchases, 
    expenses: allExpenses, 
    banks: allAccounts,
    isLoading: loadingData
  } = useData();

  const allDeals = useMemo(() => allDealsRaw.filter(d => d.status === 'ganados' || d.status === 'negociacion'), [allDealsRaw]);
  
  const [stats, setStats] = useState({
    totalIncome: 0,
    salesToday: 0,
    criticalStock: 0,
    recentSales: [],
    topProducts: [],
    topClients: [],
    totalPurchases: 0,
    totalExpenses: 0
  });
  
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [debtSearchTerm, setDebtSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('week'); // 'week', 'month', 'year'
  const productsRef = useRef([]);
  const [localLoading, setLocalLoading] = useState(true);

  const loading = loadingData || localLoading;

  useEffect(() => {
    if (!currentUser || loadingData) return;

    productsRef.current = productsList;
    const critical = productsList.filter(p => p.stock < p.minStock).length;
    
    const totalIncome = allDeals.reduce((acc, d) => acc + parseCurrency(d.value), 0);
    const recentSales = [...allDeals]
      .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))
      .slice(0, 4)
      .map(d => ({ description: d.name || 'Venta', date: d.date || 'Sin fecha', amount: parseCurrency(d.value) }));
      
    const totalPurchases = allPurchases.reduce((acc, p) => acc + parseCurrency(p.value || 0), 0);
    const totalExpenses = allExpenses.reduce((acc, e) => acc + parseCurrency(e.amount || 0), 0);

    setStats(prev => ({
      ...prev,
      criticalStock: critical,
      salesToday: allDeals.length,
      totalIncome,
      recentSales,
      totalPurchases,
      totalExpenses
    }));

    setLocalLoading(false);
  }, [currentUser, loadingData, productsList, allDeals, allPurchases, allExpenses]);

  // 1. Centralized Date Filter Logic
  const dateRange = useMemo(() => {
    const now = new Date();
    let startDate;
    let interval = [];
    let formatStr = 'dd/MM';
    let groupingFn = (d) => {
      if (!d.date) return '';
      // Safe split for "YYYY-MM-DD"
      const parts = d.date.split('-');
      return `${parts[0]}-${parts[1]}-${parts[2]}`;
    };

    if (timeFilter === 'week') {
      startDate = subDays(now, 6);
      interval = eachDayOfInterval({ start: startDate, end: now });
    } else if (timeFilter === 'month') {
      startDate = subDays(now, 29);
      interval = eachDayOfInterval({ start: startDate, end: now });
    } else if (timeFilter === 'year') {
      startDate = subMonths(now, 11);
      interval = eachMonthOfInterval({ start: startDate, end: now });
      formatStr = 'MMM';
      groupingFn = (d) => {
        if (!d.date) return '';
        const parts = d.date.split('-');
        return `${parts[0]}-${parts[1]}`;
      };
    }
    
    // Normalize startDate to beginning of day to avoid missing today's data depending on exact hour
    startDate.setHours(0,0,0,0);

    return { startDate, now, interval, formatStr, groupingFn };
  }, [timeFilter]);

  // 2. Filtered Collections based on period
  const filteredData = useMemo(() => {
    const isWithinRange = (dateStr) => {
      if (!dateStr) return false;
      // dateStr is "YYYY-MM-DD". We want to parse it as local date.
      const parts = dateStr.split('-');
      if (parts.length !== 3) return false;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return d >= dateRange.startDate && d <= dateRange.now;
    };

    return {
      deals: allDeals.filter(d => isWithinRange(d.date)),
      purchases: allPurchases.filter(p => isWithinRange(p.date)),
      expenses: allExpenses.filter(e => isWithinRange(e.date))
    };
  }, [allDeals, allPurchases, allExpenses, dateRange]);

  // 3. Derived Rankings (Top 5 reactive)
  const rankings = useMemo(() => {
    const productMap = {};
    const clientMap = {};

    filteredData.deals.forEach(d => {
      if (d.clienteId) {
        if (!clientMap[d.clienteId]) {
          clientMap[d.clienteId] = { id: d.clienteId, name: d.clienteName || 'Sin Nombre', revenue: 0, profit: 0 };
        }
        clientMap[d.clienteId].revenue += parseFloat(d.montoCobrado || 0);
      }

      (d.items || []).forEach(item => {
        if (item.productId) {
          if (!productMap[item.productId]) {
            productMap[item.productId] = { id: item.productId, name: item.descripcion, qty: 0, revenue: 0 };
          }
          productMap[item.productId].qty += (parseFloat(item.cantidad) || 0);
          productMap[item.productId].revenue += (parseFloat(item.total) || 0);
        }
      });
    });

    const topClients = Object.values(clientMap).map(c => {
      let profit = 0;
      filteredData.deals.filter(d => d.clienteId === c.id).forEach(d => {
        (d.items || []).forEach(item => {
          const pInfo = productsRef.current.find(p => p.id === item.productId);
          const cost = pInfo ? parseCurrency(pInfo.costPrice) : 0;
          const price = parseCurrency(item.precio);
          const qty = parseFloat(item.cantidad) || 0;
          profit += (price - cost) * qty;
        });
      });
      return { ...c, profit };
    }).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const topProducts = Object.values(productMap).map(p => {
      const pInfo = productsRef.current.find(prod => prod.id === p.id);
      return { ...p, imageUrl: pInfo?.imageUrl || null };
    }).sort((a, b) => b.qty - a.qty).slice(0, 5);

    return { topClients, topProducts };
  }, [filteredData.deals]);

  // 4. Derived Chart Data based on filteredData
  const chartData = useMemo(() => {
    const grouped = {};
    const { interval, groupingFn, formatStr } = dateRange;

    filteredData.deals.forEach(d => {
      const key = groupingFn(d);
      if (!grouped[key]) grouped[key] = { total: 0, egresos: 0, deuda: 0 };
      // Usamos d.value (Total de la venta) para que figuren todas las ventas, cobradas o no.
      grouped[key].total += parseFloat(d.value || 0);
      grouped[key].deuda += parseFloat(d.deuda || 0);
    });

    filteredData.purchases.forEach(p => {
      const key = groupingFn(p);
      if (!grouped[key]) grouped[key] = { total: 0, egresos: 0, deuda: 0 };
      grouped[key].egresos += parseFloat(p.value || 0);
    });

    filteredData.expenses.forEach(e => {
      const key = groupingFn(e);
      if (!grouped[key]) grouped[key] = { total: 0, egresos: 0, deuda: 0 };
      grouped[key].egresos += parseFloat(e.amount || 0);
    });

    return interval.map(date => {
      const key = timeFilter === 'year' ? format(date, 'yyyy-MM') : format(date, 'yyyy-MM-dd');
      return {
        name: format(date, formatStr, { locale: es }),
        total: grouped[key]?.total || 0,
        egresos: grouped[key]?.egresos || 0,
        deuda: grouped[key]?.deuda || 0
      };
    });
  }, [filteredData, dateRange, timeFilter]);

  const periodTotals = useMemo(() => chartData.reduce((acc, point) => ({
    ingresos: acc.ingresos + point.total,
    egresos: acc.egresos + point.egresos,
    deudas: acc.deudas + (point.deuda || 0)
  }), { ingresos: 0, egresos: 0, deudas: 0 }), [chartData]);

  const periodNetProfit = periodTotals.ingresos - periodTotals.egresos;
  const periodLabel = timeFilter === 'week' ? 'en 7 días' : timeFilter === 'month' ? 'en 30 días' : 'en últimos 12 meses';

  const displayBalance = (() => {
    if (selectedAccountId === 'all') {
      return allAccounts.reduce((acc, accnt) => acc + (parseFloat(accnt.balance) || 0), 0);
    }
    const found = allAccounts.find(a => a.id === selectedAccountId);
    return found ? (parseFloat(found.balance) || 0) : 0;
  })();

  // El componente se encarga de mostrar skeletons internamente para cada sección


  return (
    <div className="dashboard animate-fade-in">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Bienvenido de nuevo, {currentUser?.email?.split('@')[0]}</h1>
          <p className="page-subtitle">Aquí está el resumen de tu negocio en tiempo real.</p>
        </div>
        <div className="header-actions">
        </div>
      </div>

      <div className="metrics-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="metric-card glass-card">
              <Skeleton width="60%" height="16px" className="mb-4" />
              <Skeleton width="80%" height="32px" className="mb-2" />
              <Skeleton width="40%" height="12px" />
            </div>
          ))
        ) : (
          <>
            <div className="metric-card glass-card">
              <div className="metric-header">
                <h3 className="metric-title">Ingresos Reales</h3>
                <span className="metric-trend positive">
                  Caja <TrendingUp size={14} />
                </span>
              </div>
              <p className="metric-value">{formatCurrency(periodTotals.ingresos)}</p>
              <p className="metric-desc">Cobrado {periodLabel}</p>
            </div>

            <div className="metric-card glass-card">
              <div className="metric-header">
                <h3 className="metric-title">Egresos Totales</h3>
                <span className="metric-trend negative">
                  Gastos <TrendingDown size={14} />
                </span>
              </div>
              <p className="metric-value error">{formatCurrency(periodTotals.egresos)}</p>
              <p className="metric-desc">Pagado {periodLabel}</p>
            </div>

            <div className="metric-card glass-card">
              <div className="metric-header">
                <h3 className="metric-title">Ganancia Neta</h3>
                <span className={`metric-trend ${periodNetProfit >= 0 ? 'positive' : 'negative'}`}>
                  {periodNetProfit >= 0 ? 'Rentable' : 'Pérdida'} <TrendingUp size={14} className={periodNetProfit < 0 ? 'rotate-180' : ''} />
                </span>
              </div>
              <p className={`metric-value ${periodNetProfit >= 0 ? 'success' : 'error'}`}>{formatCurrency(periodNetProfit)}</p>
              <p className="metric-desc">Caja neta {periodLabel}</p>
            </div>

            <div className="metric-card glass-card">
              <div className="metric-header">
                <h3 className="metric-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Saldo Caja/Banco
                  <select 
                    className="card-mini-select" 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)}
                    onClick={e => e.stopPropagation()}
                  >
                    <option value="all">Todo</option>
                    {allAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </h3>
                <span className="metric-trend positive">
                   Liquidez <Landmark size={14} />
                </span>
              </div>
              <p className="metric-value text-gradient">{formatCurrency(displayBalance)}</p>
              <p className="metric-desc">Capital disponible en cuentas</p>
            </div>
          </>
        )}
      </div>

      <div className="charts-grid">
        <div className="chart-card glass-card span-2">
          <div className="card-header-flex">
            <div>
              <h3>Flujo de Ingresos</h3>
              <p className="card-subtitle-small">
                {timeFilter === 'week' ? 'Últimos 7 días' : timeFilter === 'month' ? 'Últimos 30 días' : 'Último año'}
              </p>
            </div>
            <div className="chart-filters">
              <button 
                className={`filter-btn ${timeFilter === 'week' ? 'active' : ''}`}
                onClick={() => setTimeFilter('week')}
              >
                Semana
              </button>
              <button 
                className={`filter-btn ${timeFilter === 'month' ? 'active' : ''}`}
                onClick={() => setTimeFilter('month')}
              >
                Mes
              </button>
              <button 
                className={`filter-btn ${timeFilter === 'year' ? 'active' : ''}`}
                onClick={() => setTimeFilter('year')}
              >
                Año
              </button>
            </div>
          </div>
          <div className="chart-container">
            {chartData.every(d => d.total === 0 && d.egresos === 0) ? (
              <div className="empty-chart-msg flex-center">
                <div className="text-center">
                  <TrendingUp size={48} className="text-muted mb-2 opacity-20" />
                  <p className="text-muted">No hay movimientos registrados en este periodo.</p>
                </div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEgresos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(value, name) => [formatCurrency(value), name === 'total' ? 'Ventas' : 'Egresos']}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorEgresos)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="chart-card glass-card">
          <div className="card-header">
            <h3>Distribución de Caja</h3>
          </div>
          <div className="chart-container">
            {chartData.every(d => d.total === 0 && d.egresos === 0) ? (
              <div className="empty-chart-msg flex-center">
                <p className="text-muted text-sm">Esperando transacciones...</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{ backgroundColor: 'var(--surface-color)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                    formatter={(value, name) => [formatCurrency(value), name === 'total' ? 'Ventas' : 'Egresos']}
                  />
                  <Bar dataKey="total" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="rankings-grid">
        <div className="ranking-card glass-card">
          <div className="card-header">
            <h3>Top 5 Productos más vendidos</h3>
          </div>
          <div className="ranking-table">
            <div className="ranking-row header">
              <span>Producto</span>
              <span>Uds.</span>
              <span>Total</span>
            </div>
            {rankings.topProducts.length === 0 ? (
              <p className="empty-text">Sin datos en este periodo</p>
            ) : (
              rankings.topProducts.map((p, i) => (
                <div key={i} className="ranking-row" style={{ alignItems: 'center' }}>
                  <div className="ranking-product-info" style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    <div className="ranking-product-img">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={14} className="text-muted" />
                        </div>
                      )}
                    </div>
                    <span className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{p.name}</span>
                  </div>
                  <span className="qty">{p.qty}</span>
                  <span className="amount">{formatCurrency(p.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ranking-card glass-card">
          <div className="card-header">
            <h3>Top 5 Clientes (Rentabilidad)</h3>
          </div>
          <div className="ranking-table">
            <div className="ranking-row header">
              <span>Cliente</span>
              <span>Facturación</span>
              <span>Ganancia</span>
            </div>
            {rankings.topClients.length === 0 ? (
              <p className="empty-text">Sin datos en este periodo</p>
            ) : (
              rankings.topClients.map((c, i) => (
                <div key={i} className="ranking-row">
                  <span className="name">{c.name}</span>
                  <span className="amount">{formatCurrency(c.revenue)}</span>
                  <span className="profit success">
                    {formatCurrency(c.profit)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bottom-grid">
        <div className="recent-sales glass-card">
          <div className="card-header" style={{ flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
               <h3>Pendientes de Cobro</h3>
               <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--error-color)' }}>
                 Periodo: {formatCurrency(periodTotals.deudas)}
               </span>
            </div>
            <div className="card-search-wrapper" style={{ flex: 1, minWidth: '150px' }}>
              <Search size={14} className="search-icon-mini" />
              <input 
                type="text" 
                className="card-mini-input"
                placeholder="Buscar cliente..." 
                value={debtSearchTerm}
                onChange={e => setDebtSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="sales-list">
            {filteredData.deals.filter(d => d.deuda > 0 && (d.clienteName || d.name || '').toLowerCase().includes(debtSearchTerm.toLowerCase())).length === 0 ? (
              <p className="text-center py-8 text-muted">No hay deudas en este periodo que coincidan.</p>
            ) : (
              filteredData.deals
                .filter(d => d.deuda > 0 && (d.clienteName || d.name || '').toLowerCase().includes(debtSearchTerm.toLowerCase()))
                .sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0))
                .slice(0, 10)
                .map((deal, i) => (
                <div key={i} className="sale-item">
                  <div className="sale-info">
                    <div className="sale-avatar" style={{ background: 'var(--amber-glow)', color: '#f59e0b' }}>
                      {(deal.clienteName || deal.name || '?').charAt(0)}
                    </div>
                    <div>
                      <p className="sale-name" style={{ fontSize: '0.9rem' }}>{deal.clienteName || deal.name}</p>
                      <p className="sale-time">{deal.date || 'Sin fecha'}</p>
                    </div>
                  </div>
                  <div className="sale-amount error" style={{ fontWeight: 600 }}>
                    -{formatCurrency(deal.deuda)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="ai-insights glass-card">
           <div className="card-header">
            <h3><BrainCircuit size={18} className="inline mr-2" color="var(--ai-color)"/> Insights IA</h3>
          </div>
          <div className="insights-content">
             {stats.criticalStock > 0 ? (
               <div className="insight-item">
                  <div className="insight-icon bg-warning"><AlertTriangle size={16}/></div>
                  <p>Atención: Tienes {stats.criticalStock} productos con stock bajo. Revisa Inventario.</p>
               </div>
             ) : (
               <div className="insight-item">
                  <div className="insight-icon bg-success"><CheckCircle2 size={16}/></div>
                  <p>¡Buen trabajo! Tu inventario está optimizado y sin faltantes.</p>
               </div>
             )}
             <div className="insight-item">
                <div className="insight-icon bg-info"><ArrowUpRight size={16}/></div>
                <p>Tu flujo de caja es positivo con un cobro de {formatCurrency(periodTotals.ingresos)} en este periodo.</p>
             </div>
             <div className="insight-item">
                <div className="insight-icon bg-success"><TrendingUp size={16}/></div>
                <p>Las últimas ventas en el Pipeline sugieren un cierre de mes sólido.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
