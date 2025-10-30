import { useEffect, useState } from "react";
import api from "../api/axios";
import toast from "react-hot-toast";
import EmployeeForm from "../components/EmployeeForm.jsx";
import React from "react";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const { data } = await api.get("/employees");
    setEmployees(data);
  };

  const remove = async (id) => {
    if (!window.confirm("Xóa nhân viên này?")) return;
    await api.delete(`/employees/${id}`);
    toast.success("Đã xóa");
    await load();
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Quản lý nhân viên</h1>
        <button
          onClick={() => setSelected({})}
          className="px-3 py-2 bg-black text-white rounded"
        >
          + Thêm nhân viên
        </button>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full border-collapse">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="border px-3 py-1">Mã NV</th>
              <th className="border px-3 py-1">Họ tên</th>
              <th className="border px-3 py-1">Chức vụ</th>
              <th className="border px-3 py-1">Lương cơ bản</th>
              <th className="border px-3 py-1">Trạng thái</th>
              <th className="border px-3 py-1 w-40">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.id} className="text-sm">
                <td className="border px-3 py-1">{e.code}</td>
                <td className="border px-3 py-1">{e.fullName}</td>
                <td className="border px-3 py-1">{e.position}</td>
                <td className="border px-3 py-1 text-right">
                  {Number(e.baseSalary).toLocaleString()}₫
                </td>
                <td className="border px-3 py-1">
                  {e.isActive ? "Đang làm" : "Nghỉ"}
                </td>
                <td className="border px-3 py-1 text-center">
                  <button
                    onClick={() => setSelected(e)}
                    className="text-blue-600 hover:underline mr-2"
                  >
                    Sửa
                  </button>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-red-600 hover:underline"
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <EmployeeForm
          data={selected}
          onClose={() => setSelected(null)}
          onSaved={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
