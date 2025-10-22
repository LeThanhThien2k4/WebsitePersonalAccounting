import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

export default function Inventory() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState({
    code: "",
    name: "",
    category: "",
    unit: "",
    unitPriceIn: "",
    unitPriceOut: "",
    note: "",
  });
  const [editingItem, setEditingItem] = useState(null);

  const loadItems = async () => {
    try {
      const res = await api.get("/inventory/items");
      setItems(res.data);
    } catch (err) {
      console.error("❌ Lỗi tải dữ liệu hàng hóa:", err);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAddItem = async () => {
    try {
      await api.post("/inventory/items", {
        ...newItem,
        unitPriceIn: Number(newItem.unitPriceIn),
        unitPriceOut: Number(newItem.unitPriceOut),
      });
      setNewItem({
        code: "",
        name: "",
        category: "",
        unit: "",
        unitPriceIn: "",
        unitPriceOut: "",
        note: "",
      });
      await loadItems();
      alert("✅ Đã thêm hàng hóa mới");
    } catch (err) {
      console.error("❌ Lỗi khi thêm hàng hóa:", err);
      alert("Lỗi khi thêm hàng hóa");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa hàng hóa này?")) return;
    try {
      await api.delete(`/inventory/items/${id}`);
      await loadItems();
    } catch (err) {
      console.error("❌ Lỗi xóa hàng:", err);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(editingItem?.id === item.id ? null : { ...item });
  };

  const handleUpdate = async (id) => {
    try {
      await api.put(`/inventory/items/${id}`, {
        ...editingItem,
        unitPriceIn: Number(editingItem.unitPriceIn),
        unitPriceOut: Number(editingItem.unitPriceOut),
      });
      setEditingItem(null);
      await loadItems();
      alert("✅ Đã cập nhật hàng hóa");
    } catch (err) {
      console.error("❌ Lỗi cập nhật hàng hóa:", err);
      alert("Lỗi khi cập nhật hàng hóa");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight">📦 Quản lý kho hàng</h2>

      {/* BẢNG */}
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm [&_th]:text-left [&_td]:text-left">
            <thead className="bg-neutral-50 sticky top-0 z-10">
              <tr className="text-neutral-700">
                <th className="p-3 w-20">Mã</th>
                <th className="p-3 w-40">Tên</th>
                <th className="p-3 w-28">Loại</th>
                <th className="p-3 w-20">ĐVT</th>
                <th className="p-3 w-20">Tồn</th>
                <th className="p-3 w-32">Giá nhập</th>
                <th className="p-3 w-32">Giá xuất</th>
                <th className="p-3 w-56">Ghi chú</th>
                <th className="p-3 w-48">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t hover:bg-neutral-50">
                  {editingItem?.id === i.id ? (
                    <>
                      <td className="p-2">
                        <input
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.code}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, code: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.name}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, name: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.category || ""}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              category: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.unit}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, unit: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">{editingItem.quantity}</td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.unitPriceIn}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              unitPriceIn: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.unitPriceOut}
                          onChange={(e) =>
                            setEditingItem({
                              ...editingItem,
                              unitPriceOut: e.target.value,
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          className="w-full rounded border border-neutral-300 px-2 py-1"
                          value={editingItem.note || ""}
                          onChange={(e) =>
                            setEditingItem({ ...editingItem, note: e.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleUpdate(i.id)}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="rounded-lg bg-neutral-500 px-3 py-1.5 text-white hover:bg-neutral-600"
                          >
                            Hủy
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2">{i.code || "-"}</td>
                      <td className="p-2 truncate max-w-[160px]">{i.name}</td>
                      <td className="p-2">{i.category || "-"}</td>
                      <td className="p-2">{i.unit}</td>
                      <td className="p-2">{i.quantity}</td>
                      <td className="p-2">{i.unitPriceIn.toLocaleString("vi-VN")} đ</td>
                      <td className="p-2">{i.unitPriceOut.toLocaleString("vi-VN")} đ</td>
                      <td className="p-2 truncate max-w-[220px]">{i.note || ""}</td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleEdit(i)}
                            className="rounded-lg bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => handleDelete(i.id)}
                            className="rounded-lg bg-rose-600 px-3 py-1.5 text-white hover:bg-rose-700"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-6 text-center text-neutral-500" colSpan={9}>
                    Chưa có hàng hóa nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM THÊM + QUICK ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <h3 className="font-semibold mb-3">➕ Thêm hàng hóa mới</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Mã hàng"
              value={newItem.code}
              onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
            />
            <input
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Tên hàng hóa"
              value={newItem.name}
              onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            />
            <input
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Loại hàng"
              value={newItem.category}
              onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
            />
            <input
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Đơn vị tính (kg, cái...)"
              value={newItem.unit}
              onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
            />
            <input
              type="number"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Giá nhập mặc định"
              value={newItem.unitPriceIn}
              onChange={(e) => setNewItem({ ...newItem, unitPriceIn: e.target.value })}
            />
            <input
              type="number"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Giá bán mặc định"
              value={newItem.unitPriceOut}
              onChange={(e) => setNewItem({ ...newItem, unitPriceOut: e.target.value })}
            />
            <textarea
              className="sm:col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Ghi chú"
              value={newItem.note}
              onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
            />
          </div>
          <button
            onClick={handleAddItem}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Lưu hàng hóa mới
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5">
          <h3 className="font-semibold mb-3">⚡ Thao tác nhanh</h3>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate("/inventory/voucher/new")}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Tạo phiếu nhập kho
            </button>
            <button
              onClick={() => navigate("/inventory/voucher-out/new")}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700"
            >
              Tạo phiếu xuất kho
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
