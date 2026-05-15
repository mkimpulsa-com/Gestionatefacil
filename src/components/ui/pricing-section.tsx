import { useState, useId } from "react";
import { motion } from "framer-motion";
import NumberFlow from "@number-flow/react";
import { CheckCircle2, Zap, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

// Toggle Switch estilo plantilla original
const PricingSwitch = ({
  button1,
  button2,
  onSwitch,
  badge,
}: {
  button1: string;
  button2: string;
  onSwitch: (value: string) => void;
  badge?: string;
}) => {
  const [selected, setSelected] = useState("0");
  const uid = useId();

  const handleSwitch = (value: string) => {
    setSelected(value);
    onSwitch(value);
  };

  return (
    <div className="relative z-10 flex rounded-full bg-white/5 border border-white/10 p-1 w-full max-w-xs mx-auto">
      <button
        onClick={() => handleSwitch("0")}
        className={`relative z-10 w-full h-10 rounded-full px-6 py-1 text-sm font-medium transition-colors ${
          selected === "0" ? "text-white" : "text-white/40 hover:text-white/70"
        }`}
      >
        {selected === "0" && (
          <motion.span
            layoutId={`switch-${uid}`}
            className="absolute top-0 left-0 h-10 w-full rounded-full border border-white/20 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 shadow-md"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative">{button1}</span>
      </button>

      <button
        onClick={() => handleSwitch("1")}
        className={`relative z-10 w-full h-10 rounded-full px-6 py-1 text-sm font-medium transition-colors ${
          selected === "1" ? "text-white" : "text-white/40 hover:text-white/70"
        }`}
      >
        {selected === "1" && (
          <motion.span
            layoutId={`switch-${uid}`}
            className="absolute top-0 left-0 h-10 w-full rounded-full border border-white/20 bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 shadow-md"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
        <span className="relative flex items-center justify-center gap-2">
          {button2}
          {badge && (
            <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-500/30">
              {badge}
            </span>
          )}
        </span>
      </button>
    </div>
  );
};

// Card de plan individual
interface PlanCardProps {
  name: string;
  monthlyPrice: number | null;
  annualPrice: number | null;
  features: string[];
  isAnnual: boolean;
  popular?: boolean;
  custom?: boolean;
  cta: string;
}

const PlanCard = ({
  name,
  monthlyPrice,
  annualPrice,
  features,
  isAnnual,
  popular,
  custom,
  cta,
}: PlanCardProps) => {
  const price = isAnnual ? annualPrice : monthlyPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={`relative flex flex-col p-8 rounded-2xl border ${
        popular
          ? "border-white bg-white/5 shadow-[0_0_40px_rgba(255,255,255,0.05)]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white text-black text-[10px] font-bold rounded-full uppercase tracking-widest">
          Más Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
        {custom ? (
          <div className="mt-4">
            <span className="text-3xl font-bold text-white">A medida</span>
            <p className="text-white/40 text-sm mt-1">Adaptado a tu empresa</p>
          </div>
        ) : (
          <div className="flex items-baseline gap-1 mt-4">
            <span className="text-5xl font-semibold text-white">
              $
              <NumberFlow
                value={price as number}
                className="text-5xl font-semibold text-white"
                willChange
              />
            </span>
            <span className="text-white/40 text-sm">{isAnnual ? '/año' : '/mes'}</span>
            {/* Removido 'facturado anualmente' a pedido del usuario */}
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-3 flex-1 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm text-white/60">
            <CheckCircle2 size={15} className={popular ? "text-white" : "text-white/30"} />
            {f}
          </li>
        ))}
      </ul>

      <Link to="/login">
        <button
          className={`w-full h-12 rounded-full font-medium text-sm transition-all flex items-center justify-center gap-2 ${
            popular
              ? "bg-white text-black hover:bg-white/90"
              : custom
              ? "border border-white/20 text-white hover:bg-white/5"
              : "border border-white/10 text-white hover:bg-white/5"
          }`}
        >
          {cta}
          <ArrowRight size={15} />
        </button>
      </Link>
    </motion.div>
  );
};

// Sección principal de precios
export const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const plans: PlanCardProps[] = [
    {
      name: "Emprendedor",
      monthlyPrice: 0,
      annualPrice: 0,
      features: [
        "Prueba FULL por 7 días",
        "Todas las funciones Pro liberadas",
        "IA Predictiva y Analíticas",
        "Sin tarjeta de crédito",
      ],
      isAnnual,
      cta: "Empezar Gratis",
    },
    {
      name: "Negocio",
      monthlyPrice: 19900,
      annualPrice: 191040,
      features: [
        "Contactos ilimitados",
        "IA Predictiva incluida",
        "Analíticas avanzadas",
        "Ventas e inventario Pro",
        "Soporte prioritario 24/7",
      ],
      isAnnual,
      popular: true,
      cta: "Comenzar ahora",
    },
    {
      name: "Empresa",
      monthlyPrice: null,
      annualPrice: null,
      features: [
        "Todo lo del plan Negocio",
        "Personalización total",
        "API de Integración propia",
        "Account Manager dedicado",
        "SLA y contrato garantizado",
      ],
      isAnnual,
      custom: true,
      cta: "Contactar Ventas",
    },
  ];

  return (
    <section id="pricing" className="py-28 px-6 border-t border-white/10 bg-black relative overflow-hidden">
      {/* glow de fondo */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full bg-white/[0.02] blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs mb-6">
            <Zap size={12} className="text-white" fill="currentColor" />
            <span>Planes y Precios</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-semibold text-white mb-4 leading-tight tracking-tight">
            Planes diseñados para crecer
          </h2>
          <p className="text-white/40 text-lg mb-10">
            Escoge el plan que mejor se adapte al tamaño de tu empresa hoy.
          </p>

          {/* Toggle Mensual / Anual */}
          <PricingSwitch
            button1="Mensual"
            button2="Anual"
            badge="-20%"
            onSwitch={(v) => setIsAnnual(v === "1")}
          />
        </div>

        {/* Cards de planes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <PlanCard key={i} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
};
