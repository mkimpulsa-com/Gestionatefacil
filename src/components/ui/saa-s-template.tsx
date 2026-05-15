import React from "react";
import { Link } from "react-router-dom";
import { 
  ArrowRight, 
  Menu, 
  X, 
  Users, 
  BarChart3, 
  CheckCircle2, 
  ShieldCheck, 
  Brain, 
  Star, 
  Package
} from "lucide-react";
import { AnimatedFooter } from "./modem-animated-footer";
import { PricingSection } from "./pricing-section";
import OrbitingTools from "./orbiting-skills";
import { Modal } from "./Modal";
import { legalContent } from "../../data/legalContent";
import BrandLogo from "../../assets/logo-brand.png";

// Íconos de redes sociales (SVG inline por no estar en lucide-react v1)
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);
const WhatsappIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12.031 0C5.397 0 .016 5.385.016 12.022c0 2.122.553 4.195 1.603 6.015L.003 24l6.115-1.603c1.758.966 3.753 1.474 5.913 1.474 6.634 0 12.016-5.386 12.016-12.023C24.047 5.385 18.665 0 12.031 0zm0 21.84c-1.782 0-3.522-.48-5.056-1.385l-.362-.214-3.755.986.998-3.662-.236-.375c-.996-1.58-1.524-3.418-1.524-5.328 0-5.547 4.516-10.065 10.065-10.065 5.548 0 10.066 4.518 10.066 10.065 0 5.548-4.518 10.066-10.066 10.066zm5.526-7.551c-.303-.151-1.794-.886-2.073-.986-.279-.101-.482-.151-.685.151-.202.303-.782.986-.959 1.187-.177.202-.354.227-.657.076-2.585-1.298-4.041-2.906-4.997-5.082-.177-.303.22-.284.811-1.463.101-.202.05-.38-.025-.531-.076-.151-.685-1.644-.937-2.253-.247-.591-.498-.51-.685-.519-.177-.008-.38-.01-.583-.01-.202 0-.531.077-.81.38-.278.303-1.063 1.037-1.063 2.531 0 1.493 1.088 2.936 1.24 3.138.152.202 2.15 3.284 5.21 4.536 2.217.905 3.03.886 3.562.756.6-.147 1.794-.734 2.046-1.442.253-.708.253-1.316.177-1.442-.075-.126-.278-.202-.581-.353z"/>
  </svg>
);
const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

// Componente de Botón Inline (Adaptado de la plantilla)
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "ghost" | "gradient" | "outline";
  size?: "default" | "sm" | "lg";
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", className = "", children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    
    const variants = {
      default: "bg-white text-black hover:bg-gray-100",
      secondary: "bg-gray-800 text-white hover:bg-gray-700",
      ghost: "hover:bg-gray-800/50 text-white",
      outline: "border border-gray-700 text-white hover:bg-gray-800",
      gradient: "bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95"
    };
    
    const sizes = {
      default: "h-10 px-4 py-2 text-sm",
      sm: "h-10 px-5 text-sm",
      lg: "h-12 px-8 text-base"
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

// Componente de Navegación
const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <header className="fixed top-0 w-full z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
      <nav className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-semibold text-white">Gestionate Fácil</div>
          
          <div className="hidden md:flex items-center justify-center gap-8 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a href="#features" className="text-sm text-white/60 hover:text-white transition-colors">
              Funciones
            </a>
            <a href="#ai" className="text-sm text-white/60 hover:text-white transition-colors">
              Inteligencia Artificial
            </a>
            <a href="#pricing" className="text-sm text-white/60 hover:text-white transition-colors">
              Planes
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/login">
              <Button type="button" variant="ghost" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button type="button" variant="default" size="sm">
                Registrarse
              </Button>
            </Link>
          </div>

          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden bg-black/95 backdrop-blur-md border-t border-gray-800/50 animate-[slideDown_0.3s_ease-out]">
          <div className="px-6 py-4 flex flex-col gap-4">
            <a
              href="#features"
              className="text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Funciones
            </a>
            <a
              href="#ai"
              className="text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Inteligencia Artificial
            </a>
            <a
              href="#pricing"
              className="text-sm text-white/60 hover:text-white transition-colors py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Planes
            </a>
            <div className="flex flex-col gap-2 pt-4 border-t border-gray-800/50">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button type="button" variant="ghost" size="sm" className="w-full">
                  Iniciar Sesión
                </Button>
              </Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button type="button" variant="default" size="sm" className="w-full">
                  Registrarse
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
});

Navigation.displayName = "Navigation";

// Componente Hero (Estilo Plantilla SaaS)
const Hero = React.memo(() => {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-start px-6 py-20 md:py-24"
      style={{
        animation: "fadeIn 0.6s ease-out"
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        
        * {
          font-family: 'Poppins', sans-serif;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <aside className="mb-8 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full">
        <span className="text-xs text-center whitespace-nowrap" style={{ color: '#9ca3af' }}>
          ¡Nueva versión 2.0 con IA generativa!
        </span>
        <a
          href="#ai"
          className="flex items-center gap-1 text-xs hover:text-white transition-all active:scale-95 whitespace-nowrap"
          style={{ color: '#9ca3af' }}
          aria-label="Más sobre la nueva versión"
        >
          Saber más
          <ArrowRight size={12} />
        </a>
      </aside>

      <h1
        className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl px-6 leading-tight mb-6"
        style={{
          background: "linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.05em"
        }}
      >
        Dale a tu gran idea <br />el software que merece
      </h1>

      <p className="text-sm md:text-base text-center max-w-2xl px-6 mb-10" style={{ color: '#9ca3af' }}>
        Plataforma de gestión integral con React e IA <br />diseñada para que tomes el control total de tu negocio.
      </p>

      <div className="flex items-center gap-4 relative z-10 mb-16">
        <Link to="/register">
          <Button
            type="button"
            variant="gradient"
            size="lg"
            className="rounded-lg flex items-center justify-center"
            aria-label="Comenzar con la plataforma"
          >
            Comenzar ahora
          </Button>
        </Link>
      </div>

      <div className="w-full max-w-5xl relative pb-20">
        <div
          className="absolute left-1/2 w-[90%] pointer-events-none z-0"
          style={{
            top: "-23%",
            transform: "translateX(-50%)"
          }}
          aria-hidden="true"
        >
          <img
            src="https://i.postimg.cc/Ss6yShGy/glows.png"
            alt=""
            className="w-full h-auto"
            loading="eager"
          />
        </div>
        
        <div className="relative z-10">
          <img
            src="https://i.postimg.cc/SKcdVTr1/Dashboard2.png"
            alt="Vista previa del panel de control"
            className="w-full h-auto rounded-lg shadow-2xl border border-gray-800"
            loading="eager"
          />
        </div>
      </div>
    </section>
  );
});

Hero.displayName = "Hero";

// Sección de Funciones/Herramientas
const Features = () => {
  const features = [
    {
      icon: <Users size={24} />,
      title: "CRM Inteligente",
      description: "Gestiona clientes, proveedores y revendedores con perfiles detallados y seguimiento automático."
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Finanzas en Tiempo Real",
      description: "Visualiza ingresos y gastos con gráficos interactivos y reportes automáticos de rentabilidad."
    },
    {
      icon: <Package size={24} />,
      title: "Control de Inventario",
      description: "Alertas de stock bajo, gestión de categorías y trazabilidad completa de tus productos."
    },
    {
      icon: <ShieldCheck size={24} />,
      title: "Seguridad Bancaria",
      description: "Tus datos están protegidos con encriptación de nivel militar y respaldos automáticos."
    }
  ];

  return (
    <section id="features" className="py-24 px-6 max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-white">Herramientas que ofrecemos</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">Todo lo que necesitas para escalar tu negocio en un solo lugar.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <div key={i} className="p-8 rounded-2xl border border-gray-800 bg-gray-900/40 hover:border-gray-600 transition-colors">
            <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center mb-6 text-white">
              {f.icon}
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">{f.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

// Sección de Inteligencia Artificial con Órbita
const AIHighlight = () => {
  return (
    <section id="ai" className="py-24 px-6 border-t border-white/10 relative overflow-hidden">
      {/* Glow de fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute left-1/4 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute right-1/4 top-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Texto centrado arriba */}
        <div className="text-center mb-16 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs mb-6">
            <Brain size={14} className="text-white/60" />
            <span>Impulsado por IA</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold text-white mb-6 leading-tight">
            La IA en el corazón<br />de tu negocio
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Gestionate Fácil conecta todas tus herramientas bajo una inteligencia central que aprende, predice y actúa — para que tú tomes las mejores decisiones.
          </p>
        </div>

        {/* Órbita centrada + features a los lados */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 relative z-10">
          {/* Features izquierda */}
          <div className="flex flex-col gap-6 lg:max-w-xs text-right order-2 lg:order-1">
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <h3 className="text-white font-medium mb-1">Panel de Control</h3>
              <p className="text-white/40 text-sm">Vista 360° de tu negocio en tiempo real.</p>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <h3 className="text-white font-medium mb-1">Ventas Inteligentes</h3>
              <p className="text-white/40 text-sm">La IA sugiere el momento ideal para cerrar ventas.</p>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <h3 className="text-white font-medium mb-1">Inventario Predictivo</h3>
              <p className="text-white/40 text-sm">Stock que se anticipa antes de agotarse.</p>
            </div>
          </div>

          {/* Órbita central */}
          <div className="order-1 lg:order-2 flex-shrink-0">
            <OrbitingTools />
          </div>

          {/* Features derecha */}
          <div className="flex flex-col gap-6 lg:max-w-xs text-left order-3">
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <h3 className="text-white font-medium mb-1">Asistente IA</h3>
              <p className="text-white/40 text-sm">Respóndete preguntas complejas al instante.</p>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <h3 className="text-white font-medium mb-1">Contactos Unificados</h3>
              <p className="text-white/40 text-sm">Clientes, proveedores y revendedores en un solo lugar.</p>
            </div>
            <div className="p-5 rounded-2xl border border-white/10 bg-white/[0.02] hover:border-white/20 transition-colors">
              <h3 className="text-white font-medium mb-1">Finanzas Claras</h3>
              <p className="text-white/40 text-sm">Detecta fugas y oportunidades de ahorro automáticamente.</p>
            </div>
          </div>
        </div>

        {/* Bullets de puntos clave */}
        <div className="mt-16 flex flex-wrap justify-center gap-6 relative z-10">
          {[
            "Predicciones de demanda precisas",
            "Asistente virtual 24/7",
            "Automatización de reportes",
            "Alertas inteligentes de stock",
            "Análisis de riesgo financiero",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-white/50 text-sm">
              <CheckCircle2 size={15} className="text-white/30" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};



// Sección de Reseñas
const Reviews = () => {
  const reviews = [
    {
      text: "Gestionate Fácil transformó la forma en que manejamos nuestro inventario. Ya no perdemos ventas por falta de stock.",
      author: "Carlos Rodriguez",
      role: "Dueño de Ferretería El Sol"
    },
    {
      text: "La interfaz es increíblemente intuitiva. Pude migrar toda mi base de datos de clientes en cuestión de minutos.",
      author: "Ana Martínez",
      role: "CEO de Boutique Vintage"
    },
    {
      text: "El asistente de IA me ayudó a identificar que productos no eran rentables. Ahorré un 15% en costos operativos.",
      author: "Miguel Torres",
      role: "Fundador de Tech Logistics"
    }
  ];

  return (
    <section className="py-24 px-6 border-t border-gray-800">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold mb-4 text-white">Lo que dicen nuestros clientes</h2>
          <p className="text-gray-400">Empresas que ya operan con mayor eficiencia gracias a nosotros.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((r, i) => (
            <div key={i} className="p-8 rounded-2xl border border-gray-800 bg-gray-900/20">
              <div className="flex gap-1 mb-6 text-white opacity-40">
                {[1,2,3,4,5].map(s => <Star key={s} size={14} fill="currentColor" />)}
              </div>
              <p className="text-gray-300 italic mb-8 mb-6 leading-relaxed">"{r.text}"</p>
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                   {r.author[0]}
                 </div>
                 <div className="flex flex-col">
                    <span className="text-sm font-semibold text-white">{r.author}</span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">{r.role}</span>
                 </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// Componente Principal
export default function Component() {
  const [activeLegalModal, setActiveLegalModal] = React.useState(null);

  const socialLinks = [
    { icon: <InstagramIcon />, href: "https://instagram.com", label: "Instagram" },
    { icon: <WhatsappIcon />, href: "https://whatsapp.com", label: "WhatsApp" },
    { icon: <FacebookIcon />, href: "https://facebook.com", label: "Facebook" },
  ];

  const navLinks = [
    { label: "Funciones", href: "#features" },
    { label: "Inteligencia Artificial", href: "#ai" },
    { label: "Planes", href: "#pricing" },
    { 
      label: "Privacidad", 
      href: "#", 
      onClick: (e) => { e.preventDefault(); setActiveLegalModal('privacy'); } 
    },
    { 
      label: "Términos", 
      href: "#", 
      onClick: (e) => { e.preventDefault(); setActiveLegalModal('terms'); } 
    },
    { label: "Contacto", href: "/contacto" },
  ];

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Navigation />
      <Hero />
      <Features />
      <AIHighlight />
      <PricingSection />
      <Reviews />
      <AnimatedFooter
        brandName="Gestionate Fácil"
        brandDescription="La plataforma de gestión todo-en-uno para que tu negocio crezca con inteligencia artificial."
        brandIcon={<img src={BrandLogo} alt="Logo" className="w-10 sm:w-14 md:w-20 h-auto object-contain" />}
        socialLinks={socialLinks}
        navLinks={navLinks}
      />

      <Modal
        isOpen={!!activeLegalModal}
        onClose={() => setActiveLegalModal(null)}
        title={activeLegalModal ? legalContent[activeLegalModal].title : ""}
      >
        <div className="prose prose-invert max-w-none">
          {activeLegalModal && legalContent[activeLegalModal].content.split('\n').map((line, i) => (
            <p key={i} className="text-white/70 mb-4 leading-relaxed whitespace-pre-line">
              {line.trim()}
            </p>
          ))}
        </div>
      </Modal>
    </main>
  );
}
