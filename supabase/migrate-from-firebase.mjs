// One-time migration: copies existing data from the old Firebase project
// into the new Supabase project. Run once, after `schema.sql` has been
// applied in the Supabase SQL Editor.
//
//   node supabase/migrate-from-firebase.mjs
//
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { createClient } from "@supabase/supabase-js";

const firebaseConfig = {
  apiKey: "AIzaSyDTevI5A3iBrdGxer9C0UjkkMXRQ4fQfSE",
  authDomain: "nekter-orders.firebaseapp.com",
  projectId: "nekter-orders",
  storageBucket: "nekter-orders.appspot.com",
};

const SUPABASE_URL = "https://toighwahrodvnbiztdpy.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRvaWdod2Focm9kdm5iaXp0ZHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0NDUwNDIsImV4cCI6MjEwMTAyMTA0Mn0.s_VCEa-9ClzhVriT3G-7C6KIx4d6a8Ne6LWnk0SJB8w";

const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const toISO = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString();
  return new Date(ts).toISOString();
};

async function migrateCategories() {
  const snap = await getDocs(collection(db, "categories"));
  const rows = snap.docs.map((d, i) => {
    const c = d.data();
    return { name: c.name, is_visible: c.isVisible !== false, position: c.order ?? i };
  });
  if (rows.length === 0) return console.log("لا يوجد أقسام في Firebase.");
  const { error } = await supabase.from("categories").insert(rows);
  if (error) console.error("❌ فشل نقل الأقسام:", error.message);
  else console.log(`✅ تم نقل ${rows.length} قسم.`);
}

async function migrateProducts() {
  const snap = await getDocs(collection(db, "products"));
  const rows = snap.docs.map((d, i) => {
    const p = d.data();
    return {
      name: p.name,
      price: Number(p.price) || 0,
      category: p.category || "",
      description: p.description || "",
      image: p.image || "",
      status: p.status || "متوفر",
      is_visible: p.isVisible !== false,
      track_stock: !!p.trackStock,
      stock: p.trackStock ? Number(p.stock || 0) : null,
      cost_price: Number(p.costPrice) || 0,
      position: p.order ?? i,
    };
  });
  if (rows.length === 0) return console.log("لا يوجد منتجات في Firebase.");
  const { error } = await supabase.from("products").insert(rows);
  if (error) console.error("❌ فشل نقل المنتجات:", error.message);
  else console.log(`✅ تم نقل ${rows.length} منتج.`);
}

async function migrateOrders() {
  const snap = await getDocs(collection(db, "orders"));
  const rows = snap.docs.map((d) => {
    const o = d.data();
    return {
      table_number: o.tableNumber || "",
      customer_name: o.customerName || "",
      customer_phone: o.customerPhone || "",
      items: o.items || [],
      total: Number(o.total) || 0,
      notes: o.notes || "",
      payment_method: o.paymentMethod || "كاش",
      status: o.status || "تم الاستلام",
      created_at: toISO(o.createdAt) || new Date().toISOString(),
      last_updated: toISO(o.lastUpdated),
    };
  });
  if (rows.length === 0) return console.log("لا يوجد طلبات في Firebase.");
  // insert in chunks of 500 to stay well under request size limits
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    const { error } = await supabase.from("orders").insert(chunk);
    if (error) console.error("❌ فشل نقل دفعة طلبات:", error.message);
  }
  console.log(`✅ تم نقل ${rows.length} طلب.`);
}

async function migrateStaff() {
  const snap = await getDocs(collection(db, "users"));
  let ok = 0, fail = 0;
  for (const d of snap.docs) {
    const u = d.data();
    const { error } = await supabase.rpc("rpc_migrate_staff", {
      p_name: u.name || "بدون اسم",
      p_role: u.role || "كاشير",
      p_pin: u.pin || null,
      p_email: u.email || null,
      p_password: u.password || null,
      p_photo: u.photo || "",
      p_status: u.status || "نشط",
    });
    if (error) { fail++; console.error("❌ فشل نقل موظف:", u.name, error.message); }
    else ok++;
  }
  console.log(`✅ تم نقل ${ok} موظف${fail ? ` (فشل ${fail})` : ""}.`);
}

(async () => {
  console.log("🚀 بدء نقل البيانات من Firebase إلى Supabase...\n");
  await migrateCategories();
  await migrateProducts();
  await migrateOrders();
  await migrateStaff();
  console.log("\n🎉 انتهى النقل. راجع جدول Table Editor في Supabase للتأكد.");
  process.exit(0);
})();
