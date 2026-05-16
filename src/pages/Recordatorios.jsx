import { useState, useEffect } from 'react';
import { Target, Bell, Plus, Trash2, Calendar, Briefcase, DollarSign, Filter, Activity, AlertCircle, CheckCircle2, Trophy, ArrowRight, Edit2, UserCheck, Cake, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Skeleton, SkeletonCard } from '../components/ui/Skeleton';
import './Recordatorios.css';

export function Recordatorios() {
  const { currentUser } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formType, setFormType] = useState('meta'); // 'meta' or 'anotacion'
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetValue: '',
    currentValue: '0',
    priority: 'media',
    goalType: 'manual', // 'manual', 'sales_amount', 'profit_amount', 'new_clients_count', 'products_sold_count'
    startDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0]
  });

  const [activeTab, setActiveTab] = useState('metas'); // 'metas', 'anotaciones', 'cumpleaños'

  const [deals, setDeals] = useState([]);
  const [clients, setClients] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    setLoading(true);

    const qReminders = query(
      collection(db, 'reminders'),
      where('userId', '==', currentUser.uid)
    );

    const unsubReminders = onSnapshot(qReminders, (snapshot) => {
      setReminders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qDeals = query(collection(db, 'deals'), where('userId', '==', currentUser.uid));
    const unsubDeals = onSnapshot(qDeals, (snapshot) => {
      setDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qClients = query(collection(db, 'clients'), where('userId', '==', currentUser.uid));
    const unsubClients = onSnapshot(qClients, (snapshot) => {
      setClients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubReminders();
      unsubDeals();
      unsubClients();
    };
  }, [currentUser]);

  // AUTO-COMPLETE GOALS EFFECT
  useEffect(() => {
    if (loading || reminders.length === 0 || deals.length === 0) return;

    const checkGoalsProgress = async () => {
      for (const reminder of reminders) {
        if (reminder.category === 'meta' && !reminder.completed && reminder.goalType !== 'manual') {
          const progressValue = calculateGoalProgress(reminder);
          const target = parseFloat(reminder.targetValue);
          
          if (!isNaN(target) && target > 0 && progressValue >= target) {
            // Meta alcanzada automáticamente
            try {
              await updateDoc(doc(db, 'reminders', reminder.id), { 
                completed: true,
                currentValue: target,
                updatedAt: serverTimestamp()
              });

              toast.success(`Gestionate Fácil: ¡Meta Alcanzada: ${reminder.text}!`, {
                icon: '🏆',
                duration: 6000,
                style: {
                  borderRadius: '10px',
                  background: '#1a1f2e',
                  color: '#fff',
                  border: '1px solid var(--primary)'
                }
              });

              await addDoc(collection(db, 'notifications'), {
                userId: currentUser.uid,
                type: 'goal_achieved',
                title: 'Meta Alcanzada Automáticamente 🏆',
                message: `¡Felicidades! Has alcanzado tu objetivo de "${reminder.text}" gracias a tus recientes ventas.`,
                isRead: false,
                createdAt: serverTimestamp()
              });
            } catch (error) {
              console.error("Error auto-completing goal:", error);
            }
          }
        }
      }
    };

    checkGoalsProgress();
  }, [reminders, deals, clients, loading]);

  const calculateGoalProgress = (reminder) => {
    if (reminder.goalType === 'manual' || !reminder.goalType) {
      return parseFloat(reminder.currentValue) || 0;
    }

    const start = new Date(reminder.startDate || reminder.createdAt?.toDate() || 0);
    const end = new Date(reminder.dueDate);
    end.setHours(23, 59, 59, 999);

    if (reminder.goalType === 'new_clients_count') {
      return clients.filter(c => {
        const created = c.createdAt?.toDate();
        return created && created >= start && created <= end;
      }).length;
    }

    // Filter deals within range
    const relevantDeals = deals.filter(d => {
      const dealDate = new Date(d.date + 'T12:00:00'); // Use deal date string
      return dealDate >= start && dealDate <= end;
    });

    switch (reminder.goalType) {
      case 'sales_amount':
        return relevantDeals.reduce((acc, d) => acc + (parseFloat(d.value) || 0), 0);
      
      case 'sales_count':
        return relevantDeals.length;

      case 'profit_amount':
        return relevantDeals.reduce((acc, d) => {
          const items = d.items || [];
          const itemsProfit = items.reduce((iAcc, it) => {
            const price = parseFloat(it.precio) || 0;
            const cost = parseFloat(it.costPrice || 0);
            return iAcc + ((price - cost) * (parseFloat(it.cantidad) || 0));
          }, 0);
          const commAmt = parseFloat(d.resellerCommissionAmt) || 0;
          return acc + (itemsProfit - commAmt);
        }, 0);

      case 'products_sold_count':
        return relevantDeals.reduce((acc, d) => {
          const items = d.items || [];
          return acc + items.reduce((iAcc, it) => iAcc + (parseFloat(it.cantidad) || 0), 0);
        }, 0);

      default:
        return parseFloat(reminder.currentValue) || 0;
    }
  };

  const openAddModal = (type) => {
    setFormType(type);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      targetValue: '',
      currentValue: '0',
      priority: 'media',
      goalType: 'manual',
      startDate: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const openEditModal = (reminder) => {
    setFormType(reminder.category);
    setEditingId(reminder.id);
    setFormData({
      title: reminder.text || '',
      description: reminder.description || '',
      targetValue: reminder.targetValue || '',
      currentValue: reminder.currentValue || '0',
      priority: reminder.priority || 'media',
      goalType: reminder.goalType || 'manual',
      startDate: reminder.startDate || (reminder.createdAt?.toDate()?.toISOString().split('T')[0]) || new Date().toISOString().split('T')[0],
      dueDate: reminder.dueDate || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    try {
      const data = {
        userId: currentUser.uid,
        category: formType,
        text: formData.title,
        description: formData.description,
        targetValue: formData.targetValue ? parseFloat(formData.targetValue) : null,
        currentValue: formData.goalType === 'manual' ? (parseFloat(formData.currentValue) || 0) : 0,
        priority: formData.priority,
        goalType: formData.goalType,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        completed: editingId ? (reminders.find(r => r.id === editingId).completed) : false,
        updatedAt: serverTimestamp()
      };

      if (editingId) {
        await updateDoc(doc(db, 'reminders', editingId), data);
        toast.success("Gestionate Fácil: Actualizado correctamente");
      } else {
        await addDoc(collection(db, 'reminders'), {
          ...data,
          createdAt: serverTimestamp()
        });
        toast.success("Gestionate Fácil: Añadido correctamente");
      }
      setIsModalOpen(false);
    } catch (e) {
      toast.error("Gestionate Fácil: Error al guardar");
      console.error(e);
    }
  };

  const handleToggleReminder = async (reminder) => {
    const newCompletedStatus = !reminder.completed;
    try {
      await updateDoc(doc(db, 'reminders', reminder.id), { 
        completed: newCompletedStatus,
        currentValue: newCompletedStatus && reminder.targetValue ? reminder.targetValue : reminder.currentValue
      });

      // Trigger notification if completed
      if (newCompletedStatus) {
        const isMeta = reminder.category === 'meta';
        toast.success(`Gestionate Fácil: ¡${isMeta ? 'Meta' : 'Anotación'} cumplida!`, {
          icon: isMeta ? '🏆' : '✅',
          duration: 4000
        });

        await addDoc(collection(db, 'notifications'), {
          userId: currentUser.uid,
          type: isMeta ? 'goal_achieved' : 'note_completed',
          title: isMeta ? 'Meta Alcanzada 🏆' : 'Nota Completada ✅',
          message: `¡Felicidades! Has completado: "${reminder.text}"`,
          isRead: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (e) {
      toast.error("Gestionate Fácil: Error al actualizar");
    }
  };

  const handleDeleteReminder = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminarlo?")) return;
    try {
      await deleteDoc(doc(db, 'reminders', id));
      toast.success("Gestionate Fácil: Eliminado");
    } catch (e) {
      toast.error("Gestionate Fácil: Error al eliminar");
    }
  };

  const typeIcons = {
    manual: <Trophy size={14} />,
    sales_amount: <DollarSign size={14} />,
    sales_count: <Activity size={14} />,
    profit_amount: <DollarSign size={14} />,
    new_clients_count: <UserCheck size={14} />,
    products_sold_count: <Briefcase size={14} />
  };

  const typeNames = {
    manual: 'Manual',
    sales_amount: 'Ventas ($)',
    sales_count: 'Ventas (Nº)',
    profit_amount: 'Ganancia ($)',
    new_clients_count: 'Nuevos Clientes',
    products_sold_count: 'Productos Vendidos'
  };

  const getSortedBirthdays = (clientList) => {
    const today = new Date();
    // Normalizar hoy para comparar solo mes y día
    const currentYear = today.getFullYear();

    return clientList
      .filter(c => c.birthday)
      .map(c => {
        const [y, m, d] = c.birthday.split('-').map(Number);
        let nextBday = new Date(currentYear, m - 1, d);
        
        // Si ya pasó este año, es el año que viene
        if (nextBday < today && !(nextBday.getMonth() === today.getMonth() && nextBday.getDate() === today.getDate())) {
          nextBday.setFullYear(currentYear + 1);
        }
        
        return { ...c, nextBday, m, d };
      })
      .sort((a, b) => a.nextBday - b.nextBday);
  };

  const handleSendGreeting = (client) => {
    if (!client.phone) {
      toast.error("Gestionate Fácil: El cliente no tiene un teléfono registrado");
      return;
    }
    const cleanPhone = client.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`¡Hola ${client.name || 'amigo/a'}! 🎈 De parte del equipo de Gestionate Fácil, te deseamos un muy feliz cumpleaños. ¡Que tengas un día increíble! 🎉🎂`);
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  const renderReminderList = (type) => {
    const list = reminders.filter(r => r.category === type);
    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
    if (list.length === 0) return (
      <div className="empty-state">
        <AlertCircle size={32} opacity={0.2} />
        <p>No hay {type === 'meta' ? 'metas' : 'anotaciones'} definidas.</p>
        <button className="btn-secondary btn-sm" onClick={() => openAddModal(type)}>Empezar ahora</button>
      </div>
    );

    return list
      .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .map(reminder => {
        const target = parseFloat(reminder.targetValue);
        const calculatedValue = calculateGoalProgress(reminder);
        const progress = !isNaN(target) && target > 0 ? Math.min((calculatedValue / target) * 100, 100) : 0;
        const isOverdue = new Date(reminder.dueDate) < new Date() && !reminder.completed;
        const isAuto = reminder.goalType && reminder.goalType !== 'manual';

        return (
          <div key={reminder.id} className={`reminder-card-pro ${reminder.completed ? 'completed' : ''} priority-${reminder.priority}`}>
            <div className="card-pro-header">
              <div className="card-pro-main">
                <div className="custom-checkbox-pro" onClick={() => handleToggleReminder(reminder)}>
                  {reminder.completed && <CheckCircle2 size={18} color="var(--success)" />}
                </div>
                <div className="card-pro-text">
                  <div className="title-row">
                    <span className="title">{reminder.text}</span>
                    {isAuto && <span className="auto-badge" title="Sincronizado automáticamente">Auto</span>}
                  </div>
                  {reminder.description && <p className="desc">{reminder.description}</p>}
                </div>
              </div>
              <div className="card-pro-actions">
                <button className="btn-icon-sm" onClick={() => openEditModal(reminder)}><Edit2 size={14} /></button>
                <button className="btn-icon-sm hover-danger" onClick={() => handleDeleteReminder(reminder.id)}><Trash2 size={14} /></button>
              </div>
            </div>

            <div className="progress-section">
              <div className="progress-label">
                <span className="type-tag">{typeIcons[reminder.goalType || 'manual']} {typeNames[reminder.goalType || 'manual']}</span>
                <span className={`progress-percent ${progress >= 100 ? 'completed' : ''}`}>
                  {progress !== null ? `${Math.round(progress)}%` : '0%'}
                </span>
              </div>
              <div className="progress-bar-bg">
                <div 
                  className={`progress-bar-fill ${progress >= 100 ? 'gold-glow' : ''}`} 
                  style={{ width: `${progress || 0}%` }}
                ></div>
              </div>
              <div className="progress-values">
                {Math.round(calculatedValue)} / {reminder.targetValue || '---'}
              </div>
            </div>

            <div className="card-pro-footer">
              <span className={`date-badge ${isOverdue ? 'overdue' : ''}`}>
                <Calendar size={12} /> {reminder.dueDate}
              </span>
              <span className={`priority-badge ${reminder.priority}`}>
                {reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1)}
              </span>
              {reminder.completed && (
                <span className="achievement-badge">
                  <Trophy size={12} /> Completada
                </span>
              )}
            </div>
          </div>
        );
      });
  };

  const totalMetas = reminders.filter(r => r.category === 'meta').length;
  const completedMetas = reminders.filter(r => r.category === 'meta' && r.completed).length;
  const globalProgress = totalMetas > 0 ? (completedMetas / totalMetas) * 100 : 0;

  return (
    <div className="recordatorios-page animate-fade-in">
      <header className="recordatorios-header">
        <div className="header-main-info">
          <h1 className="page-title">Centro de Gestión</h1>
          <p className="page-subtitle">Impulsa tu negocio con metas claras y organización eficiente.</p>
        </div>

        <div className="header-performance-pro glass-panel">
          <div className="performance-info">
            <div className="performance-text">
               <span className="label">Eficiencia de Objetivos</span>
               <span className="value">{Math.round(globalProgress)}%</span>
            </div>
            <div className="global-progress-bar-bg">
              <div className="global-progress-bar-fill" style={{ width: `${globalProgress}%` }}></div>
            </div>
          </div>
          
          <div className="divider-v"></div>

          <div className="header-stats-mini">
            <div className="mini-stat">
              <span className="mini-label">Meta Cumplida</span>
              <span className="mini-value success">{completedMetas}</span>
            </div>
            <div className="mini-stat">
              <span className="mini-label">En Camino</span>
              <span className="mini-value">{totalMetas - completedMetas}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="management-desktop glass-panel">
        <aside className="management-sidebar">
          <div className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'metas' ? 'active' : ''}`}
              onClick={() => setActiveTab('metas')}
            >
              <div className="nav-icon-wrapper goals">
                <Target size={20} />
              </div>
              <div className="nav-info">
                <span className="nav-label">Metas</span>
                <span className="nav-count">{reminders.filter(r => r.category === 'meta').length} activas</span>
              </div>
            </button>

            <button 
              className={`nav-item ${activeTab === 'anotaciones' ? 'active' : ''}`}
              onClick={() => setActiveTab('anotaciones')}
            >
              <div className="nav-icon-wrapper notes">
                <Bell size={20} />
              </div>
              <div className="nav-info">
                <span className="nav-label">Notas</span>
                <span className="nav-count">{reminders.filter(r => r.category === 'anotacion').length} pendientes</span>
              </div>
            </button>

            <button 
              className={`nav-item ${activeTab === 'cumpleaños' ? 'active' : ''}`}
              onClick={() => setActiveTab('cumpleaños')}
            >
              <div className="nav-icon-wrapper birthdays">
                <Cake size={20} />
              </div>
              <div className="nav-info">
                <span className="nav-label">Cumpleaños</span>
                <span className="nav-count">{getSortedBirthdays(clients).length} próximos</span>
              </div>
            </button>
          </div>

          <div className="sidebar-footer">
             <button className="btn-add-quick" onClick={() => openAddModal(activeTab === 'metas' ? 'meta' : 'anotacion')}>
                <Plus size={18} />
                <span>Crear Nuevo</span>
             </button>
          </div>
        </aside>

        <main className="management-content-area">
          <header className="content-header-pro">
            <div className="header-text">
               <h2>
                 {activeTab === 'metas' && "Mis Objetivos de Crecimiento"}
                 {activeTab === 'anotaciones' && "Bloc de Notas y Recordatorios"}
                 {activeTab === 'cumpleaños' && "Calendario de Fidelización"}
               </h2>
               <p>
                 {activeTab === 'metas' && "Mide tu progreso y alcanza tus objetivos financieros."}
                 {activeTab === 'anotaciones' && "No dejes pasar ninguna idea o pendiente importante."}
                 {activeTab === 'cumpleaños' && "Mantén una relación cercana felicitando a tus clientes."}
               </p>
            </div>
          </header>

          <div className="content-scroll-container">
            {activeTab === 'metas' && (
              <div className="goals-view-pro animate-fade-in">
                {renderReminderList('meta')}
              </div>
            )}

            {activeTab === 'anotaciones' && (
              <div className="notes-masonry animate-fade-in">
                {renderReminderList('anotacion')}
              </div>
            )}

            {activeTab === 'cumpleaños' && (
              <div className="birthdays-view-pro animate-fade-in">
                {loading ? (
                  <div className="birthday-cards-grid">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </div>
                ) : getSortedBirthdays(clients).length === 0 ? (
                  <div className="empty-state-pro">
                    <Cake size={48} />
                    <h3>Sin cumpleaños a la vista</h3>
                    <p>Agrega fechas de nacimiento a tus clientes en la sección de Contactos.</p>
                  </div>
                ) : (
                  <div className="birthday-cards-grid">
                    {getSortedBirthdays(clients).slice(0, 20).map(client => {
                      const isToday = client.nextBday.getDate() === new Date().getDate() && 
                                     client.nextBday.getMonth() === new Date().getMonth();
                      const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

                      return (
                        <div key={client.id} className={`bday-card-pro ${isToday ? 'is-today' : ''}`}>
                          <div className="bday-card-top">
                            <div className="user-info">
                              <div className="user-avatar-pro">
                                {client.imageUrl ? <img src={client.imageUrl} alt="" /> : <UserCheck size={20} />}
                              </div>
                              <div className="user-text">
                                <h4>{client.name}</h4>
                                <span>{client.d} de {monthNames[client.m - 1]}</span>
                              </div>
                            </div>
                            {isToday && <div className="bday-badge-pro">HOY</div>}
                          </div>
                          
                          <button 
                            className="bday-action-btn"
                            onClick={() => handleSendGreeting(client)}
                          >
                            <Send size={16} />
                            <span>Enviar Felicidades</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? 'Editar Elemento' : `Nueva ${formType === 'meta' ? 'Meta' : 'Anotación'}`}
      >
        <form onSubmit={handleSubmit} className="pro-modal-form">
          <div className="form-group">
            <label>Título / Qué quieres lograr</label>
            <input 
              type="text" 
              placeholder="Ej: Aumentar ventas 20%" 
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Descripción (Opcional)</label>
            <textarea 
              placeholder="Detalla un poco más tu objetivo..."
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Prioridad</label>
              <select 
                value={formData.priority}
                onChange={e => setFormData({...formData, priority: e.target.value})}
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label>Fecha Límite</label>
              <input 
                type="date"
                value={formData.dueDate}
                onChange={e => setFormData({...formData, dueDate: e.target.value})}
              />
            </div>
          </div>

          {formType === 'meta' && (
            <>
              <div className="form-group">
                <label>Tipo de Objetivo (Conexión Automática)</label>
                <select 
                  value={formData.goalType}
                  onChange={e => setFormData({...formData, goalType: e.target.value})}
                  className="goal-type-select"
                >
                  <option value="manual">🎯 Manual (Ajuste a mano)</option>
                  <option value="sales_amount">💰 Monto de Ventas ($)</option>
                  <option value="sales_count">📈 Cantidad de Ventas (Nº)</option>
                  <option value="profit_amount">💎 Ganancia Real ($)</option>
                  <option value="new_clients_count">👥 Captación de Clientes</option>
                  <option value="products_sold_count">📦 Unidades Vendidas</option>
                </select>
                <p className="field-hint">Las metas automáticas analizan tus registros financieros en tiempo real.</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Fecha de Inicio del Periodo</label>
                  <input 
                    type="date"
                    value={formData.startDate}
                    onChange={e => setFormData({...formData, startDate: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Valor Meta (Nº)</label>
                  <input 
                    type="number"
                    placeholder="Ej: 10000"
                    value={formData.targetValue}
                    onChange={e => setFormData({...formData, targetValue: e.target.value})}
                  />
                </div>
              </div>

              {formData.goalType === 'manual' && (
                <div className="form-group">
                  <label>Progreso Actual Inicial</label>
                  <input 
                    type="number"
                    placeholder="Ej: 2500"
                    value={formData.currentValue}
                    onChange={e => setFormData({...formData, currentValue: e.target.value})}
                  />
                </div>
              )}
            </>
          )}

          <div className="modal-actions-pro">
            <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">Guardar {formType === 'meta' ? 'Meta' : 'Anotación'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
