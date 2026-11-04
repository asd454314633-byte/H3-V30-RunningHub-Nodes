export function writeCurrentCardPrompt(card, text) {
  const area = card?.area;
  if (!area || typeof text !== 'string') return false;
  area.value = text;
  area.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

export function reflectCardPrompt(card, editor) {
  if (!card?.area || !editor) return false;
  editor.value = card.area.value;
  return true;
}
