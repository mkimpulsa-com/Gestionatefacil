import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, companyName, phone) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    
    // Crear documento de usuario inmediatamente
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      uid: user.uid,
      fullName: companyName || '', // Usamos el nombre de la empresa como referencia inicial
      phone: phone || '',
      plan: 'Trial',
      status: 'activo',
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });

    // Crear documento de empresa vinculado
    await setDoc(doc(db, 'companies', user.uid), {
      name: companyName || 'Mi Empresa',
      phone: phone || '',
      email: user.email,
      userId: user.uid,
      createdAt: serverTimestamp()
    });

    return user;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      console.log("Auth Debug: onAuthStateChanged triggered", user ? `User: ${user.email} (${user.uid})` : "No user");
      
      // Limpiar escuchador anterior si existe (importante para evitar fugas de estado)
      if (unsubscribeDoc) {
        console.log("Auth Debug: Cleaning up previous doc listener");
        unsubscribeDoc();
        unsubscribeDoc = null;
      }

      if (user) {
        const userRef = doc(db, 'users', user.uid);
        
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            console.log("Auth Debug: Creating new user document");
            await setDoc(userRef, {
              email: user.email,
              uid: user.uid,
              plan: 'Trial',
              status: 'prueba',
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp()
            });
          } else {
            console.log("Auth Debug: Updating lastLogin for existing user");
            await setDoc(userRef, {
              lastLogin: serverTimestamp(),
              email: user.email
            }, { merge: true });
          }
        } catch (err) {
          console.error("Auth sync error:", err);
        }

        // Escuchar cambios en tiempo real del documento del usuario
        console.log("Auth Debug: Setting up onSnapshot for", user.uid);
        unsubscribeDoc = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Auth Debug: User document update received", data.email);
            // Combinamos los datos de Auth con los de Firestore
            setCurrentUser({ ...user, ...data });
          } else {
            console.log("Auth Debug: User document does not exist in Firestore");
            setCurrentUser(user);
          }
          setLoading(false);
        }, (error) => {
          console.error("User doc listener error:", error);
          setCurrentUser(user);
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      console.log("Auth Debug: AuthProvider unmounting, cleaning up all listeners");
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const value = {
    currentUser,
    login,
    signup,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

