"use client";

import {
  DEFAULT_PARTNER_TEXT_STYLE,
  getPartnerTextStyle,
  PartnerTextStyleValue,
} from "@/lib/partner-text-style";

type PartnerTextStyleFieldsProps = {
  value: PartnerTextStyleValue;
  onChange: (patch: Partial<PartnerTextStyleValue>) => void;
};

export default function PartnerTextStyleFields({
  value,
  onChange,
}: PartnerTextStyleFieldsProps) {
  const colorValue = value.color || DEFAULT_PARTNER_TEXT_STYLE.color;

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium text-gray-700">
        글씨색
        <div className="mt-1 flex items-center gap-2">
          <input
            type="color"
            value={colorValue}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-10 w-14 cursor-pointer rounded-lg border border-gray-300 bg-white p-1"
          />
          <input
            type="text"
            value={value.color}
            onChange={(e) => onChange({ color: e.target.value })}
            placeholder={DEFAULT_PARTNER_TEXT_STYLE.color}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </label>

      <div className="flex flex-col justify-end gap-2 text-sm text-gray-700">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.bold}
            onChange={(e) => onChange({ bold: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          굵기
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.italic}
            onChange={(e) => onChange({ italic: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          기울기
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.underline}
            onChange={(e) => onChange({ underline: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          밑줄
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.strikethrough}
            onChange={(e) => onChange({ strikethrough: e.target.checked })}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600"
          />
          가운데 밑줄
        </label>
      </div>
    </div>
  );
}

export function PartnerTextStylePreview({
  text,
  value,
}: {
  text: string;
  value: PartnerTextStyleValue;
}) {
  if (!text.trim()) {
    return null;
  }

  return (
    <p className="mt-3 text-xs text-gray-500">
      미리보기:{" "}
      <span className="whitespace-pre-line" style={getPartnerTextStyle(value)}>
        {text}
      </span>
    </p>
  );
}
