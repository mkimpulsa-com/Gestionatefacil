import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Search, Package, Box, Filter } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { SkeletonCard } from '../components/ui/Skeleton';
import './CatalogoPublico.css';

export function CatalogoPublico() {
  const { userId } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selection, setSelection] = useState({});

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        setLoading(true);
        // Traer solo los productos del usuario que estén activos
        const q = query(
          collection(db, 'products'), 
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Asegurar que filtramos por isActive y showInCatalog en el lado del cliente también por seguridad y compatibilidad
        const activeProducts = productsData.filter(p => p.isActive !== false && p.showInCatalog !== false); 
        setProducts(activeProducts);
      } catch (error) {
        console.error("Error al cargar catálogo:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchCompanyData = async () => {
      try {
        const docRef = doc(db, 'companies', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCompanyData(docSnap.data());
        }
      } catch (error) {
        console.error("Error al cargar empresa:", error);
      }
    };

    if (userId) {
      fetchCatalog();
      fetchCompanyData();
    }
  }, [userId]);

  const categories = ['Todas', ...new Set(products.map(p => p.category).filter(Boolean))];

  const filteredProducts = products.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="catalogo-publico-container">
      <header className="catalogo-header">
        {companyData?.logoUrl && (
          <img 
            src={companyData.logoUrl} 
            alt={`Logo de ${companyData.name || 'la empresa'}`} 
            className="catalogo-company-logo" 
          />
        )}
        <h1 className="catalogo-title">{companyData?.name || 'Catálogo Digital'}</h1>
        <p className="catalogo-subtitle">Explora nuestros productos disponibles</p>
      </header>

      <div className="catalogo-categories-wrapper">
        <div className="catalogo-categories">
          {categories.map(cat => (
            <button 
              key={cat} 
              className={`category-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="catalogo-search-bar">
        <Search size={20} className="search-icon" />
        <input 
          type="text" 
          placeholder="Buscar por producto, marca o categoría..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="catalogo-grid">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="empty-state-public">
          <Box size={48} className="icon" />
          <h2>No hay productos disponibles</h2>
          <p>Intenta buscar con otros términos o regresa más tarde.</p>
        </div>
      ) : (
        <div className="catalogo-grid">
          {filteredProducts.map(product => {
            const hasStock = product.stock > 0;

            return (
              <div 
                key={product.id} 
                className="product-card-public"
                onClick={() => {
                  setSelectedProduct(product);
                  setIsModalOpen(true);
                }}
              >
                <div className="product-image">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} loading="lazy" />
                  ) : (
                    <Package size={48} className="fallback-icon" />
                  )}
                </div>
                
                <div className="product-info">
                  {product.brand && <div className="product-brand">{product.brand}</div>}
                  <h3 className="product-name">{product.name}</h3>
                  
                  <div className="product-meta">
                    {product.category && <span className="public-tag">{product.category}</span>}
                    {product.size && <span className="public-tag">Talle: {product.size}</span>}
                    {product.color && <span className="public-tag">Color: {product.color}</span>}
                  </div>

                  <div className="product-footer">
                    <div className="product-price">
                      {product.sellingPrice ? (
                        String(product.sellingPrice).startsWith('$') 
                          ? product.sellingPrice 
                          : `$${product.sellingPrice}`
                      ) : 'Consultar'}
                    </div>
                    <div className={`stock-badge ${hasStock ? 'in-stock' : 'out-of-stock'}`}>
                      {hasStock ? 'En stock' : 'Agotado'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelection({});
          setTimeout(() => setSelectedProduct(null), 300);
        }}
        title="Detalle del Producto"
      >
        {selectedProduct && (() => {
          const hasVariants = selectedProduct.hasVariants && selectedProduct.variants?.length > 0;

          // Calculate available stock based on current selection
          let displayStock = selectedProduct.stock;
          let matchingVariants = [];
          
          if (hasVariants) {
            matchingVariants = selectedProduct.variants.filter(v => 
              Object.entries(selection).every(([key, val]) => v.attributes[key] === val)
            );
            
            if (Object.keys(selection).length > 0) {
              displayStock = matchingVariants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0);
            }
          }

          // If a specific variant is selected (full match), use its image/price
          const currentVariant = matchingVariants.length === 1 ? matchingVariants[0] : matchingVariants[0]; 
          // Note: matchingVariants[0] is used as a fallback for image/price if only partial selection
          
          const displayImage = currentVariant?.imageUrl || selectedProduct.imageUrl;
          const displayPrice = currentVariant?.price || selectedProduct.sellingPrice;

          return (
            <div className="public-modal-content">
              <div className="public-modal-image-container">
                {displayImage ? (
                  <img src={displayImage} alt={selectedProduct.name} className="public-modal-image" />
                ) : (
                  <Package size={64} className="fallback-icon" />
                )}
              </div>
              
              <div className="public-modal-details">
                <div className="product-meta" style={{marginBottom: 0}}>
                  {selectedProduct.brand && <span className="public-modal-brand">{selectedProduct.brand}</span>}
                  <div className={`stock-badge ${displayStock > 0 ? 'in-stock' : 'out-of-stock'}`} style={{marginLeft: 'auto'}}>
                    {displayStock > 0 ? `En stock (${displayStock})` : 'Agotado'}
                  </div>
                </div>

                <h2 className="public-modal-title">{selectedProduct.name}</h2>
                <div className="public-modal-price">
                  {displayPrice ? (
                    String(displayPrice).startsWith('$') 
                      ? displayPrice 
                      : `$${displayPrice}`
                  ) : 'Consultar Precio'}
                </div>

                {hasVariants && (
                  <div className="public-modal-variants">
                    {selectedProduct.variantOptions.map((opt) => (
                      <div key={opt.name} className="variant-selector-group">
                        <span className="variant-selector-label">{opt.name}</span>
                        <div className="variant-chips">
                          {opt.values.map(val => {
                            const isSelected = selection[opt.name] === val;
                            
                            // Check if this specific value exists in any variant given the OTHER selections
                            const isAvailable = selectedProduct.variants.some(v => {
                              // Case-insensitive comparison for the current attribute
                              const vAttrVal = String(v.attributes[opt.name] || '').toLowerCase().trim();
                              const targetVal = String(val || '').toLowerCase().trim();
                              if (vAttrVal !== targetVal) return false;

                              // Check all OTHER current selections (also case-insensitive)
                              return Object.entries(selection).every(([sKey, sVal]) => {
                                if (sKey === opt.name) return true;
                                const vSVal = String(v.attributes[sKey] || '').toLowerCase().trim();
                                const targetSVal = String(sVal || '').toLowerCase().trim();
                                return vSVal === targetSVal;
                              });
                            });

                            return (
                              <button 
                                key={val}
                                className={`variant-chip ${isSelected ? 'selected' : ''} ${!isAvailable ? 'disabled' : ''}`}
                                onClick={() => {
                                  if (isAvailable) {
                                    setSelection({...selection, [opt.name]: val});
                                  }
                                }}
                                disabled={!isAvailable}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {(!hasVariants && (selectedProduct.category || selectedProduct.size || selectedProduct.color)) && (
                  <div className="public-modal-properties">
                    {selectedProduct.category && (
                      <div className="public-modal-property">
                        <span className="public-modal-property-label">Categoría</span>
                        <span className="public-modal-property-value">{selectedProduct.category}</span>
                      </div>
                    )}
                    {selectedProduct.size && (
                      <div className="public-modal-property">
                        <span className="public-modal-property-label">Talle</span>
                        <span className="public-modal-property-value">{selectedProduct.size}</span>
                      </div>
                    )}
                    {selectedProduct.color && (
                      <div className="public-modal-property">
                        <span className="public-modal-property-label">Color</span>
                        <span className="public-modal-property-value">{selectedProduct.color}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedProduct.description && (
                  <div className="public-modal-description">
                    {selectedProduct.description}
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
