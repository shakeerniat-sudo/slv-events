export const formatDateOnly = (dateInput) => {
  if (!dateInput) return '';
  const str = dateInput.toString();
  if (str === 'Invalid Date' || str.includes('Invalid Date')) return '';
  
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  
  try {
    const d = new Date(dateInput);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  } catch (e) {}
  
  const splitVal = str.split('T')[0];
  return (splitVal === 'Invalid Date') ? '' : splitVal;
};

export const formatToGB = (dateInput) => {
  const dateStr = formatDateOnly(dateInput);
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr === 'Invalid Date' ? '' : dateStr;
};
