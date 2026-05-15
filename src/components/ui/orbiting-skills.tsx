import { useEffect, useState, memo } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Brain,
  Users,
  DollarSign,
} from "lucide-react";

// Configuración de herramientas del sistema
type GlowColor = "cyan" | "purple";

interface ToolConfig {
  id: string;
  orbitRadius: number;
  size: number;
  speed: number;
  phaseShift: number;
  glowColor: GlowColor;
  label: string;
  icon: React.ReactNode;
  color: string;
}

interface OrbitingToolProps {
  config: ToolConfig;
  angle: number;
}

interface GlowingOrbitPathProps {
  radius: number;
  glowColor?: GlowColor;
  animationDelay?: number;
}

// Configuración de las herramientas en órbita
const toolsConfig: ToolConfig[] = [
  // Órbita interna
  {
    id: "dashboard",
    orbitRadius: 100,
    size: 44,
    speed: 0.8,
    phaseShift: 0,
    glowColor: "cyan",
    label: "Panel de Control",
    icon: <LayoutDashboard className="w-5 h-5" />,
    color: "#3b82f6",
  },
  {
    id: "ventas",
    orbitRadius: 100,
    size: 44,
    speed: 0.8,
    phaseShift: (2 * Math.PI) / 3,
    glowColor: "cyan",
    label: "Ventas",
    icon: <ShoppingCart className="w-5 h-5" />,
    color: "#15803d",
  },
  {
    id: "stock",
    orbitRadius: 100,
    size: 44,
    speed: 0.8,
    phaseShift: (4 * Math.PI) / 3,
    glowColor: "cyan",
    label: "Inventario",
    icon: <Package className="w-5 h-5" />,
    color: "#f59e0b",
  },
  // Órbita externa
  {
    id: "ai",
    orbitRadius: 182,
    size: 52,
    speed: -0.5,
    phaseShift: 0,
    glowColor: "purple",
    label: "Asistente IA",
    icon: <Brain className="w-6 h-6" />,
    color: "#8b5cf6",
  },
  {
    id: "contactos",
    orbitRadius: 182,
    size: 52,
    speed: -0.5,
    phaseShift: (2 * Math.PI) / 3,
    glowColor: "purple",
    label: "Contactos",
    icon: <Users className="w-6 h-6" />,
    color: "#ec4899",
  },
  {
    id: "finanzas",
    orbitRadius: 182,
    size: 52,
    speed: -0.5,
    phaseShift: (4 * Math.PI) / 3,
    glowColor: "purple",
    label: "Finanzas",
    icon: <DollarSign className="w-6 h-6" />,
    color: "#22d3ee",
  },
];

// Herramienta en órbita individual
const OrbitingTool = memo(({ config, angle }: OrbitingToolProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { orbitRadius, size, icon, label, color } = config;

  const x = Math.cos(angle) * orbitRadius;
  const y = Math.sin(angle) * orbitRadius;

  return (
    <div
      className="absolute top-1/2 left-1/2 transition-transform duration-300 ease-out"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
        zIndex: isHovered ? 20 : 10,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className="relative w-full h-full rounded-full bg-black/80 border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-300"
        style={{
          color: color,
          boxShadow: isHovered
            ? `0 0 24px ${color}60, 0 0 48px ${color}30`
            : `0 0 8px ${color}20`,
          transform: isHovered ? "scale(1.25)" : "scale(1)",
        }}
      >
        {icon}
        {isHovered && (
          <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/90 border border-white/10 rounded-full text-[11px] text-white whitespace-nowrap pointer-events-none">
            {label}
          </div>
        )}
      </div>
    </div>
  );
});
OrbitingTool.displayName = "OrbitingTool";

// Anillo de órbita con brillo
const GlowingOrbitPath = memo(
  ({ radius, glowColor = "cyan", animationDelay = 0 }: GlowingOrbitPathProps) => {
    const glowColors = {
      cyan: {
        primary: "rgba(59, 130, 246, 0.3)",
        secondary: "rgba(59, 130, 246, 0.1)",
        border: "rgba(59, 130, 246, 0.2)",
      },
      purple: {
        primary: "rgba(139, 92, 246, 0.3)",
        secondary: "rgba(139, 92, 246, 0.1)",
        border: "rgba(139, 92, 246, 0.2)",
      },
    };

    const colors = glowColors[glowColor];

    return (
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
        style={{ width: `${radius * 2}px`, height: `${radius * 2}px` }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, transparent 30%, ${colors.secondary} 70%, ${colors.primary} 100%)`,
            animationDelay: `${animationDelay}s`,
          }}
        />
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: `1px solid ${colors.border}`,
          }}
        />
      </div>
    );
  }
);
GlowingOrbitPath.displayName = "GlowingOrbitPath";

// Componente principal
export default function OrbitingTools() {
  const [time, setTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    let frameId: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const dt = (currentTime - lastTime) / 1000;
      lastTime = currentTime;
      setTime((prev) => prev + dt);
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPaused]);

  return (
    <div
      className="relative w-[380px] h-[380px] md:w-[460px] md:h-[460px] flex items-center justify-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Núcleo central - IA */}
      <div className="relative z-20 w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl animate-pulse" />
        <div
          className="absolute inset-0 rounded-full bg-purple-500/20 blur-2xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
        <Brain
          size={36}
          className="relative z-10 text-white"
          style={{ filter: "drop-shadow(0 0 12px rgba(139, 92, 246, 0.8))" }}
        />
      </div>

      {/* Anillos de órbita */}
      <GlowingOrbitPath radius={100} glowColor="cyan" animationDelay={0} />
      <GlowingOrbitPath radius={182} glowColor="purple" animationDelay={1.5} />

      {/* Herramientas orbitando */}
      {toolsConfig.map((config) => {
        const angle = time * config.speed + config.phaseShift;
        return <OrbitingTool key={config.id} config={config} angle={angle} />;
      })}
    </div>
  );
}

