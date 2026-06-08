"use client";

import { useState } from "react";

interface SliderSchema {
  field: string;
  min: number;
  max: number;
  per_role?: boolean;
  type?: never;
}

interface MultiselectSchema {
  field: string;
  type: "multiselect";
  options: string[];
}

interface TfListSchema {
  field: string;
  type: "tf_list";
  count: number;
}

type PredictionSchema = SliderSchema | MultiselectSchema | TfListSchema;

interface PredictionWidgetProps {
  schema: PredictionSchema;
  onSubmit: (value: unknown) => void;
  locked?: boolean;
}

function SliderMode({
  schema,
  onSubmit,
  locked,
}: {
  schema: SliderSchema;
  onSubmit: (v: number) => void;
  locked?: boolean;
}) {
  const mid = Math.round((schema.min + schema.max) / 2);
  const [value, setValue] = useState(mid);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <span className="text-[#4A4A4A] w-8 text-right">{schema.min}</span>
        <input
          type="range"
          min={schema.min}
          max={schema.max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={locked}
          className="flex-1 accent-[#2D5A3D]"
          aria-label="Prediction"
          aria-valuemin={schema.min}
          aria-valuemax={schema.max}
          aria-valuenow={value}
        />
        <span className="text-[#4A4A4A] w-8">{schema.max}</span>
      </div>
      <div className="text-center text-2xl font-bold text-black">{value}</div>
      {!locked && (
        <button
          onClick={() => onSubmit(value)}
          className="px-6 py-3 min-h-[44px] bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] self-center"
        >
          Verrouiller le pari
        </button>
      )}
    </div>
  );
}

function MultiselectMode({
  schema,
  onSubmit,
  locked,
}: {
  schema: MultiselectSchema;
  onSubmit: (v: string[]) => void;
  locked?: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(option: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {schema.options.map((opt) => (
          <button
            key={opt}
            onClick={() => !locked && toggle(opt)}
            disabled={locked}
            className={`px-4 py-2 min-h-[44px] min-w-[80px] border-2 font-semibold ${
              selected.has(opt)
                ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                : "bg-white border-black text-black"
            } disabled:opacity-70`}
          >
            {opt.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {!locked && (
        <button
          onClick={() => onSubmit([...selected])}
          disabled={selected.size === 0}
          className="px-6 py-3 min-h-[44px] bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] self-center disabled:opacity-50"
        >
          Verrouiller le pari
        </button>
      )}
    </div>
  );
}

function TfListMode({
  schema,
  onSubmit,
  locked,
}: {
  schema: TfListSchema;
  onSubmit: (v: string[]) => void;
  locked?: boolean;
}) {
  const [answers, setAnswers] = useState<string[]>(
    Array(schema.count).fill("")
  );

  function setAnswer(index: number, value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const allAnswered = answers.every((a) => a !== "");

  return (
    <div className="flex flex-col gap-3">
      {answers.map((ans, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-[#4A4A4A] w-6 text-right font-bold">
            {i + 1}.
          </span>
          {["vrai", "faux", "nuancé"].map((opt) => (
            <button
              key={opt}
              onClick={() => !locked && setAnswer(i, opt)}
              disabled={locked}
              aria-label={`Question ${i + 1}: ${opt}`}
              aria-pressed={ans === opt}
              className={`px-3 py-2 min-h-[44px] min-w-[44px] border-2 text-sm font-semibold ${
                ans === opt
                  ? "bg-[#2D5A3D] border-[#2D5A3D] text-white"
                  : "bg-white border-[#B8B8B8] text-[#4A4A4A]"
              } disabled:opacity-70`}
            >
              {opt}
            </button>
          ))}
        </div>
      ))}
      {!locked && (
        <button
          onClick={() => onSubmit(answers)}
          disabled={!allAnswered}
          className="px-6 py-3 min-h-[44px] bg-[#2D5A3D] text-white font-semibold border-2 border-[#2D5A3D] self-center disabled:opacity-50"
        >
          Verrouiller le pari
        </button>
      )}
    </div>
  );
}

export default function PredictionWidget({
  schema,
  onSubmit,
  locked,
}: PredictionWidgetProps) {
  if ("type" in schema && schema.type === "multiselect") {
    return (
      <div className="border-2 border-black p-6 bg-white">
        <h3 className="font-bold text-black mb-4">Votre pari</h3>
        <MultiselectMode
          schema={schema}
          onSubmit={onSubmit as (v: string[]) => void}
          locked={locked}
        />
      </div>
    );
  }

  if ("type" in schema && schema.type === "tf_list") {
    return (
      <div className="border-2 border-black p-6 bg-white">
        <h3 className="font-bold text-black mb-4">Votre pari</h3>
        <TfListMode
          schema={schema}
          onSubmit={onSubmit as (v: string[]) => void}
          locked={locked}
        />
      </div>
    );
  }

  return (
    <div className="border-2 border-black p-6 bg-white">
      <h3 className="font-bold text-black mb-4">Votre pari</h3>
      <SliderMode
        schema={schema as SliderSchema}
        onSubmit={onSubmit as (v: number) => void}
        locked={locked}
      />
    </div>
  );
}
