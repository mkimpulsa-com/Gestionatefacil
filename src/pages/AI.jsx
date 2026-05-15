import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { db } from '../config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { getAIResponse } from '../services/aiService';
import ReactMarkdown from 'react-markdown';
import './AI.css';

export function AI() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState([
    { id: 'initial', sender: 'ai', text: '¡Hola! Soy tu asistente de IA. He sido configurado para analizar los datos reales de tu negocio. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState("");
  const [isContextLoaded, setIsContextLoaded] = useState(false);
  const scrollRef = useRef(null);
  const autoQueryProcessed = useRef(false);

  useEffect(() => {
    const fetchContextData = async () => {
      if (!currentUser) return;
      
      try {
        const qUsers = where('userId', '==', currentUser.uid);
        
        const [clientsSnap, productsSnap, dealsSnap, txnsSnap] = await Promise.all([
          getDocs(query(collection(db, 'clients'), qUsers)),
          getDocs(query(collection(db, 'products'), qUsers)),
          getDocs(query(collection(db, 'deals'), qUsers)),
          getDocs(query(collection(db, 'transactions'), qUsers))
        ]);

        const data = {
          clients: clientsSnap.docs.map(d => d.data().name),
          products: productsSnap.docs.map(d => `${d.data().name} (Stock: ${d.data().stock})`),
          deals: dealsSnap.docs.map(d => `${d.data().name} (Valor: ${d.data().value})`),
          transactions: txnsSnap.docs.map(d => `${d.data().type}: ${d.data().amount}`)
        };

        const contextString = `
          Clientes: ${data.clients.join(', ') || 'Sin clientes registrados'}
          Inventario: ${data.products.join(', ') || 'Sin productos'}
          Ventas (Pipeline): ${data.deals.join(', ') || 'Sin ventas en pipeline'}
          Transacciones (Finanzas): ${data.transactions.join(', ') || 'Sin transacciones'}
        `;
        
        setContext(contextString);
        setIsContextLoaded(true);
      } catch (err) {
        console.error("Error fetching context for AI:", err);
      }
    };

    fetchContextData();
  }, [currentUser]);

  // Handle Automatic Query from Topbar
  useEffect(() => {
    if (isContextLoaded && location.state?.autoQuery && !autoQueryProcessed.current) {
      autoQueryProcessed.current = true;
      sendMessage(location.state.autoQuery);
    }
  }, [isContextLoaded, location.state]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    if (!text.trim() || isTyping) return;

    const userMsg = { id: Date.now(), sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    const aiResponseText = await getAIResponse(text, context);
    
    setIsTyping(false);
    const aiResponse = { 
      id: Date.now() + 1, 
      sender: 'ai', 
      text: aiResponseText
    };
    setMessages(prev => [...prev, aiResponse]);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    sendMessage(inputValue);
    setInputValue('');
  };

  return (
    <div className="ai-container animate-fade-in">
      <header className="ai-header">
        <div>
          <h1 className="page-title flex-center gap-2" style={{justifyContent: 'flex-start'}}>
            <Sparkles className="text-ai" size={24} />
            Asistente de Inteligencia Artificial (Gemini 1.5)
          </h1>
          <p className="page-subtitle">Analiza tus datos reales y obtén proyecciones personalizadas con tecnología de Google AI.</p>
        </div>
      </header>

      <div className="chat-interface glass-panel">
        <div className="chat-messages" ref={scrollRef}>
          {messages.map(msg => (
            <div key={msg.id} className={`message-bubble ${msg.sender === 'ai' ? 'ai-bubble' : 'user-bubble'} animate-fade-in`}>
              <div className="message-avatar">
                {msg.sender === 'ai' ? <Bot size={18} /> : <User size={18} />}
              </div>
              <div className="message-content">
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="message-bubble ai-bubble animate-fade-in typing-indicator-container">
              <div className="message-avatar"><Bot size={18} /></div>
              <div className="message-content typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-area" onSubmit={handleFormSubmit}>
          <input 
            type="text" 
            placeholder={isTyping ? "Gemini está pensando..." : "Pregúntale a tu asistente de IA..."} 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isTyping}
          />
          <button type="submit" className="btn-ai flex-center gap-2" disabled={!inputValue.trim() || isTyping}>
            {isTyping ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
}
