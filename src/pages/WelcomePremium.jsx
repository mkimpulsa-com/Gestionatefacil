import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import BrandLogo from '../assets/logo-brand.png';
import './WelcomePremium.css';

export function WelcomePremium() {
  return (
    <div className="premium-success-container">
      {/* Background Animated Glow */}
      <div className="premium-background-glow" />

      <main className="premium-success-card">
        {/* Decoración superior */}
        <Sparkles className="premium-sparkles" size={48} />

        {/* Logo de la Marca (Grande y Profesional) */}
        <img 
          src={BrandLogo} 
          alt="Gestionate Fácil Logo" 
          className="premium-logo-large" 
        />

        {/* Mensaje Principal */}
        <h1>¡Gracias por adquirir el Plan Premium!</h1>
        
        <p>
          Tu cuenta ha sido actualizada con éxito. Prepárate para llevar tu negocio 
          al siguiente nivel con todas nuestras herramientas inteligentes.
        </p>

        {/* CTA Principal */}
        <Link to="/login" className="btn-premium-login">
          Iniciar Sesión ahora
          <ArrowRight size={20} />
        </Link>
      </main>
    </div>
  );
}
