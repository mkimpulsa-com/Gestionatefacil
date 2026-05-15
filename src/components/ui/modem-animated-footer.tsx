import React from "react";
import { Zap } from "lucide-react";

interface FooterLink {
  label: string;
  href: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}

interface FooterProps {
  brandName?: string;
  brandDescription?: string;
  socialLinks?: SocialLink[];
  navLinks?: FooterLink[];
  creatorName?: string;
  creatorUrl?: string;
  brandIcon?: React.ReactNode;
  className?: string;
}

export const AnimatedFooter = ({
  brandName = "Gestionate Fácil",
  brandDescription = "Tu descripción aquí",
  socialLinks = [],
  navLinks = [],
  creatorName,
  creatorUrl,
  brandIcon,
  className = "",
}: FooterProps) => {
  return (
    <footer className={`relative w-full border-t border-gray-800 bg-black overflow-hidden ${className}`}>

      {/* Texto grande de fondo */}
      <div
        className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none select-none"
        aria-hidden="true"
      >
        <span
          className="leading-none font-extrabold tracking-tighter text-center px-4 w-full"
          style={{
            fontSize: "clamp(3rem, 12vw, 10rem)",
            maxWidth: "95vw",
            background: "linear-gradient(to bottom, rgba(255,255,255,0.25), rgba(255,255,255,0.1), transparent)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {brandName.toUpperCase()}
        </span>
      </div>



      <div className="max-w-7xl mx-auto px-4 relative z-20">

        {/* Logo central flotante */}
        <div className="flex justify-center pt-12 pb-8">
          <div className="hover:border-white/40 duration-300 drop-shadow-[0_0px_20px_rgba(255,255,255,0.15)] backdrop-blur-sm rounded-3xl bg-black/60 border border-gray-700 flex items-center justify-center p-3">
            <div className="w-12 sm:w-16 md:w-24 h-12 sm:h-16 md:h-24 bg-gradient-to-br from-white to-gray-300 rounded-2xl flex items-center justify-center shadow-lg">
              {brandIcon || (
                <Zap className="w-8 sm:w-10 md:w-14 h-8 sm:h-10 md:h-14 text-black drop-shadow-lg" fill="currentColor" />
              )}
            </div>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent w-full mb-10" />

        {/* Nombre de marca y descripción */}
        <div className="flex flex-col items-center mb-8">
          <span className="text-white text-3xl font-bold mb-2">{brandName}</span>
          <p className="text-gray-400 font-medium text-center max-w-sm px-4">{brandDescription}</p>
        </div>

        {/* Redes sociales */}
        {socialLinks.length > 0 && (
          <div className="flex justify-center mb-6 gap-5">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.href}
                className="text-gray-400 hover:text-white transition-colors"
                target="_blank"
                rel="noopener noreferrer"
              >
                <div className="w-6 h-6 hover:scale-110 duration-300">{link.icon}</div>
                <span className="sr-only">{link.label}</span>
              </a>
            ))}
          </div>
        )}

        {/* Links de navegación */}
        {navLinks.length > 0 && (
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-400 mb-12 px-4">
            {navLinks.map((link, index) => (
              <a
                key={index}
                className="hover:text-white duration-300 hover:font-semibold transition-colors cursor-pointer"
                href={link.href}
                onClick={link.onClick}
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Espacio para el texto de fondo grande */}
        <div className="h-24 sm:h-28 md:h-36" />

      </div>

      {/* Copyright — siempre al fondo */}
      <div className="relative z-20 border-t border-gray-800/60 px-4 py-5">
        <div className="max-w-7xl mx-auto flex flex-col gap-2 md:gap-1 items-center justify-center md:flex-row md:items-center md:justify-between">
          <p className="text-base text-gray-500 text-center md:text-left">
            ©{new Date().getFullYear()} {brandName}
          </p>
          {creatorName && creatorUrl && (
            <nav className="flex gap-4">
              <a
                href={creatorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base text-gray-500 hover:text-white transition-colors duration-300 hover:font-medium"
              >
                Desarrollado por {creatorName}
              </a>
            </nav>
          )}
        </div>
      </div>

    </footer>
  );
};
