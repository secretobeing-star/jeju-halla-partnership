import { AdminPermissionFlags } from "@/lib/admin-permissions";

type PermissionCheckboxGridProps = {
  permissions: AdminPermissionFlags;
  disabled?: boolean;
  onChange: (permissions: AdminPermissionFlags) => void;
  items: readonly {
    key: string;
    permission: keyof AdminPermissionFlags;
    label: string;
  }[];
};

export function PermissionCheckboxGrid({
  permissions,
  disabled = false,
  onChange,
  items,
}: PermissionCheckboxGridProps) {
  function setAll(checked: boolean) {
    const next = { ...permissions };
    for (const item of items) {
      next[item.permission] = checked;
    }
    onChange(next);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAll(true)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        >
          전체 선택
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setAll(false)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
        >
          전체 해제
        </button>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label
            key={item.key}
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-white bg-white px-3 py-2 text-sm text-gray-700"
          >
            <input
              type="checkbox"
              checked={permissions[item.permission]}
              disabled={disabled}
              onChange={(e) =>
                onChange({
                  ...permissions,
                  [item.permission]: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}
