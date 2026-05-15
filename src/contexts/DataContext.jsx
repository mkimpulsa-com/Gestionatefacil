import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const DataContext = createContext();

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData debe usarse dentro de un DataProvider');
  }
  return context;
}

export function DataProvider({ children }) {
  const { currentUser } = useAuth();
  
  const [inventory, setInventory] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [banks, setBanks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [deals, setDeals] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [otherIncomes, setOtherIncomes] = useState([]);
  
  const [loading, setLoading] = useState({
    inventory: true,
    contacts: true,
    banks: true,
    categories: true,
    brands: true,
    deals: true,
    purchases: true,
    expenses: true,
    otherIncomes: true,
  });

  useEffect(() => {
    if (!currentUser) {
      setInventory([]);
      setContacts([]);
      setBanks([]);
      setCategories([]);
      setBrands([]);
      setDeals([]);
      setPurchases([]);
      setExpenses([]);
      setOtherIncomes([]);
      return;
    }

    // El administrador no necesita la carga de datos estándar del usuario
    const isAdmin = currentUser.email?.toLowerCase() === 'guananjacarlosenrique@gmail.com';
    if (isAdmin) {
      setLoading({
        inventory: false,
        contacts: false,
        banks: false,
        categories: false,
        brands: false,
        deals: false,
        purchases: false,
        expenses: false,
        otherIncomes: false,
      });
      return;
    }

    const userId = currentUser.uid;

    const unsubscribes = [
      // Ventas / Oportunidades
      onSnapshot(
        query(collection(db, 'deals'), where('userId', '==', userId)),
        (snapshot) => {
          setDeals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, deals: false }));
        },
        (error) => {
          console.error("Error loading deals:", error);
          setLoading(prev => ({ ...prev, deals: false }));
        }
      ),

      // Compras
      onSnapshot(
        query(collection(db, 'purchases'), where('userId', '==', userId)),
        (snapshot) => {
          setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, purchases: false }));
        },
        (error) => {
          console.error("Error loading purchases:", error);
          setLoading(prev => ({ ...prev, purchases: false }));
        }
      ),

      // Gastos
      onSnapshot(
        query(collection(db, 'expenses'), where('userId', '==', userId)),
        (snapshot) => {
          setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, expenses: false }));
        },
        (error) => {
          console.error("Error loading expenses:", error);
          setLoading(prev => ({ ...prev, expenses: false }));
        }
      ),
      
      // Otros Ingresos
      onSnapshot(
        query(collection(db, 'otherIncomes'), where('userId', '==', userId)),
        (snapshot) => {
          setOtherIncomes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, otherIncomes: false }));
        },
        (error) => {
          console.error("Error loading otherIncomes:", error);
          setLoading(prev => ({ ...prev, otherIncomes: false }));
        }
      ),

      // Inventario
      onSnapshot(
        query(collection(db, 'products'), where('userId', '==', userId)),
        (snapshot) => {
          setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, inventory: false }));
        },
        (error) => {
          console.error("Error loading products:", error);
          setLoading(prev => ({ ...prev, inventory: false }));
        }
      ),

      // Contactos
      onSnapshot(
        query(collection(db, 'clients'), where('userId', '==', userId)),
        (snapshot) => {
          setContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, contacts: false }));
        },
        (error) => {
          console.error("Error loading contacts:", error);
          setLoading(prev => ({ ...prev, contacts: false }));
        }
      ),

      // Bancos
      onSnapshot(
        query(collection(db, 'bankAccounts'), where('userId', '==', userId)),
        (snapshot) => {
          setBanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, banks: false }));
        },
        (error) => {
          console.error("Error loading banks:", error);
          setLoading(prev => ({ ...prev, banks: false }));
        }
      ),

      // Categorías
      onSnapshot(
        query(collection(db, 'product_categories'), where('userId', '==', userId)),
        (snapshot) => {
          setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, categories: false }));
        },
        (error) => {
          console.error("Error loading categories:", error);
          setLoading(prev => ({ ...prev, categories: false }));
        }
      ),

      // Marcas
      onSnapshot(
        query(collection(db, 'product_brands'), where('userId', '==', userId)),
        (snapshot) => {
          setBrands(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          setLoading(prev => ({ ...prev, brands: false }));
        },
        (error) => {
          console.error("Error loading brands:", error);
          setLoading(prev => ({ ...prev, brands: false }));
        }
      ),
    ];

    return () => unsubscribes.forEach(unsub => unsub());
  }, [currentUser]);

  const value = {
    inventory,
    contacts,
    banks,
    categories,
    brands,
    deals,
    purchases,
    expenses,
    otherIncomes,
    isLoading: loading.inventory || loading.contacts || loading.banks || loading.categories || loading.brands || loading.deals || loading.purchases || loading.expenses || loading.otherIncomes,
    loadingStates: loading
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
