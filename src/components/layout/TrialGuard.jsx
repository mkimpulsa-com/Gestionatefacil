import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Lock, MessageCircle, ArrowRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';

export function TrialGuard({ children }) {
  const { currentUser } = useAuth();

  // Siempre permitir acceso al Administrador Maestro
  const isAdmin = currentUser?.email?.toLowerCase() === 'guananjacarlosenrique@gmail.com';
  if (isAdmin) return children;

  // Si no hay usuario, permitir que el sistema de rutas lo maneje (redirección a login)
  if (!currentUser) return children;

  // Calcular días desde el registro
  const registrationDate = currentUser.createdAt?.toDate ? currentUser.createdAt.toDate() : new Date(currentUser.createdAt || Date.now());
  const daysSinceRegistration = differenceInDays(new Date(), registrationDate);
  const trialDaysLeft = 7 - daysSinceRegistration;

  // Determinar si el acceso está suspendido por falta de pago
  const isSuspended = currentUser.status === 'suspendido';

  // Determinar si el plan es de prueba o está activo
  // Planes activos: 'Emprendedor', 'Negocio', 'Empresa'
  const hasActivePlan = ['Emprendedor', 'Negocio', 'Empresa'].includes(currentUser.plan);
  const isTrialExpired = !hasActivePlan && trialDaysLeft <= 0;

  if (isSuspended || isTrialExpired) {
    const title = isSuspended ? "Acceso Suspendido" : "Periodo de Prueba Finalizado";
    const subtitle = isSuspended ? "Falta regularizar la forma de pago" : "Tu acceso gratuito de 7 días ha expirado.";
    const message = isSuspended
      ? "Detectamos un inconveniente con el estado de tu cuenta. Por favor, comunícate con soporte para regularizar tu situación y continuar disfrutando de la plataforma."
      : "Esperamos que hayas disfrutado de la potencia de Gestionate Fácil. Para continuar impulsando tu negocio y recuperar el acceso a tus datos, por favor activa el Plan Emprendedor.";

    const whatsappMsg = isSuspended
      ? "Hola! Mi acceso a Gestionate Fácil aparece como suspendido. Deseo regularizar mi forma de pago."
      : "Hola! Mi periodo de prueba de 7 días ha expirado en Gestionate Fácil y deseo activar mi Plan Emprendedor.";

    return (
      <div className="trial-expired-overlay">
        <div className="trial-blocked-card animate-fade-in">
          <div className="blocked-header">
            <div className="lock-icon-container">
              <Lock size={32} className={`lock-icon ${isSuspended ? 'suspended' : ''}`} />
              <Shield size={48} className="shield-bg-icon" />
            </div>
            <h1 className="blocked-title">{title}</h1>
            <p className="blocked-subtitle">{subtitle}</p>
          </div>

          <div className="blocked-body">
            <p className="blocked-message">{message}</p>
          </div>

          <div className="blocked-footer">
            <a
              href={`https://wa.me/5493741443674?text=${encodeURIComponent(whatsappMsg)}`}
              className={`btn-activate-plan ${isSuspended ? 'btn-suspended' : ''}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={20} />
              <span>{isSuspended ? 'Contactar Soporte' : 'Activar Plan Emprendedor'}</span>
              <ArrowRight size={18} className="arrow-icon" />
            </a>
            <p className="footer-note">Activación inmediata tras confirmar la operación.</p>
          </div>
        </div>

        <style jsx>{`
          .lock-icon.suspended {
            color: #f87171;
          }
          .btn-activate-plan.btn-suspended {
            background: #4b5563;
          }
          .btn-activate-plan.btn-suspended:hover {
            background: #374151;
          }
          /* ... rest of existing styles ... */
          .trial-expired-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(10, 14, 23, 0.9);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            padding: 2rem;
          }

          .trial-blocked-card {
            background: var(--surface);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            width: 100%;
            max-width: 500px;
            padding: 3rem;
            text-align: center;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          }

          .lock-icon-container {
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-bottom: 2rem;
          }

          .lock-icon {
            color: #ef4444;
            z-index: 2;
          }

          .shield-bg-icon {
            position: absolute;
            color: rgba(239, 68, 68, 0.1);
            transform: scale(2);
            z-index: 1;
          }

          .blocked-title {
            font-size: 1.8rem;
            font-weight: 800;
            color: white;
            margin-bottom: 0.5rem;
            letter-spacing: -0.02em;
          }

          .blocked-subtitle {
            color: var(--text-muted);
            font-size: 1.1rem;
            font-weight: 500;
          }

          .blocked-body {
            margin: 2.5rem 0;
          }

          .blocked-message {
            color: var(--text-dim);
            line-height: 1.6;
            font-size: 1rem;
            margin-bottom: 2rem;
          }

          .plan-benefits-summary {
            background: rgba(255, 255, 255, 0.03);
            border-radius: 16px;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            text-align: left;
          }

          .benefit-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: var(--text-main);
            font-size: 0.9rem;
            font-weight: 500;
          }

          .benefit-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--primary-light);
            box-shadow: 0 0 8px var(--primary-light);
          }

          .btn-activate-plan {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1rem;
            background: #25d366;
            color: white;
            padding: 1.25rem 2rem;
            border-radius: 16px;
            text-decoration: none;
            font-weight: 700;
            font-size: 1.1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 10px 20px -10px rgba(37, 211, 102, 0.5);
          }

          .btn-activate-plan:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px -10px rgba(37, 211, 102, 0.6);
            background: #20ba5a;
          }

          .arrow-icon {
            opacity: 0.5;
            transition: transform 0.3s;
          }

          .btn-activate-plan:hover .arrow-icon {
            transform: translateX(4px);
            opacity: 1;
          }

          .footer-note {
            margin-top: 1.5rem;
            font-size: 0.8rem;
            color: var(--text-muted);
            font-weight: 500;
          }

          @keyframes fade-in {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          .animate-fade-in {
            animation: fade-in 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          }
        `}</style>
      </div>
    );
  }

  return children;
}
