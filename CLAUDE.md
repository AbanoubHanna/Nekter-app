# Nekter App — سياق المشروع لـ Claude Code

مشروع نظام كاشير/منيو ديجيتال لمحل مشروبات وقهوة اسمه **Nekter** (سلاش، موهيتو، عصائر طبيعية، آيس كريم، مشروبات ساخنة). ده ملف سياق مكتوب عشان أي جلسة Claude Code جديدة تفهم المشروع فورًا من غير شرح من الصفر.

## الستاك التقني
- **Frontend**: React 19 + Vite + React Router
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage) — كان Firebase/Firestore وتم النقل بالكامل
- **مكتبات**: recharts (تقارير), xlsx (استيراد/تصدير Excel), @supabase/supabase-js
- **الخط**: Cairo (عربي) + IBM Plex Mono (أرقام/أسعار)

## بنية التطبيق (3 واجهات، Route واحد لكل واحدة)
| المسار | الملف | الوظيفة |
|---|---|---|
| `/?table=N` | `src/pages/CustomerView.jsx` | منيو العميل + كارت + تتبع الأوردر + المكافآت |
| `/cashier` | `src/pages/CashierView.jsx` | شاشة الكاشير (دخول بـ PIN) + تفعيل أكواد المكافآت |
| `/admin` | `src/pages/AdminDashboard.jsx` | لوحة تحكم كاملة (دخول Supabase Auth حقيقي) |

## نظام التصميم المشترك
- `src/styles/theme.css` — كل الألوان/الخطوط/الأنيميشن كـ CSS variables وكلاسات (`n-card`, `n-btn`, `.stub`, `.tag-*`)
- **الألوان بتعبّر عن درجة حرارة المنتج**: تركواز (بارد) / عنبري (ساخن) / وردي (حلو)
- **العنصر المميز**: "ticket stub" — كل سعر/رقم أوردر شكله زي فيش كاشير حقيقي (حواف متعرجة + خط Mono)
- `src/components/AnimatedNumber.jsx` — أرقام بتعد لفوق في لوحة التحكم
- `src/components/ConfettiBurst.jsx` — احتفال بصري عند إتمام الأوردر/الاستبدال

## طبقة البيانات (`src/supabase.js`)
- Firestore كان بيرجع snake_case من DB، الكود بيتوقع camelCase (زي أيام Firebase) — فيه Mapper تلقائي:
  - `mapOrderedRow(row)` / `unmapOrderedRow(obj)` — للجداول اللي فيها ترتيب (`products`, `categories`)، بيحول عمود `position` ↔ خاصية `order` في الكود
  - `rowToCamel` / `toSnakeRow` — تحويل عام camelCase ↔ snake_case لباقي الجداول

## قاعدة البيانات — الملفات لازم تتشغل بالترتيب ده في Supabase SQL Editor
1. `supabase/schema.sql` — الجداول الأساسية (`products`, `categories`, `orders`, `staff_users`) + RLS + RPCs للـ login الآمن + storage bucket
2. `supabase/auth-hardening.sql` — تقييد الكتابة على `products`/`categories` لمستخدم Supabase Auth فقط (بدل ما تكون مفتوحة لأي حد معاه الـ anon key)
3. `supabase/migration-2-new-features.sql` — يجمع 3 حاجات:
   - **صلاحيات إدارية متدرجة**: جدول `admin_profiles` (مدير عام / مشرف) + **سجل تدقيق تلقائي** (`audit_log`) بتريجرز على `products`/`categories`/`staff_users`
   - **كومبوهات وعروض**: عمودين إضافيين على `products` (`is_combo`, `combo_items`)
   - **نقاط قابلة للاستبدال**: جدولين `rewards` و `loyalty_redemptions`

⚠️ لو عايز تعمل تعديل SQL جديد، اعمل ملف جديد بترقيم تسلسلي (`migration-3-...sql`) واحفظه في `supabase/` — متعدلش الملفات القديمة عشان تفضل سجل واضح لتاريخ التغييرات.

## نظامين "مدير" منفصلين (نقطة مهمة لسه معلقة)
1. **`staff_users`** (جدول قديم من أيام Firebase) — بيستخدمه تاب "إدارة" جوه `/cashier` (إيميل+باسورد نص صريح تقريبًا، لسه فيه نقطة ضعف أمنية قديمة)
2. **`admin_profiles`** (Supabase Auth الحقيقي) — بيستخدمه `/admin` (الأحدث والأأمن)

**لسه محتاجين نوحدهم في جلسة قادمة** — ده أهم تحسين تقني متبقي قبل النشر.

## الحالة الحالية (خلصان)
- ✅ الهجرة الكاملة من Firebase لـ Supabase (بيانات حقيقية منقولة)
- ✅ تصميم موحّد للثلاث واجهات + أنيميشن/تفاعلات (staggered reveal, confetti, animated counters)
- ✅ تسجيل دخول حقيقي لـ `/admin` (Supabase Auth) بدل ما يكون مفتوح للكل
- ✅ صلاحيات متدرجة (مدير عام/مشرف) + سجل تدقيق تلقائي
- ✅ كومبوهات وعروض (قسم مخصص في منيو العميل)
- ✅ نقاط ولاء قابلة للاستبدال (كود يتفعّل من الكاشير)
- ✅ تنبيه مخزون منخفض (banner في كل شاشات الأدمن + إشعار متصفح)
- ✅ سجل فواتير فيه بحث/فلترة/تصدير Excel

## الباقي في الـ backlog (مرتب بالأولوية المتفق عليها)
1. **توحيد نظامي "المدير"** المذكورين فوق
2. **الدفع الإلكتروني الحقيقي** — محتاج المستخدم يفتح حساب مع بوابة دفع (Moyasar/PayTabs) الأول
3. **تنبيهات مخزون خارج المتصفح** (واتساب/إيميل) — محتاج Supabase Edge Function + حساب خدمة رسائل
4. **Code splitting** — الـ bundle حجمه ~1.3MB، فيه تحذير من Vite
5. دعم أكتر من فرع، PWA، لغة إنجليزية — أفكار مستقبلية مش مؤكدة بعد

## حاجات لازم الحرص عليها
- كل الألوان لازم تتكتب بـ CSS variables (`var(--teal)` إلخ) مش hex مباشر، عشان الاتساق
- أي جدول جديد في Supabase لازم ياخد RLS policy واضحة (مفيش جدول من غير RLS)
- الـ anon key في `src/supabase.js` مش سر (زي أي public client config)، بس أي مفتاح `service_role` **متضافش للكود أو للـ git أبدًا**
