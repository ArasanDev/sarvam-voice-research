import { randomUUID } from "node:crypto";
import { db } from "../lib/db";

const SHOP_ID = "shop-anand-general-store";

const PRODUCTS: Array<{
  name_en: string;
  name_local: string;
  local_language_code: string;
  pronunciation_hint?: string;
  category: string;
  price_paise: number;
  unit: string;
  in_stock_qty: number;
}> = [
  { name_en: "Basmati Rice", name_local: "பாஸ்மதி அரிசி", local_language_code: "ta-IN", category: "Grains", price_paise: 12000, unit: "5kg bag", in_stock_qty: 40 },
  { name_en: "Toor Dal", name_local: "துவரம் பருப்பு", local_language_code: "ta-IN", category: "Pulses", price_paise: 14000, unit: "1kg", in_stock_qty: 60 },
  { name_en: "Gingelly Oil", name_local: "நல்லெண்ணெய்", local_language_code: "ta-IN", pronunciation_hint: "nallennai", category: "Oil", price_paise: 21000, unit: "1L bottle", in_stock_qty: 25 },
  { name_en: "Amul Butter", name_local: "அமுல் வெண்ணெய்", local_language_code: "ta-IN", pronunciation_hint: "Amul", category: "Dairy", price_paise: 5500, unit: "500g", in_stock_qty: 30 },
  { name_en: "Turmeric Powder", name_local: "மஞ்சள் தூள்", local_language_code: "ta-IN", category: "Spices", price_paise: 4000, unit: "200g", in_stock_qty: 50 },
  { name_en: "Red Chilli Powder", name_local: "மிளகாய் தூள்", local_language_code: "ta-IN", category: "Spices", price_paise: 4500, unit: "200g", in_stock_qty: 45 },
  { name_en: "Tata Salt", name_local: "டாடா உப்பு", local_language_code: "ta-IN", pronunciation_hint: "Tata", category: "Essentials", price_paise: 2500, unit: "1kg", in_stock_qty: 80 },
  { name_en: "Sugar", name_local: "சர்க்கரை", local_language_code: "ta-IN", category: "Essentials", price_paise: 4800, unit: "1kg", in_stock_qty: 70 },
  { name_en: "Tea Powder", name_local: "தேயிலைத் தூள்", local_language_code: "ta-IN", category: "Beverages", price_paise: 9000, unit: "250g", in_stock_qty: 35 },
  { name_en: "Maggi Noodles", name_local: "மேகி நூடுல்ஸ்", local_language_code: "ta-IN", pronunciation_hint: "Maggi", category: "Snacks", price_paise: 1400, unit: "70g pack", in_stock_qty: 100 },
  { name_en: "Parle-G Biscuits", name_local: "பார்லே-ஜி பிஸ்கட்", local_language_code: "ta-IN", pronunciation_hint: "Parle-G", category: "Snacks", price_paise: 1000, unit: "200g pack", in_stock_qty: 90 },
  { name_en: "Coconut", name_local: "தேங்காய்", local_language_code: "ta-IN", category: "Fresh", price_paise: 3500, unit: "1 piece", in_stock_qty: 20 },
];

function seed() {
  const upsertShop = db.prepare(
    `INSERT INTO shop (id, name, default_language_code) VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, default_language_code = excluded.default_language_code`
  );
  upsertShop.run(SHOP_ID, "Anand General Store", "ta-IN");

  db.prepare(`DELETE FROM product WHERE shop_id = ?`).run(SHOP_ID);

  const insertProduct = db.prepare(
    `INSERT INTO product
       (id, shop_id, name_en, name_local, local_language_code, pronunciation_hint, category, price_paise, unit, in_stock_qty)
     VALUES (@id, @shop_id, @name_en, @name_local, @local_language_code, @pronunciation_hint, @category, @price_paise, @unit, @in_stock_qty)`
  );
  const insertAll = db.transaction((rows: typeof PRODUCTS) => {
    for (const p of rows) {
      insertProduct.run({
        id: randomUUID(),
        shop_id: SHOP_ID,
        pronunciation_hint: null,
        ...p,
      });
    }
  });
  insertAll(PRODUCTS);
  console.log(`Seeded ${PRODUCTS.length} products (en + ta-IN) for ${SHOP_ID}.`);
}

seed();
