"use client";

import { useState } from "react";
import * as XLSX from "xlsx";

type SpreadsheetRow = Record<string, unknown>;

export default function ExcelToOdoo() {
  const [allData, setAllData] = useState<SpreadsheetRow[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil(allData.length / ITEMS_PER_PAGE);
  const currentItems = allData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const readExcel = (file: File): Promise<SpreadsheetRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const jsonData = XLSX.utils.sheet_to_json<SpreadsheetRow>(
            workbook.Sheets[sheetName]
          );
          resolve(jsonData);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const selectedFile = e.target.files[0];

    try {
      const data = await readExcel(selectedFile);
      setAllData(data);
      setCurrentPage(1);
      setMessage(`Нийт ${data.length} мөр уншсан.`);
    } catch {
      setMessage("Excel уншихад алдаа гарлаа.");
    }
  };

  const handleUpload = async () => {
    if (allData.length === 0) return;

    setLoading(true);
    const batchSize = 50;
    let successCount = 0;

    try {
      for (let i = 0; i < allData.length; i += batchSize) {
        const batch = allData.slice(i, i + batchSize);
        const res = await fetch("/api/import-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(batch),
        });

        if (!res.ok) {
          throw new Error("Серверийн алдаа");
        }

        successCount += batch.length;
        setMessage(`Илгээж байна: ${successCount} / ${allData.length}`);
      }

      setMessage(`Амжилттай: ${successCount} мөр хадгалагдлаа.`);
      setAllData([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown upload error";
      setMessage(`Алдаа: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 rounded-2xl bg-white p-6 shadow-xl">
      <h2 className="text-2xl font-bold text-purple-800">
        Excel to Odoo Import
      </h2>

      <input
        type="file"
        accept=".xlsx"
        onChange={handleFileChange}
        className="w-full border p-2"
      />

      {message && (
        <div className="rounded bg-blue-50 p-3 text-blue-800">{message}</div>
      )}

      {allData.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  {Object.keys(allData[0]).map((key) => (
                    <th key={key} className="border p-2 text-left">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((row, i) => (
                  <tr key={i} className="border-b">
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="p-2">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Өмнөх
            </button>
            <span>
              Хуудас {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Дараах
            </button>
          </div>

          <button
            onClick={handleUpload}
            disabled={loading}
            className="w-full rounded bg-purple-600 py-3 text-white"
          >
            {loading ? "Түр хүлээнэ үү..." : "Бүгдийг сервер рүү илгээнэ"}
          </button>
        </>
      )}
    </div>
  );
}
