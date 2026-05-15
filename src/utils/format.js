export const parseCurrency = (amount) => {
  if (typeof amount === 'number') return amount;
  if (!amount || typeof amount !== 'string') return 0;
  
  // Robust parsing for AR format: $ 1.250,50
  let clean = amount.replace(/[$\s]/g, "");
  
  if (clean.includes(',') && clean.includes('.')) {
    clean = clean.replace(/\./g, "").replace(',', '.');
  } else if (clean.includes(',')) {
    clean = clean.replace(',', '.');
  }
  
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

export const formatCurrency = (amount) => {
  const number = parseCurrency(amount);

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
  }).format(number);
};
