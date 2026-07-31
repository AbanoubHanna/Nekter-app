import React from "react";

const COLUMNS = [
  { id: "تم الاستلام", title: "📥 تم الاستلام", color: "var(--danger)", tint: "var(--danger-tint)" },
  { id: "تم الدفع", title: "💳 تم الدفع", color: "var(--info)", tint: "var(--info-tint)" },
  { id: "يتم التحضير", title: "⏳ يتم التحضير", color: "var(--amber)", tint: "var(--amber-tint)" },
  { id: "جاهز للاستلام", title: "🛍️ جاهز للاستلام", color: "var(--success)", tint: "var(--success-tint)" }
];

const matchStatus = (orderStatus, colId) => {
  let s = orderStatus || "تم الاستلام";
  if (s === "جديد") s = "تم الاستلام";
  if (s === "التحضير" || s === "جاري التحضير" || s === "جاري التجهيز") s = "يتم التحضير";
  if (s === "جاهز") s = "جاهز للاستلام";
  return s === colId;
};

const LiveOrders = ({ orders }) => {
  const activeOrders = orders.filter(o => o.status !== "مكتمل");

  return (
    <div className="n-fade-in" style={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--ink)', margin: 0 }}>شاشة المراقبة الحية 🔴</h2>
          <p style={{ fontSize: '13px', color: 'var(--ink-faint)', margin: 0 }}>متابعة سير الطلبات ومراحل الكاشير (للعرض فقط)</p>
        </div>
        <div style={{ background: 'var(--ink)', color: 'white', padding: '10px 20px', borderRadius: 'var(--r-md)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="live-dot" />
          إجمالي الطلبات النشطة: {activeOrders.length}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', flex: 1, overflowX: 'auto', paddingBottom: '10px' }}>
        {COLUMNS.map((col, colIdx) => {
          const colOrders = activeOrders.filter(o => matchStatus(o.status, col.id));
          return (
            <div key={col.id} className="n-card n-rise" style={{ '--d': `${colIdx * 80}ms`, flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
              <div style={{ background: col.tint, padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: col.color, fontSize: '14.5px' }}>{col.title}</b>
                <span style={{ background: 'var(--paper-raised)', color: col.color, padding: '2px 10px', borderRadius: 'var(--r-full)', fontSize: '13px', fontWeight: 'bold' }}>
                  {colOrders.length}
                </span>
              </div>

              <div style={{ padding: '14px', overflowY: 'auto', flex: 1, background: 'var(--paper)' }}>
                {colOrders.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--ink-faint)', marginTop: '50px', fontSize: '13px' }}>فارغ حالياً</div>
                ) : (
                  colOrders.map(order => (
                    <div key={order.id} className="n-card n-hover-lift" style={{ padding: '15px', marginBottom: '14px', position: 'relative', overflow: 'hidden', borderTopWidth: '3px', borderTopColor: col.color }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px dashed var(--line)', paddingBottom: '10px' }}>
                        <div>
                          <b style={{ fontSize: '14px', color: 'var(--ink)', display: 'block' }}>{order.customerName || "عميل بدون اسم"}</b>
                          <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>#{order.id.slice(-5).toUpperCase()}</span>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <span style={{ display: 'block', background: col.tint, color: col.color, padding: '4px 10px', borderRadius: 'var(--r-sm)', fontSize: '12px', fontWeight: 'bold' }}>
                            طاولة {order.tableNumber}
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--ink-faint)', marginTop: '4px', display: 'block' }}>
                            {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : "الآن"}
                          </span>
                        </div>
                      </div>

                      <div style={{ marginBottom: '10px' }}>
                        {order.items?.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                            <span style={{ color: 'var(--ink)', fontWeight: '600' }}>
                              <span style={{ color: col.color, fontWeight: '900', marginLeft: '5px' }}>{item.qty}x</span> {item.name}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div style={{ background: 'var(--danger-tint)', color: 'var(--danger)', padding: '6px 10px', borderRadius: 'var(--r-sm)', fontSize: '11px', fontWeight: 'bold', marginTop: '10px', display: 'flex', gap: '5px' }}>
                          <span>⚠️ ملاحظة:</span><span>{order.notes}</span>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--paper)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--ink-faint)', fontWeight: 'bold' }}>
                          دفع: <span style={{ color: order.paymentMethod === 'كاش' ? 'var(--success)' : 'var(--info)' }}>{order.paymentMethod}</span>
                        </span>
                        <span className="stub" style={{ fontSize: '13px' }}>{order.total} ر.س</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        .live-dot { display: inline-block; width: 10px; height: 10px; background: var(--danger); border-radius: 50%; animation: livePulse 1.5s infinite; }
        @keyframes livePulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(214, 69, 69, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(214, 69, 69, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(214, 69, 69, 0); }
        }
      `}</style>
    </div>
  );
};

export default LiveOrders;
