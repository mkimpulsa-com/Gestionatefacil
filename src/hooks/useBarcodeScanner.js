import { useEffect, useRef } from 'react';

/**
 * Hook para detectar lecturas de escáner de código de barras.
 * @param {function} onScan - Callback ejecutado cuando se detecta un código válido.
 */
export function useBarcodeScanner(onScan, isActive = true) {
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);

  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      const currentTime = Date.now();
      
      // Si el tiempo entre teclas es mayor a 50ms, asumimos que es una persona escribiendo y reiniciamos el buffer
      if (currentTime - lastKeyTime.current > 50) {
        barcodeBuffer.current = '';
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          // Es probable que sea un código de barras (escrito muy rápido)
          const scannedCode = barcodeBuffer.current;
          barcodeBuffer.current = '';
          
          // Prevenir el comportamiento por defecto (ej. enviar formularios)
          e.preventDefault();
          e.stopPropagation();
          
          onScan(scannedCode);
        }
      } else if (e.key.length === 1) {
        // Ignorar teclas modificadoras u otras teclas de control
        barcodeBuffer.current += e.key;
      }

      lastKeyTime.current = currentTime;
    };

    // Escuchar a nivel global
    window.addEventListener('keydown', handleKeyDown, true);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onScan, isActive]);
}
