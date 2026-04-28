import React, { useEffect, useState } from "react";
import api from "../api/axios";

export default function VoucherList() {
  const [vouchers, setVouchers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/inventory/voucher");
        setVouchers(res.data);
      } catch (err) {
        console.error("❌ Lỗi tải phiếu:", err);
      }
    };
    load();
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">📄 Danh sách phiếu nhập / xuất kho</h2>
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">Số phiếu</th>
            <th className="border p-2">Loại</th>
            <th className="border p-2">Tổng tiền</th>
            <th className="border p-2">Ngày lập</th>
            <th className="border p-2">Địa điểm</th>
            <th className="border p-2">Người lập</th>
            <th className="border p-2">Hàng hóa</th>
          </tr>
        </thead>
        <tbody>
          {vouchers.map((v) => (
            <tr key={v.id} className="border-t hover:bg-gray-50 align-top">
              <td className="text-center">{v.voucherNo}</td>
              <td className="text-center">
                {v.type === "PNK" ? "Nhập kho" : "Xuất kho"}
              </td>
              <td className="text-right">
                {Number(v.totalAmount || 0).toLocaleString("vi-VN")} đ
              </td>
              <td className="text-center">
                {new Date(v.createdAt).toLocaleDateString("vi-VN")}
              </td>
              <td>{v.location || "-"}</td>
              <td>{v.user?.name || "-"}</td>
              <td className="text-left">
                {v.items && v.items.length > 0 ? (
                  <div className="space-y-1">
                    {v.items.map((it, i) => (
                      <div key={i}>
                        {it.name} — SL:{" "}
                        <b>{Number(it.qtyActual || 0).toLocaleString()}</b>{" "}
                        {it.unit || ""}
                      </div>
                    ))}
                  </div>
                ) : (
                  <i>Không có hàng hóa</i>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
