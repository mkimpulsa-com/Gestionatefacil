import { useState, useEffect, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  Calendar, 
  Filter, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  Briefcase,
  History,
  CheckCircle2,
  Table as TableIcon
} from 'lucide-react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../utils/format';
import { Skeleton, SkeletonRow } from '../components/ui/Skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './Finanzas.css';

export function Finanzas() {
  const { currentUser } = useAuth();
  const [deals, setDeals] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [otherIncomes, setOtherIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('resumen');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    const qDeals = query(collection(db, 'deals'), where('userId', '==', currentUser.uid));
    const qPurchases = query(collection(db, 'purchases'), where('userId', '==', currentUser.uid));
    const qExpenses = query(collection(db, 'expenses'), where('userId', '==', currentUser.uid));
    const qOthers = query(collection(db, 'otherIncomes'), where('userId', '==', currentUser.uid));

    const unsubDeals = onSnapshot(qDeals, (snap) => setDeals(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubPurchases = onSnapshot(qPurchases, (snap) => setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubExpenses = onSnapshot(qExpenses, (snap) => setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubOthers = onSnapshot(qOthers, (snap) => setOtherIncomes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    setLoading(false);
    return () => {
      unsubDeals();
      unsubPurchases();
      unsubExpenses();
      unsubOthers();
    };
  }, [currentUser]);

  // Consolidar Flujo de Caja (Cash Flow)
  const cashFlow = useMemo(() => {
    const inflows = [
      ...deals.filter(d => d.status === 'ganados').map(d => ({
        id: d.id,
        date: d.date,
        description: `Venta: ${d.clienteName || d.name}`,
        amount: parseFloat(d.montoCobrado || d.value) || 0,
        type: 'Ingreso',
        category: 'Ventas',
        origin: 'Ventas'
      })),
      ...otherIncomes.map(i => ({
        id: i.id,
        date: i.date,
        description: i.description,
        amount: parseFloat(i.amount) || 0,
        type: 'Ingreso',
        category: i.category,
        origin: 'Otros Ingresos'
      }))
    ];

    const outflows = [
      ...purchases.map(p => ({
        id: p.id,
        date: p.date,
        description: `Compra: ${p.proveedorName || p.name}`,
        amount: parseFloat(p.montoPagado || p.value) || 0,
        type: 'Egreso',
        category: 'Mercadería',
        origin: 'Compras'
      })),
      ...expenses.map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        amount: parseFloat(e.amount) || 0,
        type: 'Egreso',
        category: e.category,
        origin: 'Gastos'
      }))
    ];

    return [...inflows, ...outflows].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [deals, purchases, expenses, otherIncomes]);

  // Libro de IVA Ventas
  const ivaVentas = useMemo(() => {
    return deals.map(d => {
      const net = (d.items || []).reduce((acc, item) => {
        const ivaRate = parseFloat(item.iva) / 100 || 0;
        const itemNet = item.total / (1 + ivaRate);
        return acc + itemNet;
      }, 0);
      const iva = (d.value || 0) - net;
      return { ...d, net, iva };
    });
  }, [deals]);

  // Libro de IVA Compras
  const ivaCompras = useMemo(() => {
    return purchases.map(p => {
      const net = (p.items || []).reduce((acc, item) => {
        const ivaRate = parseFloat(item.iva) / 100 || 0;
        const itemNet = item.total / (1 + ivaRate);
        return acc + itemNet;
      }, 0);
      const iva = (p.value || 0) - net;
      return { ...p, net, iva };
    });
  }, [purchases]);

  // Filtrar por mes seleccionado
  const filteredCashFlow = cashFlow.filter(item => item.date.startsWith(selectedMonth));
  const filteredIvaVentas = ivaVentas.filter(item => item.date.startsWith(selectedMonth));
  const filteredIvaCompras = ivaCompras.filter(item => item.date.startsWith(selectedMonth));

  // Estadísticas del mes
  const stats = useMemo(() => {
    const totalIn = filteredCashFlow.filter(i => i.type === 'Ingreso').reduce((acc, i) => acc + i.amount, 0);
    const totalOut = filteredCashFlow.filter(i => i.type === 'Egreso').reduce((acc, i) => acc + i.amount, 0);
    const totalIvaVentas = filteredIvaVentas.reduce((acc, i) => acc + i.iva, 0);
    const totalIvaCompras = filteredIvaCompras.reduce((acc, i) => acc + i.iva, 0);
    
    return {
      totalIn,
      totalOut,
      balance: totalIn - totalOut,
      ivaDebito: totalIvaVentas,
      ivaCredito: totalIvaCompras,
      ivaSaldo: totalIvaVentas - totalIvaCompras
    };
  }, [filteredCashFlow, filteredIvaVentas, filteredIvaCompras]);

  const exportForAccountant = () => {
    const headers = ["Fecha", "Tipo", "Concepto", "Categoría", "Monto", "Origen"];
    const rows = filteredCashFlow.map(i => [
      i.date,
      i.type,
      i.description,
      i.category,
      i.amount.toFixed(2),
      i.origin
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Contabilidad_${selectedMonth}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="finanzas-container animate-fade-in">
      <header className="finanzas-header">
        <div>
          <h1 className="page-title flex-center gap-2" style={{justifyContent: 'flex-start'}}>
            <Calculator className="text-primary" />
            Contabilidad y Finanzas
          </h1>
          <p className="page-subtitle">Información consolidada para tu contador y análisis de rentabilidad real.</p>
        </div>
        <div className="flex-center gap-2">
          <input 
            type="month" 
            className="month-selector"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          <button className="btn-primary flex-center gap-2" onClick={exportForAccountant}>
            <Download size={18} />
            <span>Exportar para Contador</span>
          </button>
        </div>
      </header>

      <nav className="finanzas-tabs">
        <button className={`tab-btn ${activeTab === 'resumen' ? 'active' : ''}`} onClick={() => setActiveTab('resumen')}>Resumen Ejecutivo</button>
        <button className={`tab-btn ${activeTab === 'caja' ? 'active' : ''}`} onClick={() => setActiveTab('caja')}>Flujo de Caja</button>
        <button className={`tab-btn ${activeTab === 'iva_ventas' ? 'active' : ''}`} onClick={() => setActiveTab('iva_ventas')}>Libro IVA Ventas</button>
        <button className={`tab-btn ${activeTab === 'iva_compras' ? 'active' : ''}`} onClick={() => setActiveTab('iva_compras')}>Libro IVA Compras</button>
      </nav>

      {activeTab === 'resumen' && (
        <div className="finanzas-content animate-fade-in">
          <div className="finanzas-stats">
            <div className="glass-card stat-card">
              <div className="stat-title">Ingresos Reales (Cobrados)</div>
              <div className="stat-value success">{loading ? <Skeleton width="140px" height="32px" /> : formatCurrency(stats.totalIn)}</div>
              <div className="stat-trend success"><ArrowUpRight size={16} /> Este mes</div>
            </div>
            <div className="glass-card stat-card">
              <div className="stat-title">Egresos Reales (Pagados)</div>
              <div className="stat-value danger">{loading ? <Skeleton width="140px" height="32px" /> : formatCurrency(stats.totalOut)}</div>
              <div className="stat-trend danger"><ArrowDownRight size={16} /> Este mes</div>
            </div>
            <div className="glass-card stat-card balance-card">
              <div className="stat-title">Resultado Neto (Utilidad)</div>
              <div className="stat-value text-gradient">{loading ? <Skeleton width="140px" height="32px" /> : formatCurrency(stats.balance)}</div>
              <div className="stat-meta">Rendimiento mensual</div>
            </div>
          </div>

          <div className="accounting-summary">
            <div className="summary-box">
              <span className="label">IVA Débito (Ventas)</span>
              <span className="value danger">{formatCurrency(stats.ivaDebito)}</span>
            </div>
            <div className="summary-box">
              <span className="label">IVA Crédito (Compras)</span>
              <span className="value success">{formatCurrency(stats.ivaCredito)}</span>
            </div>
            <div className="summary-box bg-check">
              <span className="label">IVA a Pagar / Saldo Técnico</span>
              <span className="value" style={{color: stats.ivaSaldo > 0 ? 'var(--danger)' : 'var(--success)'}}>
                {formatCurrency(Math.abs(stats.ivaSaldo))} 
                <small style={{display: 'block', fontSize: '0.6rem', marginTop: '4px'}}>
                  {stats.ivaSaldo > 0 ? '(A pagar)' : '(A favor)'}
                </small>
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'caja' && (
        <div className="glass-panel animate-fade-in">
          <div className="panel-header">
            <div className="flex-center gap-2">
              <History size={20} className="text-primary" />
              <h3>Historial de Movimientos de Caja</h3>
            </div>
            <div className="search-bar" style={{maxWidth: '300px'}}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Filtrar movimientos..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <table className="finance-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Concepto</th>
                <th>Categoría</th>
                <th>Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan="5"><SkeletonRow columns={5} /></td>
                  </tr>
                ))
              ) : filteredCashFlow.length === 0 ? (
                <tr><td colSpan="5" style={{textAlign: 'center', padding: '3rem'}}>No hay movimientos registrados para este mes.</td></tr>
              ) : (
                filteredCashFlow.filter(i => i.description.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                  <tr key={item.id}>
                    <td data-label="Fecha" style={{whiteSpace: 'nowrap'}}>{item.date}</td>
                    <td data-label="Concepto">
                      <div>
                        <div style={{fontWeight: 600}}>{item.description}</div>
                        <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>{item.origin}</div>
                      </div>
                    </td>
                    <td data-label="Categoría"><span className={`tag ${item.type === 'Ingreso' ? 'tag-ingreso' : 'tag-egreso'}`}>{item.category}</span></td>
                    <td data-label="Monto" className={item.type === 'Ingreso' ? 'success fw-bold' : 'danger fw-bold'}>
                      {item.type === 'Ingreso' ? '+' : '-'}{formatCurrency(item.amount)}
                    </td>
                    <td data-label="Estado"><CheckCircle2 size={16} className="text-success" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {(activeTab === 'iva_ventas' || activeTab === 'iva_compras') && (
        <div className="glass-panel animate-fade-in">
          <div className="panel-header">
            <div className="flex-center gap-2">
              <TableIcon size={20} className="text-primary" />
              <h3>{activeTab === 'iva_ventas' ? 'Libro IVA Ventas' : 'Libro IVA Compras'}</h3>
            </div>
          </div>
          <table className="finance-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Comprobante</th>
                <th>Razón Social</th>
                <th>Subtotal (Neto)</th>
                <th>IVA Calculado</th>
                <th>Total Facturado</th>
              </tr>
            </thead>
            <tbody>
              {(activeTab === 'iva_ventas' ? filteredIvaVentas : filteredIvaCompras).length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '3rem'}}>No hay registros de {activeTab === 'iva_ventas' ? 'ventas' : 'compras'} para este periodo.</td></tr>
              ) : (
                (activeTab === 'iva_ventas' ? filteredIvaVentas : filteredIvaCompras).map(item => (
                  <tr key={item.id}>
                    <td data-label="Fecha">{item.date}</td>
                    <td data-label="Comprobante"><span className="iva-badge">{item.tipoFactura} {item.nroFactura}</span></td>
                    <td data-label="Razón Social">{item.clienteName || item.proveedorName || item.name}</td>
                    <td data-label="Subtotal" className="fw-bold">{formatCurrency(item.net)}</td>
                    <td data-label="IVA" className="text-muted">{formatCurrency(item.iva)}</td>
                    <td data-label="Total" className="fw-bold">{formatCurrency(item.value)}</td>
                  </tr>
                ))
              )}
            </tbody>
            { (activeTab === 'iva_ventas' ? filteredIvaVentas : filteredIvaCompras).length > 0 && (
              <tfoot>
                <tr style={{background: 'rgba(255,255,255,0.05)', fontWeight: 700}}>
                  <td colSpan="3" style={{textAlign: 'right', padding: '1rem'}}>TOTALES:</td>
                  <td style={{padding: '1rem'}}>
                    {formatCurrency((activeTab === 'iva_ventas' ? filteredIvaVentas : filteredIvaCompras).reduce((acc, i) => acc + i.net, 0))}
                  </td>
                  <td style={{padding: '1rem'}}>
                    {formatCurrency((activeTab === 'iva_ventas' ? filteredIvaVentas : filteredIvaCompras).reduce((acc, i) => acc + i.iva, 0))}
                  </td>
                  <td style={{padding: '1rem'}}>
                    {formatCurrency((activeTab === 'iva_ventas' ? filteredIvaVentas : filteredIvaCompras).reduce((acc, j) => acc + j.value, 0))}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
