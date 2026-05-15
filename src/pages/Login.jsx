import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, Mail, AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle, Phone, Building2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import './Login.css';

const PROVISIONAL_TERMS = (
  <div className="terms-text-content">
    <p className="mb-4">Bienvenido a <strong>Gestionate Fácil</strong>. Al registrarte en nuestra plataforma, aceptas los siguientes términos:</p>
    <ul className="terms-list">
      <li><strong>Uso del Servicio:</strong> Te proporcionamos herramientas de gestión empresarial impulsadas por IA. Te comprometes a usar el servicio de manera lícita.</li>
      <li><strong>Privacidad de Datos:</strong> Protegemos tu información con encriptación. Tus datos financieros son privados y seguros.</li>
      <li><strong>Responsabilidad de la Cuenta:</strong> Eres responsable de mantener la confidencialidad de tu contraseña.</li>
      <li><strong>Modificaciones:</strong> Nos reservamos el derecho de actualizar estos términos en cualquier momento.</li>
      <li><strong>Naturaleza Provisoria:</strong> Estos términos son para fines de demostración y deben ser validados legalmente.</li>
    </ul>
  </div>
);

export function Login() {
   const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  
  const { login, signup } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (!isLogin && !acceptedTerms) {
      setError('Debes aceptar los términos y condiciones para continuar.');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password, companyName, phone);
      }
      
      const isAdmin = email.toLowerCase() === 'guananjacarlosenrique@gmail.com';
      navigate(isAdmin ? '/admin' : '/app');
    } catch (err) {
      console.error(err);
      let message = 'Ocurrió un error al procesar tu solicitud.';
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        message = 'El correo electrónico o la contraseña son incorrectos.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Este correo electrónico ya está registrado.';
      } else if (err.code === 'auth/weak-password') {
        message = 'La contraseña es demasiado débil (mínimo 6 caracteres).';
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Error de conexión. Verifica tu internet.';
      }
      
      setError(message);
    }

    setLoading(false);
  }

  return (
    <div className="login-container">
      <div className="login-box glass-panel animate-fade-in relative">
        <button 
          type="button"
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors duration-300"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="login-header">
          <h1 className="text-gradient">Gestionate Fácil</h1>
          <p>{isLogin ? 'Inicia sesión en tu cuenta' : 'Crea tu cuenta'}</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          {!isLogin && (
            <>
              <div className="form-group">
                <label>Nombre de la Empresa</label>
                <div className="input-with-icon">
                  <Building2 size={18} />
                  <input 
                    type="text" 
                    required 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    placeholder="Ej: Gestionate Fácil S.A."
                    className="form-input"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Número de Celular</label>
                <div className="input-with-icon">
                  <Phone size={18} />
                  <input 
                    type="tel" 
                    required 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder="+54 9 11 ..."
                    className="form-input"
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Correo Electrónico</label>
            <div className="input-with-icon">
              <Mail size={18} />
              <input 
                type="email" 
                required 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                placeholder="ejemplo@correo.com"
                className="form-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="••••••••"
                className="form-input with-password-toggle"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="terms-container">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={acceptedTerms} 
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  required
                />
                <span className="checkbox-text">
                  Acepto los <button type="button" className="btn-link-inline" onClick={() => setShowTermsModal(true)}>Términos y Condiciones</button>
                </span>
              </label>
            </div>
          )}

          <button disabled={loading} type="submit" className="btn-primary login-btn">
            {isLogin ? 'Ingresar' : 'Registrarse'}
          </button>
        </form>

        <div className="login-footer">
          <button 
            type="button"
            className="btn-link" 
            onClick={() => navigate(isLogin ? '/register' : '/login')}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </button>
        </div>
      </div>

      <Modal 
        isOpen={showTermsModal} 
        onClose={() => setShowTermsModal(false)}
        title="Términos y Condiciones"
      >
        {PROVISIONAL_TERMS}
        <div className="modal-actions mt-6">
          <button 
            className="btn-primary w-full" 
            onClick={() => {
              setAcceptedTerms(true);
              setShowTermsModal(false);
            }}
          >
            Entendido y Acepto
          </button>
        </div>
      </Modal>
    </div>
  );
}
