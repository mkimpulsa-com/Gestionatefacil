import React from "react";
import { Link } from "react-router-dom";
import { Marquee } from "../components/ui/marquee";
import { ArrowLeft, UserStar, Mail, MessageSquare } from "lucide-react";

const teamMembers = [
  {
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&h=600&auto=format&fit=crop",
    name: "Patricio Stewart",
    role: "CEO - Fundador",
  },
  {
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&h=600&auto=format&fit=crop",
    name: "Elena Rosser",
    role: "Directora de Contenido",
  },
  {
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&h=600&auto=format&fit=crop",
    name: "Felipe Skinner",
    role: "Gerente de Tecnología",
  },
  {
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&h=600&auto=format&fit=crop",
    name: "Marcos Spector",
    role: "Director Creativo",
  },
  {
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&h=600&auto=format&fit=crop",
    name: "Natalia Skinner",
    role: "Investigadora Senior",
  },
  {
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&h=600&auto=format&fit=crop",
    name: "David Kim",
    role: "Líder de Ingeniería",
  },
];

export function Contacto() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-poppins">
      
      {/* Botón Volver */}
      <div className="fixed top-8 left-8 z-50">
        <Link 
          to="/" 
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-md hover:bg-white/20 transition-all group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Regresar al Inicio</span>
        </Link>
      </div>

      <section className="relative w-full overflow-hidden pt-32 pb-12 md:pb-24">
        {/* Background SVG Decor */}
        <div className="absolute top-0 right-0 pointer-events-none opacity-20">
          <svg
            className="text-neutral-500"
            fill="none"
            height="300"
            viewBox="0 0 460 154"
            width="900"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clipPath="url(#clip0_494_1104)">
              <path
                d="M-87.463 458.432C-102.118 348.092 -77.3418 238.841 -15.0744 188.274C57.4129 129.408 180.708 150.071 351.748 341.128C278.246 -374.233 633.954 380.602 548.123 42.7707"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="40"
              />
            </g>
            <defs>
              <clipPath id="clip0_494_1104">
                <rect fill="white" height="154" width="460" />
              </clipPath>
            </defs>
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mx-auto mb-16 flex max-w-5xl flex-col items-center px-6 text-center lg:px-0">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-black shadow-[0_0_30px_rgba(255,255,255,0.2)]">
              <MessageSquare size={32} />
            </div>

            <h1 className="relative mb-6 font-bold text-4xl md:text-6xl text-white tracking-tight">
              Nuestro Equipo de fundadores
              <svg
                className="absolute -top-6 -right-12 -z-10 w-24 text-white/5"
                fill="currentColor"
                height="86"
                viewBox="0 0 108 86"
                width="108"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M38.8484 16.236L15 43.5793L78.2688 15L18.1218 71L93 34.1172L70.2047 65.2739"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="28"
                />
              </svg>
            </h1>
            <p className="max-w-2xl text-white/50 text-lg leading-relaxed">
              En Gestionate Fácil, conectamos tu negocio con las soluciones tecnológicas más avanzadas,
              respaldadas por un equipo humano de clase, comprometido con tu éxito.
            </p>
          </div>

          <div className="relative w-full overflow-hidden py-10">
            {/* Sombras laterales para el efecto de desvanecimiento */}
            <div className="pointer-events-none absolute top-0 left-0 z-10 h-full w-40 bg-gradient-to-r from-black to-transparent" />
            <div className="pointer-events-none absolute top-0 right-0 z-10 h-full w-40 bg-gradient-to-l from-black to-transparent" />

            <Marquee className="[--gap:2rem] [--duration:50s]" pauseOnHover>
              {teamMembers.map((member) => (
                <div
                  className="group flex w-72 shrink-0 flex-col px-4"
                  key={member.name}
                >
                  <div className="relative h-[24rem] w-full overflow-hidden rounded-3xl bg-neutral-900 border border-white/5 transition-all duration-500 group-hover:border-white/20 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">
                    <img
                      alt={member.name}
                      className="h-full w-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105"
                      src={member.image}
                    />
                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 p-4 transform transition-all duration-500 group-hover:translate-y-[-5px]">
                      <h3 className="font-bold text-white text-lg">
                        {member.name}
                      </h3>
                      <p className="text-white/40 text-sm">
                        {member.role}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </Marquee>
          </div>

          <div className="mx-auto mt-24 max-w-3xl px-6 text-center lg:px-0">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-white/40 text-sm mb-8">
              <Mail size={16} />
              <span>contacto@gestionate-facil.com</span>
            </div>
            
            <p className="mb-10 font-medium text-xl md:text-3xl text-white leading-tight">
              "El soporte excepcional de Gestionate Fácil realmente nos impresionó. 
              Sugerimos una mejora y su equipo la implementó con una rapidez asombrosa."
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white/20">
                <img
                  alt="Natalia Kara"
                  className="h-full w-full object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=150&h=150&auto=format&fit=crop"
                />
              </div>
              <div className="text-center">
                <p className="font-bold text-white text-lg">
                  Natalia Kara
                </p>
                <p className="text-white/40 text-sm uppercase tracking-widest">
                  Directora de Operaciones · Cnippet Collection
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
