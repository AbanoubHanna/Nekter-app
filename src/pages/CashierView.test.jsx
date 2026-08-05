import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CashierView from './CashierView';
import { supabase } from '../supabase';

// The real client returns Postgrest query builders that are both chainable
// and awaitable (thenable). These fakes mimic just enough of that shape for
// the `orders` and `loyalty_redemptions` chains CashierView actually uses.
const ordersBuilder = {};
ordersBuilder.select = vi.fn(() => ordersBuilder);
ordersBuilder.order = vi.fn(() => Promise.resolve({ data: [], error: null }));
ordersBuilder.update = vi.fn(() => ordersBuilder);
ordersBuilder.eq = vi.fn(() => Promise.resolve({ error: null }));

const loyaltyBuilder = {};
loyaltyBuilder.select = vi.fn(() => loyaltyBuilder);
loyaltyBuilder.eq = vi.fn(() => loyaltyBuilder);
loyaltyBuilder.update = vi.fn(() => loyaltyBuilder);
loyaltyBuilder.maybeSingle = vi.fn();

vi.mock('../supabase', () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
  mapOrderedRow: (row) => row,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'alert').mockImplementation(() => {});
  supabase.from.mockImplementation((table) => (table === 'orders' ? ordersBuilder : loyaltyBuilder));
});

const enterPin = (pin) => {
  fireEvent.change(screen.getByPlaceholderText('أدخل رمز الـ PIN (4 أرقام)'), { target: { value: pin } });
  fireEvent.click(screen.getByRole('button', { name: /دخول للنظام/ }));
};

const loginAsCashier = async () => {
  supabase.rpc.mockResolvedValueOnce({
    data: [{ id: 'staff-1', name: 'محمد', role: 'كاشير', status: 'نشط', photo: null }],
    error: null,
  });
  render(<CashierView />);
  enterPin('1234');
  await screen.findByText('محمد');
};

describe('CashierView — تسجيل دخول الكاشير بالـ PIN', () => {
  it('يدخل الكاشير وتظهر شاشة الطلبات لما الـ PIN يبقى صح', async () => {
    await loginAsCashier();
    expect(screen.getByRole('button', { name: /استبدال نقاط/ })).toBeInTheDocument();
  });

  it('يرفض الدخول ويعرض تنبيه لما الـ PIN يبقى غلط', async () => {
    supabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    render(<CashierView />);
    enterPin('9999');
    await vi.waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('رمز الـ PIN غير صحيح!');
    });
    expect(screen.getByPlaceholderText('أدخل رمز الـ PIN (4 أرقام)')).toBeInTheDocument();
  });

  it('يمنع دخول حساب موقوف حتى لو الـ PIN صح', async () => {
    supabase.rpc.mockResolvedValueOnce({
      data: [{ id: 'staff-2', name: 'سارة', role: 'كاشير', status: 'موقوف' }],
      error: null,
    });
    render(<CashierView />);
    enterPin('1111');
    await vi.waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('حسابك موقوف، يرجى مراجعة الإدارة.');
    });
    expect(screen.getByPlaceholderText('أدخل رمز الـ PIN (4 أرقام)')).toBeInTheDocument();
  });
});

describe('CashierView — تفعيل كود المكافأة', () => {
  const openRedeemModal = () => {
    fireEvent.click(screen.getByRole('button', { name: /استبدال نقاط/ }));
  };
  const submitCode = (code) => {
    fireEvent.change(screen.getByPlaceholderText('XXXXXX'), { target: { value: code } });
    fireEvent.click(screen.getByRole('button', { name: /تحقق وفعّل/ }));
  };

  it('يفعّل كود صحيح وغير مستخدم من قبل', async () => {
    await loginAsCashier();
    openRedeemModal();
    loyaltyBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'r1', status: 'غير مستخدم', reward_name: 'قهوة مجانية' },
      error: null,
    });
    submitCode('abc123');
    await screen.findByText('تم تفعيل: قهوة مجانية');
    expect(loyaltyBuilder.eq).toHaveBeenCalledWith('code', 'ABC123');
  });

  it('يرفض كود اتفعّل قبل كده', async () => {
    await loginAsCashier();
    openRedeemModal();
    loyaltyBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'r2', status: 'مستخدم', reward_name: 'قهوة مجانية' },
      error: null,
    });
    submitCode('used01');
    await screen.findByText('الكود ده اتفعّل قبل كده');
  });

  it('يرفض كود مش موجود أصلاً', async () => {
    await loginAsCashier();
    openRedeemModal();
    loyaltyBuilder.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    submitCode('nope00');
    await screen.findByText('الكود غير موجود');
  });
});
