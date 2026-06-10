"use client";

import type { GeneralVerdict } from "@/lib/ai/general-prompts";

/** Shared verdict card for the generalist challenges (total /20 + breakdown). */
export default function Verdict({ verdict }: { verdict: GeneralVerdict }) {
  return (
    <div>
      <div className="border-2 border-[#2D5A3D] p-6 bg-[#F5F5F5] text-center mb-5">
        <p className="text-5xl font-bold text-[#2D5A3D]">{verdict.total}/20</p>
      </div>

      {verdict.details?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {verdict.details.map((d, i) => (
            <div key={i} className="border-2 border-black p-4 text-center">
              <div className="text-sm text-[#4A4A4A]">{d.label}</div>
              <div
                className={`text-2xl font-bold ${
                  d.score < 0 ? "text-[#8B3A3A]" : "text-black"
                }`}
              >
                {d.score}/{d.max}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {verdict.point_fort && (
          <div className="border-l-4 border-[#2D5A3D] pl-4">
            <span className="font-bold text-[#2D5A3D]">Point fort : </span>
            <span className="text-black">{verdict.point_fort}</span>
          </div>
        )}
        {verdict.a_ameliorer && (
          <div className="border-l-4 border-[#B5651D] pl-4">
            <span className="font-bold text-[#B5651D]">À améliorer : </span>
            <span className="text-black">{verdict.a_ameliorer}</span>
          </div>
        )}
        {verdict.conseil && (
          <div className="border-l-4 border-[#4A4A4A] pl-4">
            <span className="font-bold text-[#4A4A4A]">Conseil : </span>
            <span className="text-black">{verdict.conseil}</span>
          </div>
        )}
      </div>
    </div>
  );
}
