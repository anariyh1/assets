import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import {
  GetAssetsDocument,
  CategoriesDocument,
  EmployeesDocument,
  GetLocationsDocument,
} from "@/gql/graphql";
import type { Asset } from "@/lib/types";

const LOCAL_ASSETS_KEY = "assethub-local-assets";

export function useAssetsData(statusFilter: string) {
  const [localAssets, setLocalAssets] = useState<Asset[]>([]);
  const { data, loading, refetch } = useQuery(GetAssetsDocument, {
    variables: {
      office: undefined,
      categoryIds: undefined,
      subCategoryIds: undefined,
      locationIds: undefined,
    },
  });
  const { data: categoriesData } = useQuery(CategoriesDocument);
  const { data: employeesData } = useQuery(EmployeesDocument);
  const { data: locationsData } = useQuery(GetLocationsDocument);

  useEffect(() => {
    const readLocalAssets = () => {
      try {
        setLocalAssets(
          JSON.parse(window.localStorage.getItem(LOCAL_ASSETS_KEY) || "[]"),
        );
      } catch {
        setLocalAssets([]);
      }
    };

    readLocalAssets();
    window.addEventListener("storage", readLocalAssets);
    return () => window.removeEventListener("storage", readLocalAssets);
  }, []);

  const removeLocalAssetIds = useCallback((ids: Iterable<string>) => {
    if (typeof window === "undefined") return new Set<string>();

    const targetIds = new Set(ids);
    if (targetIds.size === 0) return new Set<string>();

    try {
      const existing = JSON.parse(
        window.localStorage.getItem(LOCAL_ASSETS_KEY) || "[]",
      ) as Asset[];
      const removedIds = new Set(
        existing
          .filter((asset) => targetIds.has(asset.id))
          .map((asset) => asset.id),
      );

      if (removedIds.size === 0) return removedIds;

      const nextAssets = existing.filter((asset) => !removedIds.has(asset.id));
      window.localStorage.setItem(LOCAL_ASSETS_KEY, JSON.stringify(nextAssets));
      setLocalAssets(nextAssets);
      window.dispatchEvent(new Event("storage"));
      return removedIds;
    } catch {
      return new Set<string>();
    }
  }, []);

  const employeeNameById = useMemo(() => {
    const map = new Map<string, string>();
    const employees = (employeesData?.employees ?? []) as Array<{
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    }>;
    employees.forEach((e) => {
      const name =
        [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.id;
      map.set(e.id, name);
    });
    return map;
  }, [employeesData?.employees]);

  const employeeStatusById = useMemo(() => {
    const map = new Map<string, string>();
    const employees = (employeesData?.employees ?? []) as Array<{
      id: string;
      status?: string | null;
    }>;
    employees.forEach((employee) => {
      map.set(employee.id, employee.status ?? "");
    });
    return map;
  }, [employeesData?.employees]);

  const mainCategoryBySubName = useMemo(() => {
    const map = new Map<string, string>();
    (categoriesData?.categories ?? []).forEach((main) => {
      main.subcategories?.forEach((sub) => map.set(sub.name, main.name));
    });
    return map;
  }, [categoriesData?.categories]);

  const locationPathById = useMemo(() => {
    const map = new Map<string, string>();
    const locations = (locationsData?.locations ?? []) as Array<{
      id: string;
      name: string;
      parentId?: string | null;
    }>;
    const byId = new Map(locations.map((l) => [l.id, l]));

    const buildPath = (id: string): string => {
      const cached = map.get(id);
      if (cached) return cached;
      const node = byId.get(id);
      if (!node) return id;
      const parent = node.parentId ? buildPath(node.parentId) : "";
      const path = parent ? `${parent} / ${node.name}` : node.name;
      map.set(id, path);
      return path;
    };

    locations.forEach((l) => buildPath(l.id));
    return map;
  }, [locationsData?.locations]);

  const assets: Asset[] = useMemo(() => {
    const remoteAssets = data?.assets ?? [];
    const mapped = (
      remoteAssets as Array<{
        id: string;
        assetTag: string;
        category: string;
        locationId?: string | null;
        locationPath?: string | null;
        serialNumber: string;
        purchaseCost?: number | null;
        purchaseDate?: number | null;
        currentBookValue?: number | null;
        status: string;
        assignedTo?: string | null;
        imageUrl?: string | null;
        notes?: string | null;
        createdAt: number;
        updatedAt: number;
      }>
    ).map((a) => {
      // Treat currentBookValue=0 as "unset".
      // FOR_SALE: value should follow sale price (currentBookValue) with fallback to purchaseCost.
      // Otherwise: value follows currentBookValue with fallback to purchaseCost.
      const hasBookValue =
        a.currentBookValue != null && Number(a.currentBookValue) > 0;
      const resolvedValue =
        String(a.status) === "FOR_SALE"
          ? hasBookValue
            ? a.currentBookValue!
            : a.purchaseCost ?? 0
          : hasBookValue
            ? a.currentBookValue!
            : a.purchaseCost ?? 0;
      const categoryName = typeof a.category === "string" ? a.category : "";
      const rawLocationPath = (a.locationPath ?? "").trim();
      const normalizedStatus =
        a.status === "AVAILABLE" && (a.currentBookValue ?? 0) > 0
          ? "FOR_SALE"
          : a.status;
      const friendlyLocation =
        rawLocationPath && !/^[0-9a-f-]{20,}$/i.test(rawLocationPath)
          ? rawLocationPath
          : a.locationId
            ? (locationPathById.get(a.locationId) ?? undefined)
            : undefined;

      return {
        id: a.id,
        assetId: a.assetTag,
        category: categoryName as Asset["category"],
        mainCategory: mainCategoryBySubName.get(categoryName),
        location: friendlyLocation,
        serialNumber: a.serialNumber,
        purchaseCost: a.purchaseCost ?? 0,
        residualValue: 0,
        usefulLife: 0,
        purchaseDate: a.purchaseDate
          ? new Date(a.purchaseDate).toISOString()
          : new Date().toISOString(),
        currentBookValue: resolvedValue,
        status: a.status as Asset["status"],
        assignedEmployeeId: a.assignedTo ?? undefined,
        assignedEmployeeName: a.assignedTo
          ? employeeNameById.get(a.assignedTo)
          : undefined,
        imageUrl: a.imageUrl ?? undefined,
        notes: a.notes ?? undefined,
        createdAt: new Date(a.createdAt).toISOString(),
        updatedAt: new Date(a.updatedAt).toISOString(),
      };
    });

    const byId = new Map<string, Asset>(
      mapped.map((asset) => [asset.id, asset as Asset]),
    );
    localAssets.forEach((asset) => byId.set(asset.id, asset));

    // Sort by most recently updated asset first (not just createdAt).
    return Array.from(byId.values()).sort((a, b) => {
      const aUpdated = new Date(a.updatedAt).getTime();
      const bUpdated = new Date(b.updatedAt).getTime();
      // Fallback to createdAt if updatedAt is missing/unparseable.
      const aSort = Number.isFinite(aUpdated) ? aUpdated : new Date(a.createdAt).getTime();
      const bSort = Number.isFinite(bUpdated) ? bUpdated : new Date(b.createdAt).getTime();
      if (bSort !== aSort) return bSort - aSort;
      // Stable-ish tie-breaker: newer createdAt first.
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    data?.assets,
    mainCategoryBySubName,
    employeeNameById,
    locationPathById,
    localAssets,
  ]);

  const visibleAssets = useMemo(() => {
    if (!statusFilter || statusFilter === "all") return assets;
    const target = statusFilter.toUpperCase();
    return assets.filter((a) => {
      const s = (a.status ?? "").toUpperCase().replace(/-/g, "_");
      return s === target;
    });
  }, [assets, statusFilter]);

  return {
    assets,
    visibleAssets,
    loading,
    refetch,
    removeLocalAssetIds,
    employeeNameById,
    employeeStatusById,
  };
}
