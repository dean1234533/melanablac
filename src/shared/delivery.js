// UK delivery fee. Both values are editable in Studio under Site text, in pounds, so no code change is needed.
// DELIVERY_ITEM_ID marks the delivery line inside an order's items.
export const DELIVERY_ITEM_ID = 0;
const toPence = (v) => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null;
};
export const deliveryFeePence = (content, subtotalPence) => {
  const fee = toPence(content['shop.deliveryFee']) ?? 0;
  const freeOver = toPence(content['shop.freeDeliveryOver']);
  if (!subtotalPence || (freeOver !== null && freeOver > 0 && subtotalPence >= freeOver)) return 0;
  return fee;
};
const sym = (c) => c['site.currency'] || '£';
export const deliveryText = (c) => {
  const fee = toPence(c['shop.deliveryFee']) ?? 0;
  const freeOver = toPence(c['shop.freeDeliveryOver']);
  const parts = [fee === 0 ? 'UK delivery is free.' : `UK delivery is ${sym(c)}${(fee / 100).toFixed(2)}.`];
  if (fee > 0 && freeOver) parts.push(`Free UK delivery on orders over ${sym(c)}${(freeOver / 100).toFixed(2)}.`);
  if (c['shop.shipping']) parts.push(c['shop.shipping']);
  return parts.join(' ');
};
