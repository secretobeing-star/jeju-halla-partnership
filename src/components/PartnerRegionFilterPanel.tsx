"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PARTNER_REGION_FILTERS,
  PARTNER_REGION_ALL,
  countPartnersInRegionArea,
  countPartnersInRegionGroup,
  type PartnerRegionFilters,
  type PartnerRegionGroup,
  getPartnerRegionFilterLabel,
  getPartnerRegionFiltersSummary,
  isPartnerRegionFiltersActive,
  isPartnerRegionSelected,
  togglePartnerRegionSelection,
} from "@/lib/partner-regions";

type PartnerRegionFilterPanelProps = {
  groups: PartnerRegionGroup[];
  value: PartnerRegionFilters;
  onChange: (next: PartnerRegionFilters) => void;
  defaultExpanded?: boolean;
  partners?: Array<{ region?: string | null }>;
};

export default function PartnerRegionFilterPanel({
  groups,
  value,
  onChange,
  defaultExpanded = false,
  partners = [],
}: PartnerRegionFilterPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [activeCity, setActiveCity] = useState(PARTNER_REGION_ALL);

  useEffect(() => {
    setExpanded(defaultExpanded);
  }, [defaultExpanded]);

  useEffect(() => {
    if (activeCity === PARTNER_REGION_ALL && value.length > 0) {
      setActiveCity(value[0].city);
    }
  }, [activeCity, value]);

  const selectedCityGroup =
    activeCity === PARTNER_REGION_ALL
      ? null
      : groups.find((group) => group.label === activeCity) ?? null;

  function selectCity(city: string) {
    if (city === PARTNER_REGION_ALL) {
      setActiveCity(PARTNER_REGION_ALL);
      return;
    }

    setActiveCity(city);
  }

  function toggleArea(city: string, area: string) {
    onChange(togglePartnerRegionSelection(value, city, area));
  }

  function removeSelection(city: string, area: string) {
    onChange(value.filter((filter) => !(filter.city === city && filter.area === area)));
  }

  function clearFilters() {
    onChange(DEFAULT_PARTNER_REGION_FILTERS);
    setActiveCity(PARTNER_REGION_ALL);
  }

  const filterSummary = getPartnerRegionFiltersSummary(value, groups);
  const filterActive = isPartnerRegionFiltersActive(value);

  return (
    <div className="partner-region-filter-panel mt-5 rounded-xl border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-gray-800 sm:text-sm">지역별 상세 검색</p>
          </div>
          {!expanded && filterActive ? (
            <p className="mt-1 truncate text-xs text-sky-700">{filterSummary}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {filterActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 sm:text-sm"
            >
              초기화
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 sm:text-sm"
            aria-expanded={expanded}
          >
            {expanded ? "접기" : "펼치기"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="partner-region-filter-panel__body">
          <div>
            <div className="partner-region-filter-panel__chips">
              <RegionChip
                label={PARTNER_REGION_ALL}
                selected={activeCity === PARTNER_REGION_ALL && !filterActive}
                onClick={() => selectCity(PARTNER_REGION_ALL)}
              />
              {groups.map((group) => (
                <RegionChip
                  key={group.id}
                  label={group.label}
                  count={countPartnersInRegionGroup(partners, group.label)}
                  selected={activeCity === group.label}
                  onClick={() => selectCity(group.label)}
                />
              ))}
            </div>
          </div>

          {selectedCityGroup ? (
            <div>
              <p className="partner-region-filter-panel__hint text-[11px] text-gray-400">
                여러 지역을 선택할 수 있습니다.
              </p>
              <div className="partner-region-filter-panel__chips">
                <RegionChip
                  label={PARTNER_REGION_ALL}
                  count={countPartnersInRegionArea(partners, selectedCityGroup.label, PARTNER_REGION_ALL)}
                  selected={isPartnerRegionSelected(
                    value,
                    selectedCityGroup.label,
                    PARTNER_REGION_ALL,
                  )}
                  onClick={() => toggleArea(selectedCityGroup.label, PARTNER_REGION_ALL)}
                />
                {selectedCityGroup.areas.map((area) => (
                  <RegionChip
                    key={area}
                    label={area}
                    count={countPartnersInRegionArea(partners, selectedCityGroup.label, area)}
                    selected={isPartnerRegionSelected(value, selectedCityGroup.label, area)}
                    onClick={() => toggleArea(selectedCityGroup.label, area)}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {filterActive ? (
            <div className="partner-region-filter-panel__selected">
              <div className="partner-region-filter-panel__selected-tags">
                {value.map((selection) => (
                  <span
                    key={`${selection.city}-${selection.area}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1.5 text-xs font-medium text-sky-800"
                  >
                    {getPartnerRegionFilterLabel(selection, groups)}
                    <button
                      type="button"
                      onClick={() => removeSelection(selection.city, selection.area)}
                      className="rounded-full px-1 text-sky-600 hover:bg-sky-200"
                      aria-label={`${getPartnerRegionFilterLabel(selection, groups)} 선택 해제`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={clearFilters}
                className="self-start rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 sm:text-sm"
              >
                선택 초기화
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RegionChip({
  label,
  count,
  selected,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`partner-region-filter-panel__chip ${
        selected
          ? "partner-region-filter-panel__chip--selected"
          : "partner-region-filter-panel__chip--default"
      }`}
    >
      {label}
      {typeof count === "number" ? ` (${count})` : ""}
    </button>
  );
}
