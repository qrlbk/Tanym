"use client";

import { Mail, Users, FileSpreadsheet } from "lucide-react";

export default function MailingsTab() {
  return (
    <div className="flex items-center h-[74px] px-2 gap-2">
      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Конверты (В разработке)"
      >
        <Mail size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Конверты</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Наклейки (В разработке)"
      >
        <FileSpreadsheet size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Наклейки</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <button
        className="flex flex-col items-center gap-0.5 px-3 py-1 rounded hover:bg-gray-100 opacity-50"
        title="Получатели (В разработке)"
      >
        <Users size={20} className="text-gray-600" />
        <span className="text-[9px] text-gray-600">Получатели</span>
      </button>

      <div className="w-px h-12 bg-gray-200" />

      <div className="px-3 py-1 text-center">
        <p className="text-[10px] text-gray-400 italic">Рассылки в разработке</p>
      </div>
    </div>
  );
}
