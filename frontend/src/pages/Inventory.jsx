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

  // ===== LOAD DATA =====
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

  // ====== THÊM HÀNG HÓA ======
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

  // ====== XÓA HÀNG HÓA ======
  const handleDelete = async (id) => {
    if (!window.confirm("Bạn có chắc muốn xóa hàng hóa này?")) return;
    try {
      await api.delete(`/inventory/items/${id}`);
      await loadItems();
    } catch (err) {
      console.error("❌ Lỗi xóa hàng:", err);
    }
  };

  // ====== BẬT / TẮT CHỈNH SỬA ======
  const handleEdit = (item) => {
    setEditingItem(editingItem?.id === item.id ? null : { ...item });
  };

  // ====== CẬP NHẬT HÀNG HÓA ======
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
      <h2 className="text-2xl font-bold">📦 Quản lý kho hàng</h2>

      {/* BẢNG HÀNG HÓA */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="w-20">Mã</th>
              <th className="w-32">Tên</th>
              <th className="w-24">Loại</th>
              <th className="w-16">ĐVT</th>
              <th className="w-16">Tồn</th>
              <th className="w-24">Giá nhập</th>
              <th className="w-24">Giá xuất</th>
              <th className="w-40">Ghi chú</th>
              <th className="w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t text-center hover:bg-gray-50">
                {editingItem?.id === i.id ? (
                  <>
                    <td>
                      <input
                        className="border w-full p-1"
                        value={editingItem.code}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, code: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="border w-full p-1"
                        value={editingItem.name}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, name: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="border w-full p-1"
                        value={editingItem.category || ""}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, category: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="border w-full p-1"
                        value={editingItem.unit}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, unit: e.target.value })
                        }
                      />
                    </td>
                    <td>{editingItem.quantity}</td>
                    <td>
                      <input
                        type="number"
                        className="border w-full p-1"
                        value={editingItem.unitPriceIn}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            unitPriceIn: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        className="border w-full p-1"
                        value={editingItem.unitPriceOut}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            unitPriceOut: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className="border w-full p-1"
                        value={editingItem.note || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            note: e.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => handleUpdate(i.id)}
                        className="bg-green-600 text-white px-2 py-1 rounded mr-2"
                      >
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingItem(null)}
                        className="bg-gray-500 text-white px-2 py-1 rounded"
                      >
                        Hủy
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td>{i.code || "-"}</td>
                    <td className="truncate max-w-[120px] break-words">
                      {i.name}
                    </td>
                    <td>{i.category || "-"}</td>
                    <td>{i.unit}</td>
                    <td>{i.quantity}</td>
                    <td>{i.unitPriceIn.toLocaleString("vi-VN")} đ</td>
                    <td>{i.unitPriceOut.toLocaleString("vi-VN")} đ</td>
                    <td className="truncate max-w-[150px] break-words">
                      {i.note || ""}
                    </td>
                    <td>
                      <button
                        onClick={() => handleEdit(i)}
                        className="bg-yellow-400 text-white px-2 py-1 rounded mr-2"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(i.id)}
                        className="bg-red-600 text-white px-2 py-1 rounded"
                      >
                        Xóa
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FORM THÊM HÀNG MỚI + TẠO PHIẾU */}
      <div className="flex gap-6 flex-wrap border-t pt-4">
        <div className="flex-1">
          <h3 className="font-semibold mb-2">➕ Thêm hàng hóa mới</h3>
          <input
            className="border p-2 w-full mb-2"
            placeholder="Mã hàng"
            value={newItem.code}
            onChange={(e) => setNewItem({ ...newItem, code: e.target.value })}
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Tên hàng hóa"
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Loại hàng"
            value={newItem.category}
            onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
          />
          <input
            className="border p-2 w-full mb-2"
            placeholder="Đơn vị tính (VD: kg, cái...)"
            value={newItem.unit}
            onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
          />
          <input
            type="number"
            className="border p-2 w-full mb-2"
            placeholder="Giá nhập mặc định"
            value={newItem.unitPriceIn}
            onChange={(e) =>
              setNewItem({ ...newItem, unitPriceIn: e.target.value })
            }
          />
          <input
            type="number"
            className="border p-2 w-full mb-2"
            placeholder="Giá bán mặc định"
            value={newItem.unitPriceOut}
            onChange={(e) =>
              setNewItem({ ...newItem, unitPriceOut: e.target.value })
            }
          />
          <textarea
            className="border p-2 w-full mb-2"
            placeholder="Ghi chú"
            value={newItem.note}
            onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
          />
          <button
            onClick={handleAddItem}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            Lưu hàng hóa mới
          </button>

          <div className="flex gap-3 mt-4 justify-end">
            <button
              onClick={() => navigate("/inventory/voucher/new")}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition-all"
            >
              <i className="fa-solid fa-file-circle-plus"></i>
              Tạo phiếu nhập kho
            </button>

            <button
              onClick={() => navigate("/inventory/voucher-out/new")}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 transition-all"
            >
              <i className="fa-solid fa-file-export"></i>
              Tạo phiếu xuất kho
            </button>
             <button
    onClick={() => navigate("/inventory/voucher")}
    className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg shadow hover:bg-gray-800 transition-all"
  >
    <i className="fa-solid fa-list"></i>
    Danh sách phiếu
  </button>
          </div>
        </div>
      </div>
    </div>
  );
}
