import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import AnimatedNumber from "../components/AnimatedNumber";

const RANGE_OPTIONS = [
  { id: "today", label: "اليوم" },
  { id: "week", label: "آخر 7 أيام" },
  { id: "month", label: "آخر 30 يوم" },
  { id: "all", label: "كل الفترات" },
];

const getOrderDate = (o) => o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt);

const Reports = ({ orders, products }) => {
  const [range, setRange] = useState("week");

  const filteredOrders = useMemo(() => {
    if (range === "all") return orders;
    const now = new Date();
    const cutoff = new Date();
    if (range === "today") cutoff.setHours(0, 0, 0, 0);
    if (range === "week") cutoff.setDate(now.getDate() - 7);
    if (range === "month") cutoff.setDate(now.getDate() - 30);
    return orders.filter(o => getOrderDate(o) >= cutoff);
  }, [orders, range]);

  const totalSales = filteredOrders.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);
  const totalCost = filteredOrders.reduce((acc, o) => acc + (o.items || []).reduce((sum, item) => {
    const prod = products.find(p => p.name === item.name);
    return sum + (Number(prod?.costPrice || 0) * item.qty);
  }, 0), 0);

  const netProfit = totalSales - totalCost;
  const aov = filteredOrders.length > 0 ? Math.round(totalSales / filteredOrders.length) : 0;

  const getAiSuggestion = () => {
    if (filteredOrders.length === 0) return "⏳ لا توجد طلبات في هذه الفترة بعد لبدء التحليل...";
    if (aov < 30) return "💡 متوسط السلة منخفض! درّب الكاشير على سؤال العميل: 'تحب تضيف كراميل أو حلى مع طلبك؟' لرفع المتوسط.";
    if (aov > 60) return "🔥 متوسط السلة ممتاز! عملائك مستعدون للدفع. أنشئ منتج (Signature) مميز بسعر أعلى لهذه الفئة.";
    return "📈 الأداء مستقر. راجع الأصناف الأقل مبيعاً بالأسفل واعمل لها عرض (كومبو) لتحريك المخزون.";
  };

  const peakHoursData = Array.from({ length: 24 }, (_, i) => {
    const count = filteredOrders.filter(o => getOrderDate(o).getHours() === i).length;
    return { hour: `${i}:00`, الطلبات: count };
  }).filter(d => d.الطلبات > 0);

  const categorySales = filteredOrders.flatMap(o => o.items || []).reduce((acc, item) => {
    const prod = products.find(p => p.name === item.name);
    const cat = prod ? prod.category : 'أخرى';
    acc[cat] = (acc[cat] || 0) + (item.price * item.qty);
    return acc;
  }, {});
  const pieData = Object.keys(categorySales).map(key => ({ name: key, value: categorySales[key] }));
  const COLORS = ['#1F9E92', '#C97D2E', '#B6467A', '#16213A', '#3B7DD6'];

  // top / worst selling products by quantity
  const productStats = filteredOrders.flatMap(o => o.items || []).reduce((acc, item) => {
    if (!acc[item.name]) acc[item.name] = { name: item.name, qty: 0, revenue: 0 };
    acc[item.name].qty += item.qty;
    acc[item.name].revenue += item.price * item.qty;
    return acc;
  }, {});
  const statsList = Object.values(productStats).sort((a, b) => b.qty - a.qty);
  const topProducts = statsList.slice(0, 5);
  const worstProducts = statsList.length > 5 ? statsList.slice(-5).reverse() : [];

  return (
    <div className="n-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 className="section-title" style={{ margin: 0 }}>نظرة عامة على الأداء 📈</h1>
        <div style={{ display: 'flex', gap: '8px', background: 'var(--paper)', padding: '5px', borderRadius: 'var(--r-md)', border: '1px solid var(--line)' }}>
          {RANGE_OPTIONS.map(o => (
            <button key={o.id} onClick={() => setRange(o.id)} className="n-btn" style={{
              padding: '8px 14px', fontSize: '13px',
              background: range === o.id ? 'var(--ink)' : 'transparent',
              color: range === o.id ? 'white' : 'var(--ink-soft)',
              boxShadow: 'none'
            }}>{o.label}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '22px' }}>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '0ms', padding: '22px', background: 'linear-gradient(135deg, var(--ink), #1E2A44)', color: 'white', border: 'none' }}>
          <div style={{ color: '#9BA6B8', fontSize: '13px', fontWeight: 600 }}>إجمالي المبيعات</div>
          <div style={{ fontSize: '30px', fontWeight: 900, marginTop: '5px' }}><AnimatedNumber value={totalSales} /> <span style={{ fontSize: '15px', color: '#9BA6B8' }}>ر.س</span></div>
        </div>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '60ms', padding: '22px', borderRight: '6px solid var(--success)' }}>
          <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>إجمالي الأرباح</div>
          <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--success)', marginTop: '5px' }}><AnimatedNumber value={netProfit} /> <span style={{ fontSize: '15px', color: 'var(--ink-faint)' }}>ر.س</span></div>
        </div>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '120ms', padding: '22px', borderRight: '6px solid var(--teal)' }}>
          <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>متوسط السلة (AOV)</div>
          <div style={{ fontSize: '30px', fontWeight: 900, marginTop: '5px' }}><AnimatedNumber value={aov} /> <span style={{ fontSize: '15px', color: 'var(--ink-faint)' }}>ر.س</span></div>
        </div>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '180ms', padding: '22px', borderRight: '6px solid var(--amber)' }}>
          <div style={{ color: 'var(--ink-faint)', fontSize: '13px', fontWeight: 600 }}>عدد الطلبات</div>
          <div style={{ fontSize: '30px', fontWeight: 900, marginTop: '5px' }}><AnimatedNumber value={filteredOrders.length} /></div>
        </div>
      </div>

      <div className="n-card" style={{ padding: '22px', background: 'linear-gradient(to left, var(--paper), var(--paper-raised))', borderRight: '4px solid var(--info)', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span style={{ fontSize: '24px' }}>🎯</span>
          <h3 style={{ margin: 0, color: 'var(--ink)' }}>المستشار الذكي لزيادة المبيعات</h3>
        </div>
        <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: '15px', fontWeight: 600, lineHeight: 1.6 }}>{getAiSuggestion()}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '240ms', padding: '22px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '18px', color: 'var(--ink)' }}>📈 رادار ساعات الذروة</h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHoursData}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} style={{ fontSize: '11px' }} />
                <Tooltip cursor={{ fill: 'var(--paper)' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)', fontWeight: 'bold' }} />
                <Bar dataKey="الطلبات" fill="var(--teal)" radius={[6, 6, 0, 0]} barSize={26} animationDuration={900} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="n-card n-rise n-hover-lift" style={{ '--d': '300ms', padding: '22px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '18px', color: 'var(--ink)' }}>🥧 توزيع مبيعات الأقسام</h3>
          <div style={{ height: '240px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={82} paddingAngle={5} dataKey="value" stroke="none" animationDuration={900} animationEasing="ease-out">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-md)', fontWeight: 'bold' }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '360ms', padding: '22px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '14px', color: 'var(--ink)' }}>🏆 الأكثر مبيعاً</h3>
          {topProducts.length === 0 ? <p style={{ color: 'var(--ink-faint)' }}>لا توجد بيانات كافية بعد.</p> : topProducts.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < topProducts.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ fontWeight: '700', color: 'var(--ink)' }}>#{i + 1} {p.name}</span>
              <span style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span className="tag tag-cold">{p.qty} قطعة</span>
                <span className="stub" style={{ fontSize: '12px' }}>{p.revenue.toLocaleString()} ر.س</span>
              </span>
            </div>
          ))}
        </div>
        <div className="n-card n-rise n-hover-lift" style={{ '--d': '420ms', padding: '22px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '14px', color: 'var(--ink)' }}>🐌 الأقل مبيعاً</h3>
          {worstProducts.length === 0 ? <p style={{ color: 'var(--ink-faint)' }}>لا توجد بيانات كافية بعد للمقارنة.</p> : worstProducts.map((p, i) => (
            <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < worstProducts.length - 1 ? '1px solid var(--line)' : 'none' }}>
              <span style={{ fontWeight: '700', color: 'var(--ink)' }}>{p.name}</span>
              <span className="tag" style={{ background: 'var(--warning-tint)', color: 'var(--warning)' }}>{p.qty} قطعة فقط</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Reports;
