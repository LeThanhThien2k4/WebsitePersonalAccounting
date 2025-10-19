import React from "react";
import VoucherMockupTT88 from "../components/VoucherMockupTT88";

export default function StockOut() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">
        Phiếu Xuất Kho (04-VT)
      </h1>
      <VoucherMockupTT88 defaultTab="out" />
    </div>
  );
}
