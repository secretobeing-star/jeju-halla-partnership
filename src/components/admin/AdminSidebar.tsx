"use client";

import { useEffect, useState } from "react";
import {
  ADMIN_NAV_STORAGE_KEY,
  AdminNavGroupEntry,
  AdminNavKey,
  AdminNavLeafDef,
  AdminNavSubgroupDef,
  getAdminNavSubgroupKeys,
  getAllowedAdminNavGroups,
} from "@/lib/admin-navigation";
import { AdminUserAccess } from "@/lib/admin-permissions";

type AdminSidebarProps = {
  activeNav: AdminNavKey;
  adminAccess: AdminUserAccess;
  onSelect: (navKey: AdminNavKey) => void;
};

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`admin-sidebar__chevron ${open ? "admin-sidebar__chevron--open" : ""}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default function AdminSidebar({ activeNav, adminAccess, onSelect }: AdminSidebarProps) {
  const groups = getAllowedAdminNavGroups(adminAccess);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [expandedSubgroups, setExpandedSubgroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = { ...prev };
      for (const group of groups) {
        if (next[group.key] === undefined) {
          next[group.key] = true;
        }
        if (
          group.items.some((item) => {
            if (item.kind === "item") {
              return item.key === activeNav;
            }

            return (
              item.navKey === activeNav ||
              item.children.some((child) => child.key === activeNav)
            );
          })
        ) {
          next[group.key] = true;
        }
      }
      return next;
    });
  }, [groups, activeNav]);

  useEffect(() => {
    const activeSubgroups = getAdminNavSubgroupKeys(activeNav);
    if (activeSubgroups.length === 0) {
      return;
    }

    setExpandedSubgroups((prev) => {
      const next = { ...prev };
      for (const subgroupKey of activeSubgroups) {
        next[subgroupKey] = true;
      }
      return next;
    });
  }, [activeNav]);

  function handleSelect(navKey: AdminNavKey) {
    onSelect(navKey);
    try {
      localStorage.setItem(ADMIN_NAV_STORAGE_KEY, navKey);
    } catch {
      // ignore storage errors
    }
  }

  function toggleGroup(groupKey: string) {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  }

  function toggleSubgroup(subgroupKey: string) {
    setExpandedSubgroups((prev) => ({
      ...prev,
      [subgroupKey]: !prev[subgroupKey],
    }));
  }

  function renderLeafItem(item: AdminNavLeafDef, nested = false) {
    const isActive = activeNav === item.key;

    return (
      <li key={item.key}>
        <button
          type="button"
          className={[
            "admin-sidebar__item",
            nested ? "admin-sidebar__item--nested" : "",
            isActive ? "admin-sidebar__item--active" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          aria-current={isActive ? "page" : undefined}
          onClick={() => handleSelect(item.key)}
        >
          {item.label}
        </button>
      </li>
    );
  }

  function renderSubgroup(subgroup: AdminNavSubgroupDef) {
    const expanded = expandedSubgroups[subgroup.key] ?? true;
    const isParentActive = activeNav === subgroup.navKey;

    return (
      <li key={subgroup.key} className="admin-sidebar__subgroup">
        <div className="admin-sidebar__subgroup-header">
          <button
            type="button"
            className="admin-sidebar__subgroup-toggle"
            aria-expanded={expanded}
            aria-label={`${subgroup.label} 하위 메뉴 ${expanded ? "접기" : "펼치기"}`}
            onClick={() => toggleSubgroup(subgroup.key)}
          >
            <ChevronIcon open={expanded} />
          </button>
          <button
            type="button"
            className={[
              "admin-sidebar__item",
              "admin-sidebar__item--subgroup",
              isParentActive ? "admin-sidebar__item--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-current={isParentActive ? "page" : undefined}
            onClick={() => handleSelect(subgroup.navKey)}
          >
            {subgroup.label}
          </button>
        </div>

        {expanded && subgroup.children.length > 0 ? (
          <ul className="admin-sidebar__items admin-sidebar__items--nested">
            {subgroup.children.map((child) => renderLeafItem(child, true))}
          </ul>
        ) : null}
      </li>
    );
  }

  function renderGroupEntry(entry: AdminNavGroupEntry) {
    if (entry.kind === "subgroup") {
      return renderSubgroup(entry);
    }

    return renderLeafItem(entry);
  }

  return (
    <aside className="admin-sidebar shrink-0">
      <nav className="admin-sidebar__nav" aria-label="관리자 메뉴">
        {groups.map((group) => {
          const expanded = expandedGroups[group.key] ?? true;

          return (
            <div key={group.key} className="admin-sidebar__group">
              <button
                type="button"
                className="admin-sidebar__group-trigger"
                aria-expanded={expanded}
                onClick={() => toggleGroup(group.key)}
              >
                <span className="admin-sidebar__group-label">{group.label}</span>
                <ChevronIcon open={expanded} />
              </button>

              {expanded ? (
                <ul className="admin-sidebar__items">
                  {group.items.map((item) => renderGroupEntry(item))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

export function readStoredAdminNav(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return localStorage.getItem(ADMIN_NAV_STORAGE_KEY);
  } catch {
    return null;
  }
}
