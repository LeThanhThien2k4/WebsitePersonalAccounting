import React, { useState, useEffect } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function Profile() {
  const [form, setForm] = useState({
    businessName: "",
    address: "",
    taxCode: "",
    bankAccount: "",
    bankName: "",
    phone: "",
  });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

 useEffect(() => {
  const fetchProfile = async () => {
    try {
      const res = await api.get("/users/profile");
      const p = res.data || {};

      setForm({
        businessName: p.businessName || "",
        address: p.address || "",
        taxCode: p.taxCode || "",
        bankAccount: p.bankAccount || "",
        bankName: p.bankName || "",
        phone: p.phone || "",
      });

      if (!p.businessName) setEditMode(true);
    } catch {
      toast.error("Không thể tải hồ sơ");
    } finally {
      setLoading(false);
    }
  };
  fetchProfile();
}, []);

const handleSave = async () => {
  // Ép tất cả về string để tránh lỗi null.trim()
  const payload = {
    businessName: form.businessName?.trim() || "",
    address: form.address?.trim() || "",
    taxCode: form.taxCode?.trim() || "",
    bankAccount: form.bankAccount?.trim() || "",
    bankName: form.bankName?.trim() || "",
    phone: form.phone?.trim() || "",
  };

  // ===== FE VALIDATE =====
  if (!payload.businessName) return toast.error("Tên hộ/cá nhân kinh doanh không được để trống");
  if (!payload.address) return toast.error("Địa chỉ không được để trống");

  if (!payload.taxCode)
    return toast.error("Mã số thuế không được để trống");

  if (!/^\d{10}(\d{3})?$/.test(payload.taxCode))
    return toast.error("Mã số thuế không hợp lệ (10 hoặc 13 số)");

  if (!payload.bankAccount)
    return toast.error("Số tài khoản không được để trống");

  if (!/^\d+$/.test(payload.bankAccount))
    return toast.error("Số tài khoản phải là số");

  if (!payload.bankName)
    return toast.error("Tên ngân hàng không được để trống");

  if (!payload.phone)
    return toast.error("Số điện thoại không được để trống");

  if (!/^(0|\+84)\d{9}$/.test(payload.phone))
    return toast.error("Số điện thoại không hợp lệ");

  try {
    await api.put("/users/profile", payload);
    toast.success("✅ Đã lưu thông tin hồ sơ");
    setEditMode(false);
  } catch (err) {
    toast.error(err.response?.data?.error || "Lỗi khi cập nhật thông tin");
  }
};



  if (loading) return <p>Đang tải...</p>;

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-4xl bg-white p-10 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
          🏢 Hồ sơ doanh nghiệp
        </h2>

        {!editMode ? (
          <>
            <div className="space-y-4 text-gray-800 text-lg leading-relaxed">
              <p>
                <b>Tên hộ/cá nhân kinh doanh:</b> {form.businessName || "—"}
              </p>
              <p>
                <b>Địa chỉ:</b> {form.address || "—"}
              </p>
              <p>
                <b>Mã số thuế:</b> {form.taxCode || "—"}
              </p>
              <p>
                <b>Số tài khoản:</b> {form.bankAccount || "—"}
              </p>
              <p>
                <b>Ngân hàng:</b> {form.bankName || "—"}
              </p>
              <p>
                <b>Số điện thoại:</b> {form.phone || "—"}
              </p>
            </div>

            <div className="mt-8">
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 bg-yellow-500 text-white px-5 py-3 rounded-lg hover:bg-yellow-600 transition-all text-base font-medium"
              >
                ✏️ Chỉnh sửa
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6 text-base">
              <input
                className="border p-3 rounded w-full"
                placeholder="Tên hộ/cá nhân kinh doanh"
                value={form.businessName || ""}
                onChange={(e) =>
                  setForm({ ...form, businessName: e.target.value })
                }
              />
              <input
                className="border p-3 rounded w-full"
                placeholder="Địa chỉ kinh doanh"
                value={form.address || ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
              <input
                className="border p-3 rounded w-full"
                placeholder="Mã số thuế"
                value={form.taxCode || ""}
                onChange={(e) => setForm({ ...form, taxCode: e.target.value })}
              />
              <input
                className="border p-3 rounded w-full"
                placeholder="Số tài khoản ngân hàng"
                value={form.bankAccount || ""}
                onChange={(e) =>
                  setForm({ ...form, bankAccount: e.target.value })
                }
              />
              <input
                className="border p-3 rounded w-full"
                placeholder="Tên ngân hàng"
                value={form.bankName || ""}
                onChange={(e) => setForm({ ...form, bankName: e.target.value })}
              />
              <input
                className="border p-3 rounded w-full"
                placeholder="Số điện thoại liên hệ"
                value={form.phone || ""}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div className="flex gap-4 mt-8">
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                💾 Lưu thông tin
              </button>
              <button
                onClick={() => setEditMode(false)}
                className="bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 font-medium"
              >
                Hủy
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
