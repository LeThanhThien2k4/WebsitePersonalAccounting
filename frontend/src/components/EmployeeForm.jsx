import { useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import React from "react";
export default function EmployeeForm({ data, onClose, onSaved }) {
  const [form, setForm] = useState({
    code: data.code || "",
    fullName: data.fullName || "",
    position: data.position || "",
    baseSalary: data.baseSalary || "",
    bankAccount: data.bankAccount || "",
    bankName: data.bankName || "",
    isActive: data.isActive ?? true,
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      if (data.id) {
        await api.patch(`/employees/${data.id}`, form);
        toast.success("Đã cập nhật nhân viên");
      } else {
        await api.post("/employees", form);
        toast.success("Đã thêm nhân viên mới");
      }
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || "Lỗi lưu nhân viên");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
      <div className="bg-white p-6 rounded shadow-lg w-[400px] space-y-3">
        <h2 className="font-semibold text-lg mb-2">
          {data.id ? "Cập nhật nhân viên" : "Thêm nhân viên mới"}
        </h2>

        {["code", "fullName", "position", "baseSalary", "bankAccount", "bankName"].map(field => (
          <div key={field}>
            <label className="text-sm block mb-1 capitalize">{field}</label>
            <input
              className="border w-full rounded px-2 py-1"
              value={form[field]}
              onChange={e => setForm({ ...form, [field]: e.target.value })}
            />
          </div>
        ))}

        <div className="flex gap-2 justify-end mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Hủy
          </button>
          <button
            onClick={save}
            disabled={loading}
            className="px-3 py-1 bg-black text-white rounded"
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
