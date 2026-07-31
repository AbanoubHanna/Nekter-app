import React, { useState } from "react";
import { supabase } from "../supabase";

const Uploader = () => {
  const [loading, setLoading] = useState(false);

  const fullMenu = [
    // ================= 1. الأقسام المضافة =================
    { name: "تراميسو نكتر الخاص", category: "الحلا", price: 15, description: "طبقات مخملية من البسكويت المغموس في القهوة مع كريمة الماسكاربوني.", image: "/uploads/menu/chees_cake.png" },
    { name: "كيكة العسل", category: "الحلا", price: 18, description: "كيكة العسل الروسية التقليدية بطبقاتها الرقيقة.", image: "/uploads/menu/chees_cake.png" },
    { name: "ساندوتش شاورما لحمة", category: "المأكولات", price: 20, description: "لحم بقري متبل يقدم في خبز طازج.", image: "" },
    { name: "ساندوتش دجاج مشوي", category: "المأكولات", price: 22, description: "صدر دجاج متبل ومشوي يقدم في خبز البطاطس.", image: "" },
    { name: "شيشة معسل تفاحتين", category: "الدخان", price: 20, description: "النكهة الكلاسيكية الفاخرة.", image: "" },
    { name: "شيشة معسل مانجو", category: "الدخان", price: 20, description: "تجربة تدخين استوائية فريدة.", image: "" },

    // ================= 2. سلاش طبيعي =================
    { name: "سلاش مانجو", category: "سلاش", price: 18, description: "سلاش مانجو طبيعي.", image: "/uploads/menu/Mango.png" },
    { name: "سلاش كركدية بالحبق", category: "سلاش", price: 18, description: "سلاش كركدية بالحبق.", image: "/uploads/menu/Hibiscus_&_Basil.png" },
    { name: "سلاش رمان", category: "سلاش", price: 18, description: "سلاش رمان طبيعي.", image: "/uploads/menu/pomerng_Holsten.png" },
    { name: "سلاش فراولة", category: "سلاش", price: 18, description: "سلاش فراولة طبيعي.", image: "/uploads/menu/Plain_Strawberry.png" },
    { name: "سلاش توت ازرق", category: "سلاش", price: 18, description: "سلاش توت ازرق طبيعي.", image: "/uploads/menu/Blueberry_Mojito.png" },

    // ================= 3. موهيتو =================
    { name: "موهيتو مع سفن أب (كبير)", category: "موهيتو", price: 18, description: "موهيتو مع سفن أب حجم كبير.", image: "/uploads/menu/Nekter_Classic_Mojito.png" },
    { name: "موهيتو مع سفن أب (صغير)", category: "موهيتو", price: 15, description: "موهيتو مع سفن أب حجم صغير.", image: "/uploads/menu/Nekter_Classic_Mojito.png" },
    { name: "موهيتو مياه غازية", category: "موهيتو", price: 23, description: "موهيتو مياه غازية.", image: "/uploads/menu/perria.png" },
    { name: "موهيتو مع كودرد", category: "موهيتو", price: 20, description: "موهيتو مع كودرد.", image: "/uploads/menu/Code_Red_Mojito.png" },
    { name: "موهيتو مع ريد بل", category: "موهيتو", price: 29, description: "موهيتو مع ريد بل.", image: "/uploads/menu/redbull.png" },
    { name: "موهيتو مع بايسون", category: "موهيتو", price: 20, description: "موهيتو مع بايسون.", image: "" },
    { name: "موهيتو مع باور هورس", category: "موهيتو", price: 29, description: "موهيتو مع باور هورس.", image: "" },

    // ================= 4. عصير طبيعي =================
    { name: "عصير برتقال", category: "عصائر", price: 18, description: "عصير برتقال طبيعي.", image: "/uploads/menu/freshorangejuice.png" },
    { name: "عصير بطيخ", category: "عصائر", price: 18, description: "عصير بطيخ طبيعي.", image: "/uploads/menu/Watermelon.png" },
    { name: "عصير اناناس", category: "عصائر", price: 18, description: "عصير اناناس طبيعي.", image: "" },
    { name: "عصير شمام", category: "عصائر", price: 18, description: "عصير شمام طبيعي.", image: "" },
    { name: "عصير بكاسة اطفال", category: "عصائر", price: 25, description: "عصير طبيعي بكاسة اطفال.", image: "" },

    // ================= 5. ايس كريم =================
    { name: "آيس كريم فانيلا (كبير)", category: "ايس كريم", price: 15, description: "حجم كبير", image: "/uploads/menu/vanilia.png" },
    { name: "آيس كريم فانيلا (صغير)", category: "ايس كريم", price: 10, description: "حجم صغير", image: "/uploads/menu/vanilia.png" },
    { name: "آيس كريم شوكولاتة (كبير)", category: "ايس كريم", price: 15, description: "حجم كبير", image: "/uploads/menu/Chocolate_Ice_Cream.png" },
    { name: "آيس كريم شوكولاتة (صغير)", category: "ايس كريم", price: 10, description: "حجم صغير", image: "/uploads/menu/Chocolate_Ice_Cream.png" },
    { name: "آيس كريم مانجو (كبير)", category: "ايس كريم", price: 15, description: "حجم كبير", image: "" },
    { name: "آيس كريم مانجو (صغير)", category: "ايس كريم", price: 10, description: "حجم صغير", image: "" },
    { name: "آيس كريم قطن كاندي (كبير)", category: "ايس كريم", price: 15, description: "حجم كبير", image: "" },
    { name: "آيس كريم قطن كاندي (صغير)", category: "ايس كريم", price: 10, description: "حجم صغير", image: "" },
    { name: "آيس كريم توت ازرق (كبير)", category: "ايس كريم", price: 15, description: "حجم كبير", image: "" },
    { name: "آيس كريم توت ازرق (صغير)", category: "ايس كريم", price: 10, description: "حجم صغير", image: "" },
    { name: "آيس كريم تشيز كيك (كبير)", category: "ايس كريم", price: 18, description: "حجم كبير", image: "/uploads/menu/chees_cake.png" },
    { name: "آيس كريم تشيز كيك (صغير)", category: "ايس كريم", price: 12, description: "حجم صغير", image: "/uploads/menu/chees_cake.png" },
    { name: "آيس كريم بوب كورن (كبير)", category: "ايس كريم", price: 18, description: "حجم كبير", image: "" },
    { name: "آيس كريم بوب كورن (صغير)", category: "ايس كريم", price: 12, description: "حجم صغير", image: "" },
    { name: "آيس كريم أوريو (كبير)", category: "ايس كريم", price: 18, description: "حجم كبير", image: "/uploads/menu/Oreo.png" },
    { name: "آيس كريم أوريو (صغير)", category: "ايس كريم", price: 12, description: "حجم صغير", image: "/uploads/menu/Oreo.png" },
    { name: "آيس كريم لوتس (كبير)", category: "ايس كريم", price: 18, description: "حجم كبير", image: "/uploads/menu/Lotus_Ice_Cream.png" },
    { name: "آيس كريم لوتس (صغير)", category: "ايس كريم", price: 12, description: "حجم صغير", image: "/uploads/menu/Lotus_Ice_Cream.png" },

    // ================= 6. ميلك شيك =================
    { name: "ميلك شيك تويكس", category: "ميلك شيك", price: 29, description: "ميلك شيك تويكس", image: "" },
    { name: "ميلك شيك سنيكرز", category: "ميلك شيك", price: 29, description: "ميلك شيك سنيكرز", image: "" },
    { name: "ميلك شيك مارس", category: "ميلك شيك", price: 29, description: "ميلك شيك مارس", image: "" },
    { name: "ميلك شيك باونتي", category: "ميلك شيك", price: 29, description: "ميلك شيك باونتي", image: "" },
    { name: "ميلك شيك كراميل", category: "ميلك شيك", price: 29, description: "ميلك شيك كراميل", image: "" },
    { name: "ميلك شيك نوتيلا ريدي", category: "ميلك شيك", price: 29, description: "ميلك شيك نوتيلا ريدي", image: "" },
    { name: "ميلك شيك كيندر بوينو", category: "ميلك شيك", price: 29, description: "ميلك شيك كيندر بوينو", image: "" },
    { name: "ميلك شيك مالتيزرز", category: "ميلك شيك", price: 29, description: "ميلك شيك مالتيزرز", image: "" },
    { name: "ميلك شيك أوريو", category: "ميلك شيك", price: 29, description: "ميلك شيك أوريو", image: "/uploads/menu/Oreromilkshake.png" },

    // ================= 7. تسالي =================
    { name: "بار شوكولاتة (كبير)", category: "تسالي", price: 5, description: "حجم كبير", image: "" },
    { name: "بار شوكولاتة (صغير)", category: "تسالي", price: 3, description: "حجم صغير", image: "" },
    { name: "أصابع ويفر كابريس (كبير)", category: "تسالي", price: 20, description: "حجم كبير", image: "" },
    { name: "أصابع ويفر كابريس (صغير)", category: "تسالي", price: 10, description: "حجم صغير", image: "" },
    { name: "تسالي باجة (مشكل)", category: "تسالي", price: 5, description: "حب ضيافة - كاجو مملح - مشكل ديلوكس", image: "" },
    { name: "شيبس ليز", category: "تسالي", price: 2, description: "شيبس ليز", image: "" },

    // ================= 8. مشروبات معلبة =================
    { name: "هولستن شعير", category: "معلبات", price: 15, description: "هولستن شعير", image: "" },
    { name: "هاينكن شعير", category: "معلبات", price: 20, description: "هاينكن شعير", image: "" },
    { name: "ريد بل", category: "معلبات", price: 20, description: "مشروب ريد بل", image: "/uploads/menu/redbull.png" },
    { name: "كود ريد (كبير)", category: "معلبات", price: 12, description: "حجم كبير", image: "" },
    { name: "كود ريد (صغير)", category: "معلبات", price: 8, description: "حجم صغير", image: "" },
    { name: "بايسن", category: "معلبات", price: 8, description: "مشروب بايسن", image: "" },
    { name: "باور هورس", category: "معلبات", price: 20, description: "مشروب باور هورس", image: "" },
    { name: "سفن أب", category: "معلبات", price: 5, description: "سفن أب", image: "" },
    { name: "سن توب (كبير)", category: "معلبات", price: 5, description: "نكهات متنوعة - كبير", image: "" },
    { name: "سن توب (صغير)", category: "معلبات", price: 3, description: "نكهات متنوعة - صغير", image: "" },
    { name: "آيس تي", category: "معلبات", price: 8, description: "آيس تي", image: "" },
    { name: "مياه غازية بيريه", category: "معلبات", price: 10, description: "مياه غازية بيريه", image: "/uploads/menu/perria.png" },
    { name: "مياه نوفا (كبير)", category: "معلبات", price: 4, description: "حجم كبير", image: "" },
    { name: "مياه نوفا (صغير)", category: "معلبات", price: 2, description: "حجم صغير", image: "" },

    // ================= 9. مشروبات ساخنة =================
    { name: "V60 (60 في)", category: "مشروبات ساخنة", price: 20, description: "قهوة V60", image: "/uploads/menu/V60.png" },
    { name: "فلات وايت", category: "مشروبات ساخنة", price: 18, description: "فلات وايت", image: "" },
    { name: "كورتادو", category: "مشروبات ساخنة", price: 18, description: "كورتادو", image: "/uploads/menu/Cortado.png" },
    { name: "نكتر سيجنتشر", category: "مشروبات ساخنة", price: 20, description: "نكتر سيجنتشر", image: "/uploads/menu/nekter_signture.png" },
    { name: "هوت شوكليت", category: "مشروبات ساخنة", price: 22, description: "هوت شوكليت", image: "/uploads/menu/hot_choclate.png" },
    { name: "كابتشينو", category: "مشروبات ساخنة", price: 20, description: "كابتشينو", image: "" },
    { name: "لاتيه", category: "مشروبات ساخنة", price: 20, description: "لاتيه", image: "/uploads/menu/latte.png" },
    { name: "موكا حار", category: "مشروبات ساخنة", price: 16, description: "موكا حار", image: "" },
    { name: "أمريكانو", category: "مشروبات ساخنة", price: 16, description: "أمريكانو", image: "" },
    { name: "إسبريسو", category: "مشروبات ساخنة", price: 14, description: "إسبريسو", image: "/uploads/menu/Espresso.png" },
    { name: "مكياتو", category: "مشروبات ساخنة", price: 16, description: "مكياتو", image: "" },
    { name: "قهوة اليوم", category: "مشروبات ساخنة", price: 15, description: "قهوة اليوم", image: "" },
    { name: "قهوة سعودي", category: "مشروبات ساخنة", price: 15, description: "قهوة سعودي", image: "/uploads/menu/Saudi_Coffee.png" },
    { name: "قهوة فرنسية", category: "مشروبات ساخنة", price: 12, description: "قهوة فرنسية", image: "" },
    { name: "قهوة تركي سادة", category: "مشروبات ساخنة", price: 11, description: "قهوة تركي سادة", image: "" },
    { name: "قهوة تركي بالحليب", category: "مشروبات ساخنة", price: 13, description: "قهوة تركي بالحليب", image: "" },
    { name: "شاي أحمر", category: "مشروبات ساخنة", price: 9, description: "شاي أحمر", image: "/uploads/menu/tea_red.png" },
    { name: "شاي أخضر", category: "مشروبات ساخنة", price: 9, description: "شاي أخضر", image: "" },
    { name: "شاي مغربي", category: "مشروبات ساخنة", price: 9, description: "شاي مغربي", image: "" },
    { name: "يانسون", category: "مشروبات ساخنة", price: 8, description: "يانسون", image: "" },
    { name: "زنجبيل", category: "مشروبات ساخنة", price: 9, description: "زنجبيل", image: "" },
    { name: "زنجبيل بالعسل", category: "مشروبات ساخنة", price: 9, description: "زنجبيل بالعسل", image: "" },
    { name: "سحلب", category: "مشروبات ساخنة", price: 9, description: "سحلب", image: "/uploads/menu/sahlab.png" }
  ];

  const clearAndUpload = async () => {
    if (!window.confirm("تحذير: هذه الخطوة ستمسح المنيو القديم بالكامل وتستبدله بالمنيو الشامل الجديد. هل أنت متأكد؟")) return;
    setLoading(true);
    try {
      // 1. مسح كل المنتجات من قاعدة البيانات (تصفير)
      await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // 2. رفع المنيو الشامل دفعة واحدة
      const { error } = await supabase.from('products').insert(fullMenu);
      if (error) throw error;
      alert("مبروك يا هندسة! 🚀 تم تصفير المنيو ورفع كل المنتجات والأحجام والأقسام الجديدة بنجاح 100%.");
    } catch (err) {
      alert("حدث خطأ: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '30px', fontFamily: 'Cairo', textAlign: 'center' }}>
      <h1 style={{ color: '#0f6c6f', fontSize: '32px' }}>رفع المنيو الشامل لـ néktər ☕</h1>
      <p style={{ maxWidth: '600px', fontSize: '18px' }}>
        تم تجهيز أكثر من 90 صنف يشمل كل المشروبات، الحلويات، والمأكولات بكافة الأحجام.<br/>
        اضغط على الزر أدناه لمسح أي بيانات قديمة ورفع المنيو الجديد كلياً!
      </p>
      
      <button 
        onClick={clearAndUpload} 
        disabled={loading}
        style={{ padding: '20px 50px', background: loading ? '#ccc' : '#ef4444', color: 'white', border: 'none', borderRadius: '20px', fontSize: '22px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}
      >
        {loading ? "جاري المسح والرفع... ⏳" : "مسح القديم ورفع المنيو الشامل 🚀"}
      </button>
    </div>
  );
};

export default Uploader;