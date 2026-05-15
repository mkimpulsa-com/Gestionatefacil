import { useState, useRef, useEffect, useMemo } from 'react';
import { Package, Search, ChevronDown } from 'lucide-react';
import './ProductSelector.css';

export function ProductSelector({ products, value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);

  // Determinar producto seleccionado
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === value) || null;
  }, [products, value]);

  // Actualizar el buscardor si cambia el seleccionado
  useEffect(() => {
    if (selectedProduct && !isOpen) {
      setSearchTerm(selectedProduct.name);
    } else if (!selectedProduct && !isOpen) {
      setSearchTerm('');
    }
  }, [selectedProduct, isOpen]);

  // Cerrar al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
        if (selectedProduct) {
          setSearchTerm(selectedProduct.name);
        } else {
          setSearchTerm('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedProduct]);

  // Filtrar base a la busqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm || (selectedProduct && searchTerm === selectedProduct.name)) {
      return products || [];
    }
    const lower = String(searchTerm).toLowerCase();
    return (products || []).filter(p => {
      const name = p.name ? String(p.name).toLowerCase() : '';
      const brand = p.brand ? String(p.brand).toLowerCase() : '';
      return name.includes(lower) || brand.includes(lower);
    });
  }, [products, searchTerm, selectedProduct]);

  const handleSelect = (product) => {
    setSearchTerm(product.name);
    setIsOpen(false);
    onChange(product.id);
  };

  return (
    <div className="product-selector" ref={wrapperRef}>
      <div className="selector-input-container">
        {selectedProduct && selectedProduct.imageUrl ? (
          <img src={selectedProduct.imageUrl} alt="img" className="selector-icon-img" />
        ) : (
          <Search size={14} className="selector-icon" />
        )}
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Buscar producto..." 
          className="selector-input"
        />
        <ChevronDown size={14} className="selector-chevron" onClick={() => setIsOpen(!isOpen)} />
      </div>

      {isOpen && (
        <div className="selector-dropdown">
          <ul className="selector-list">
            {filteredProducts.length === 0 ? (
              <li className="selector-empty">No se encontraron productos</li>
            ) : (
              filteredProducts.map(p => (
                <li key={p.id} className="selector-item" onClick={() => handleSelect(p)}>
                  <div className="item-img-container">
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt={p.name} />
                    ) : (
                      <Package size={16} style={{opacity: 0.5}} />
                    )}
                  </div>
                  <div className="item-details">
                    <span className="item-name">{p.name}</span>
                    <span className={`item-stock ${p.stock <= 0 ? 'out' : ''}`}>
                      {p.stock > 0 ? `Stock: ${p.stock}` : 'Sin stock'}
                    </span>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
