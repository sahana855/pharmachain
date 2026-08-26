// Local AI Engine - No API key needed, built-in knowledge base
import { getDB, generateId } from './db';

type AIRole = 'manufacturer' | 'dealer' | 'pharmacy';

interface AIResponse {
  text: string;
  actions?: Array<{ label: string; path: string }>;
}

const KNOWLEDGE_BASE: Record<string, string> = {
  paracetamol: 'Paracetamol is a common pain reliever and fever reducer. Used for headaches, muscle aches, arthritis, backaches, toothaches, colds, and fevers.',
  amoxicillin: 'Amoxicillin is an antibiotic used to treat bacterial infections including tonsillitis, bronchitis, pneumonia, and ear/nose/throat infections.',
  vitamin_c: 'Vitamin C (ascorbic acid) is an essential nutrient that boosts immune system, helps collagen production, and improves iron absorption.',
  batch: 'Each medicine batch has a unique number for traceability. Always check batch numbers when processing returns or recalls.',
  expiry: 'Medicines should not be used after their expiry date. Expired medicines may be less effective or harmful. Check stock regularly for expiring items.',
  storage: 'Most medicines should be stored in a cool, dry place away from direct sunlight. Some require refrigeration at 2-8°C.',
  qr: 'QR codes on medicines help verify authenticity. Each scan adds a color shift to detect tampering. If a QR shows unexpected colors, it may have been duplicated.',
  recall: 'A product recall removes defective or potentially harmful medicines from the supply chain. Immediate action is needed when a recall is issued.',
};

const SUGGESTIONS_MANUFACTURER = [
  'Analyze my batch distribution',
  'Check low stock raw materials',
  'Show production summary',
  'Which batches are near expiry?',
  'Suggest optimal batch sizes',
  'How to improve quality control?',
];

const SUGGESTIONS_DEALER = [
  'Analyze my inventory levels',
  'Check pending orders',
  'Which medicines need restock?',
  'Show stock movement history',
  'Identify slow-moving items',
  'Suggest reorder quantities',
];

const SUGGESTIONS_PHARMACY = [
  'Which medicines are expiring soon?',
  'Analyze my sales trends',
  'Check low stock items',
  'Show daily sales summary',
  'Suggest restock from dealers',
  'Identify best-selling medicines',
];

function matchQuery(query: string, text: string): boolean {
  return query.toLowerCase().includes(text.toLowerCase());
}

function findKnowledge(query: string): string[] {
  const results: string[] = [];
  for (const [key, info] of Object.entries(KNOWLEDGE_BASE)) {
    if (matchQuery(query, key) || matchQuery(query, info.substring(0, 30))) {
      results.push(info);
    }
  }
  return results;
}

async function getContextSummary(userId: string, role: string): Promise<string> {
  try {
    const db = await getDB();
    const stock = await db.getAll('stock');
    const orders = await db.getAll('orders');
    const medicines = await db.getAll('medicines');
    const batches = await db.getAll('batches');
    const sales = await db.getAll('sales');

    const myStock = stock.filter(s => s.ownerId === userId);
    const totalQty = myStock.reduce((s, i) => s + i.quantity, 0);
    const lowStock = myStock.filter(s => s.quantity < 50);
    const now = new Date();
    const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    const expiring = myStock.filter(s => new Date(s.expiryDate) <= threeMonths);
    const pendingOrders = orders.filter(o => o.status === 'pending' && (o.toId === userId || o.fromId === userId));
    const totalSales = sales.reduce((s, i) => s + i.totalAmount, 0);
    const activeBatches = batches.filter(b => b.status === 'active').length;
    const recalled = batches.filter(b => b.status === 'recalled').length;

    return `Role: ${role}
Total Stock Items: ${myStock.length}
Total Quantity: ${totalQty}
Low Stock Items: ${lowStock.length}
Expiring Items: ${expiring.length}
Pending Orders: ${pendingOrders.length}
Total Sales Revenue: ₹${totalSales}
Active Batches: ${activeBatches}
Recalled Batches: ${recalled}`;
  } catch {
    return 'System data unavailable';
  }
}

export async function getLocalAIResponse(
  query: string,
  userId: string,
  userName: string,
  role: string
): Promise<AIResponse> {
  const context = await getContextSummary(userId, role);
  const q = query.toLowerCase();

  // Stock analysis
  if (matchQuery(q, 'stock') || matchQuery(q, 'inventory') || matchQuery(q, 'quantity')) {
    const db = await getDB();
    const allStock = await db.getAll('stock');
    const myStock = allStock.filter(s => s.ownerId === userId);
    const total = myStock.reduce((s, i) => s + i.quantity, 0);
    const low = myStock.filter(s => s.quantity < 50);
    const names = myStock.map(s => `${s.medicineName} (${s.quantity})`).join(', ');

    return {
      text: `📦 **Stock Analysis**\n\n**Total Items:** ${myStock.length}\n**Total Quantity:** ${total}\n**Low Stock Items:** ${low.length}\n\n${myStock.length > 0 ? `**Your Stock:** ${names}` : 'No stock found.'}\n\n${low.length > 0 ? `⚠️ **Alert:** ${low.length} items are running low. Consider reordering soon.` : '✅ Stock levels are healthy.'}`,
      actions: role === 'manufacturer' ? [{ label: 'View Stock', path: '/manufacturer/stock' }] :
               role === 'dealer' ? [{ label: 'View Stock', path: '/dealer/stock' }] :
               [{ label: 'View Stock', path: '/pharmacy/stock' }],
    };
  }

  // Expiry analysis
  if (matchQuery(q, 'expir') || matchQuery(q, 'expiring') || matchQuery(q, 'expiry')) {
    const db = await getDB();
    const allStock = await db.getAll('stock');
    const myStock = allStock.filter(s => s.ownerId === userId);
    const now = new Date();
    const threeMonths = new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    const expiring = myStock.filter(s => new Date(s.expiryDate) <= threeMonths);
    const expired = myStock.filter(s => new Date(s.expiryDate) < now);

    if (expiring.length === 0) {
      return { text: '✅ **Great news!** No medicines are expiring within the next 3 months.' };
    }

    const details = expiring.map(s => {
      const days = Math.ceil((new Date(s.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `• ${s.medicineName} - Batch ${s.batchNumber} - ${days <= 0 ? 'EXPIRED' : `${days} days left`}`;
    }).join('\n');

    return {
      text: `⚠️ **Expiry Alert**\n\n**Expired:** ${expired.length}\n**Expiring within 3 months:** ${expiring.length}\n\n${details}\n\n💡 **Tip:** Consider offering discounts on near-expiry items to reduce waste.`,
      actions: role === 'pharmacy' ? [{ label: 'View Expiry Alerts', path: '/pharmacy/expiry-alert' }] :
               [{ label: 'Check Batches', path: '/manufacturer/batches' }],
    };
  }

  // Low stock
  if (matchQuery(q, 'low stock') || matchQuery(q, 'low') || matchQuery(q, 'reorder') || matchQuery(q, 'restock')) {
    const db = await getDB();
    const allStock = await db.getAll('stock');
    const myStock = allStock.filter(s => s.ownerId === userId);
    const low = myStock.filter(s => s.quantity < 50);

    if (low.length === 0) {
      return { text: '✅ **All stock levels are adequate.** No items need immediate reordering.' };
    }

    const details = low.map(s => `• ${s.medicineName} - Only ${s.quantity} units left`).join('\n');

    return {
      text: `🔴 **Low Stock Alert**\n\n${low.length} items need attention:\n\n${details}\n\n📋 **Recommended Actions:**\n1. Place reorder requests immediately\n2. Check with upstream suppliers\n3. Consider increasing order quantities`,
      actions: role === 'manufacturer' ? [{ label: 'View Low Stock', path: '/manufacturer/low-stock' }] :
               role === 'dealer' ? [{ label: 'Auto Restock', path: '/dealer/auto-restock' }] :
               [{ label: 'Reorder Now', path: '/pharmacy/auto-reorder' }],
    };
  }

  // Orders
  if (matchQuery(q, 'order') || matchQuery(q, 'pending') || matchQuery(q, 'dispatch')) {
    const db = await getDB();
    const allOrders = await db.getAll('orders');
    const myOrders = allOrders.filter(o => o.fromId === userId || o.toId === userId);
    const pending = myOrders.filter(o => o.status === 'pending' || o.status === 'in_transit');

    if (pending.length === 0) {
      return { text: '📋 **No pending orders.** All orders have been processed.' };
    }

    const details = pending.map(o =>
      `• ${o.orderNumber} - ${o.status.replace('_', ' ')} - ₹${o.totalAmount}`
    ).join('\n');

    return {
      text: `📋 **Pending Orders (${pending.length})**\n\n${details}\n\n💡 Stay on top of order fulfillment to maintain supply chain efficiency.`,
      actions: role === 'manufacturer' ? [{ label: 'View Orders', path: '/manufacturer/dispatch' }] :
               role === 'dealer' ? [{ label: 'Pending Orders', path: '/dealer/pending-orders' }] :
               [{ label: 'View Orders', path: '/pharmacy/auto-reorder' }],
    };
  }

  // Sales
  if (matchQuery(q, 'sales') || matchQuery(q, 'revenue') || matchQuery(q, 'sold') || matchQuery(q, 'reports')) {
    const db = await getDB();
    const allSales = await db.getAll('sales');
    const total = allSales.reduce((s, i) => s + i.totalAmount, 0);

    return {
      text: `📊 **Sales Summary**\n\n**Total Transactions:** ${allSales.length}\n**Total Revenue:** ₹${total}\n\n📈 **Trend:** ${allSales.length > 0 ? 'Sales data available for analysis.' : 'No sales recorded yet.'}`,
      actions: role === 'pharmacy' ? [{ label: 'Sales Report', path: '/pharmacy/sales-report' }] :
               role === 'manufacturer' ? [{ label: 'Production Report', path: '/manufacturer/reports' }] : undefined,
    };
  }

  // Batches
  if (matchQuery(q, 'batch') || matchQuery(q, 'batches') || matchQuery(q, 'production')) {
    const db = await getDB();
    const allBatches = await db.getAll('batches');
    const active = allBatches.filter(b => b.status === 'active');
    const recalled = allBatches.filter(b => b.status === 'recalled');

    return {
      text: `🏭 **Batch Overview**\n\n**Total Batches:** ${allBatches.length}\n**Active:** ${active.length}\n**Recalled:** ${recalled.length}\n\n${recalled.length > 0 ? '⚠️ There are recalled batches that need attention!' : '✅ All batches are in good standing.'}`,
      actions: role === 'manufacturer' ? [{ label: 'Manage Batches', path: '/manufacturer/batches' }] : undefined,
    };
  }

  // QR
  if (matchQuery(q, 'qr') || matchQuery(q, 'scan') || matchQuery(q, 'verify') || matchQuery(q, 'authenticity')) {
    return {
      text: `📱 **QR Code System**\n\n**Two types of QR codes:**\n\n1️⃣ **Tablet QR** (on each tablet/strip)\n   - Color-shifting technology\n   - Changes color on each scan\n   - Detects if medicine was already checked\n\n2️⃣ **Box QR** (on medicine packaging)\n   - Used by Transport for delivery tracking\n   - Links to batch and delivery data\n\n💡 Always scan QR codes to verify authenticity before dispensing.`,
      actions: role === 'manufacturer' ? [{ label: 'Generate QR', path: '/manufacturer/qr-generation' }] :
               role === 'pharmacy' ? [{ label: 'Scan QR', path: '/pharmacy/qr-checking' }] : undefined,
    };
  }

  // Help
  if (matchQuery(q, 'help') || matchQuery(q, 'what can') || matchQuery(q, 'capabilities')) {
    const suggestions = role === 'manufacturer' ? SUGGESTIONS_MANUFACTURER :
                        role === 'dealer' ? SUGGESTIONS_DEALER :
                        SUGGESTIONS_PHARMACY;

    return {
      text: `🤖 **PharmaAI Assistant**\n\nI can help you with:\n• 📊 **Stock & Inventory Analysis**\n• ⏰ **Expiry Monitoring**\n• 🔴 **Low Stock Alerts**\n• 📋 **Order Management**\n• 📈 **Sales Reports**\n• 🏭 **Batch Tracking**\n• 📱 **QR Code Verification**\n\n**Try asking:**\n${suggestions.map(s => `• "${s}"`).join('\n')}`,
    };
  }

  // Knowledge base lookup
  const knowledge = findKnowledge(query);
  if (knowledge.length > 0) {
    return {
      text: `📚 **Pharma Knowledge**\n\n${knowledge.join('\n\n')}\n\n💡 For more specific information, please consult your local pharmacist or medical professional.`,
    };
  }

  // General context summary
  return {
    text: `📊 **System Overview**\n\n${context}\n\n💡 **Tip:** Try asking specific questions like "Check my stock", "What's expiring soon?", or "Show pending orders". Type "help" to see all capabilities.`,
  };
}

export function getRoleSuggestions(role: string): string[] {
  switch (role) {
    case 'manufacturer': return SUGGESTIONS_MANUFACTURER;
    case 'dealer': return SUGGESTIONS_DEALER;
    case 'pharmacy': return SUGGESTIONS_PHARMACY;
    default: return ['Analyze my data', 'Check stock', 'View orders'];
  }
}

export function isAIRestricted(role: string): boolean {
  return ['manufacturer', 'dealer', 'pharmacy'].includes(role);
}

