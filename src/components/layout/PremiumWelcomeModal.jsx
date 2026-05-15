import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Trophy, CheckCircle, Rocket, ArrowRight, Sparkles, Star } from 'lucide-react';
import confetti from 'canvas-confetti';

export function PremiumWelcomeModal() {
  const { currentUser } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Solo mostrar si el plan es pago y no se ha mostrado antes
    const isPaidPlan = ['Emprendedor', 'Negocio', 'Empresa'].includes(currentUser?.plan);
    const notShownBefore = currentUser?.welcomeShown !== true;
    const isNotAdmin = currentUser?.email !== 'guananjacarlosenrique@gmail.com';

    if (isPaidPlan && notShownBefore && isNotAdmin) {
      setShow(true);
      // Lanzar confeti al activar
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10001 };

      const randomInRange = (min, max) => Math.random() * (max - min) + min;

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    }
  }, [currentUser]);

  const handleClose = async () => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { welcomeShown: true });
      setShow(false);
    } catch (error) {
      console.error("Error updating welcome flag:", error);
      setShow(false);
    }
  };

  if (!show) return null;

  return (
    <div className="premium-welcome-overlay">
      <div className="premium-welcome-card animate-zoom-in">
        <div className="card-decoration">
          <div className="floating-star s1"><Star size={16} /></div>
          <div className="floating-star s2"><Star size={24} /></div>
          <div className="floating-star s3"><Star size={12} /></div>
        </div>

        <div className="welcome-header">
          <div className="trophy-container">
            <Trophy size={48} className="trophy-icon" />
            <Sparkles size={64} className="sparkle-bg" />
          </div>
          <h1 className="welcome-title">¡Bienvenido al Nivel Premium!</h1>
          <div className="plan-tag">PLAN {currentUser.plan?.toUpperCase()} ACTIVO</div>
        </div>

        <div className="welcome-body">
          <p className="welcome-message">
            Es un placer darte la bienvenida oficial a la comunidad de negocios que crecen con <strong>Gestionate Fácil</strong>. 
            Tu cuenta ha sido activada con éxito y ahora tienes acceso ilimitado a todas nuestras herramientas profesionales.
          </p>

          <div className="perks-grid">
            <div className="perk-item">
              <div className="perk-icon"><CheckCircle size={20} /></div>
              <div className="perk-text">
                <strong>Sin Límites</strong>
                <span>Carga todos los productos y ventas que necesites.</span>
              </div>
            </div>
            <div className="perk-item">
              <div className="perk-icon"><Rocket size={20} /></div>
              <div className="perk-text">
                <strong>Máxima Potencia</strong>
                <span>Reportes avanzados y IA sin restricciones.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <p className="footer-quote">"El éxito es la suma de pequeños esfuerzos repetidos día tras día."</p>
          <button className="btn-get-started" onClick={handleClose}>
            <span>Empezar ahora</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <style jsx>{`
        .premium-welcome-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 14, 23, 0.95);
          backdrop-filter: blur(20px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 2rem;
        }

        .premium-welcome-card {
          background: linear-gradient(135deg, #1a1f2e 0%, #111827 100%);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          width: 100%;
          max-width: 650px;
          padding: 3rem;
          text-align: center;
          position: relative;
          box-shadow: 0 40px 100px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255,255,255,0.05);
          overflow: hidden;
        }

        .card-decoration .floating-star {
          position: absolute;
          color: #f59e0b;
          opacity: 0.4;
          animation: float 4s infinite ease-in-out;
        }

        .s1 { top: 10%; left: 10%; animation-delay: 0s; }
        .s2 { top: 20%; right: 15%; animation-delay: 1s; }
        .s3 { bottom: 25%; left: 15%; animation-delay: 2s; }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(15deg); }
        }

        .trophy-container {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 2.5rem;
        }

        .trophy-icon {
          color: #f59e0b;
          z-index: 2;
          filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.4));
        }

        .sparkle-bg {
          position: absolute;
          color: rgba(245, 158, 11, 0.1);
          transform: scale(2.5);
          z-index: 1;
        }

        .welcome-title {
          font-size: 2.2rem;
          font-weight: 800;
          color: white;
          margin-bottom: 1rem;
          letter-spacing: -0.03em;
          background: linear-gradient(to right, #fff, #9ca3af);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .plan-tag {
          display: inline-block;
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          padding: 0.5rem 1.25rem;
          border-radius: 100px;
          font-size: 0.8rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          border: 1px solid rgba(245, 158, 11, 0.2);
        }

        .welcome-body {
          margin: 2.5rem 0;
        }

        .welcome-message {
          color: var(--text-dim);
          line-height: 1.7;
          font-size: 1.1rem;
          margin-bottom: 3rem;
        }

        .perks-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          text-align: left;
        }

        .perk-item {
          background: rgba(255, 255, 255, 0.03);
          padding: 1.25rem;
          border-radius: 20px;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          border: 1px solid rgba(255,255,255,0.05);
        }

        .perk-icon {
          color: #10b981;
        }

        .perk-text strong {
          display: block;
          color: white;
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .perk-text span {
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .welcome-footer {
          margin-top: 3rem;
        }

        .footer-quote {
          font-style: italic;
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 2rem;
          opacity: 0.7;
        }

        .btn-get-started {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          background: white;
          color: #111827;
          padding: 1.25rem;
          border-radius: 20px;
          border: none;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-get-started:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 30px rgba(255, 255, 255, 0.1);
          background: #f3f4f6;
        }

        @media (max-width: 640px) {
          .premium-welcome-card {
            padding: 2.5rem 1.5rem;
            border-radius: 20px;
          }
          
          .welcome-title {
            font-size: 1.6rem;
          }

          .perks-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }

          .welcome-message {
            font-size: 1rem;
            margin-bottom: 2rem;
            line-height: 1.5;
          }

          .btn-get-started {
            padding: 1rem;
            font-size: 1rem;
          }
        }

        @keyframes zoom-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-zoom-in {
          animation: zoom-in 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
