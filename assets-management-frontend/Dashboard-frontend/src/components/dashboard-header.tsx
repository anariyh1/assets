"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  BellDot,
  CheckCheck,
  Dot,
  ExternalLink,
  MapPin,
  Moon,
  Package,
  Search,
  Sun,
  UserIcon,
} from "lucide-react";
import { useMutation, useQuery } from "@apollo/client";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AssetFieldsFragmentDoc,
  EmployeesDocument,
  GetAssetsDocument,
  GetDashboardDocument,
  MarkNotificationAsReadDocument,
  NotificationFieldsFragmentDoc,
  UserRole,
} from "@/gql/graphql";
import { useFragment } from "@/gql";

const EMPLOYEE_RESULT_LIMIT = 6;
const ASSET_RESULT_PREVIEW_LIMIT = 6;

const MONGOLIAN_CYRILLIC_TO_LATIN: Record<string, string> = {
  а: "a",
  б: "b",
  в: "w",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "j",
  з: "z",
  и: "i",
  й: "i",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  ө: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ү: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};

function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((char) => MONGOLIAN_CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatNotificationTime(createdAt: number) {
  const date = new Date(createdAt);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "саяхан";
  if (diff < hour) return `${Math.floor(diff / minute)} мин өмнө`;
  if (diff < day) return `${Math.floor(diff / hour)} цаг өмнө`;

  return date.toLocaleDateString("mn-MN", {
    month: "short",
    day: "numeric",
  });
}

function getDashboardRole(role?: string | null): UserRole {
  const normalized = (role ?? "").toUpperCase();
  if (normalized === UserRole.Employee) return UserRole.Employee;
  if (normalized === UserRole.Finance) return UserRole.Finance;
  if (normalized === UserRole.ItAdmin) return UserRole.ItAdmin;
  return UserRole.SuperAdmin;
}

function getNotificationTone(type: string) {
  const normalized = type.toUpperCase();
  if (normalized === "URGENT") {
    return {
      dot: "bg-red-500",
      badge: "border-red-200 bg-red-50 text-red-700",
      label: "Яаралтай",
    };
  }
  if (normalized === "WARNING") {
    return {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      label: "Анхаарах",
    };
  }
  return {
    dot: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    label: "Мэдээлэл",
  };
}

function normalizeSearchChunk(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .split("")
    .map((char) => MONGOLIAN_CYRILLIC_TO_LATIN[char] ?? char)
    .join("")
    .replace(/[^a-z0-9\s]/g, " ");
}

function getHighlightRanges(value: string, query: string) {
  const terms = normalizeSearchText(query).split(/\s+/).filter(Boolean);

  if (terms.length === 0) return [];

  let normalizedValue = "";
  const normalizedIndexMap: number[] = [];

  for (const [index, char] of Array.from(value).entries()) {
    const normalizedChunk = normalizeSearchChunk(char);

    for (const normalizedChar of normalizedChunk) {
      normalizedValue += normalizedChar;
      normalizedIndexMap.push(index);
    }
  }

  const ranges = terms.flatMap((term) => {
    const matches: Array<[number, number]> = [];
    let searchStart = 0;

    while (searchStart < normalizedValue.length) {
      const matchIndex = normalizedValue.indexOf(term, searchStart);

      if (matchIndex === -1) break;

      const matchEnd = matchIndex + term.length - 1;
      const originalStart = normalizedIndexMap[matchIndex];
      const originalEnd = normalizedIndexMap[matchEnd];

      if (originalStart !== undefined && originalEnd !== undefined) {
        matches.push([originalStart, originalEnd + 1]);
      }

      searchStart = matchIndex + term.length;
    }

    return matches;
  });

  if (ranges.length === 0) return [];

  const mergedRanges = ranges.sort((left, right) => left[0] - right[0]);

  return mergedRanges.reduce<Array<[number, number]>>((accumulator, range) => {
    const previousRange = accumulator[accumulator.length - 1];

    if (!previousRange || range[0] > previousRange[1]) {
      accumulator.push([...range] as [number, number]);
      return accumulator;
    }

    previousRange[1] = Math.max(previousRange[1], range[1]);
    return accumulator;
  }, []);
}

function renderHighlightedText(
  value: string | null | undefined,
  query: string,
  variant: "default" | "asset" = "default",
) {
  if (!value) return null;

  const ranges = getHighlightRanges(value, query);

  if (ranges.length === 0) return value;

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  ranges.forEach(([start, end], index) => {
    if (cursor < start) {
      parts.push(
        <span key={`text-${index}-${cursor}`}>
          {value.slice(cursor, start)}
        </span>,
      );
    }

    parts.push(
      <span
        key={`highlight-${index}-${start}`}
        className={
          variant === "asset"
            ? "font-extrabold text-black underline decoration-2 underline-offset-2 decoration-slate-400"
            : "font-semibold text-slate-950"
        }
      >
        {value.slice(start, end)}
      </span>,
    );
    cursor = end;
  });

  if (cursor < value.length) {
    parts.push(<span key={`text-tail-${cursor}`}>{value.slice(cursor)}</span>);
  }

  return parts;
}

export function DashboardHeader({ sidebarOpen }: { sidebarOpen: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [showAllAssetResults, setShowAllAssetResults] = useState(false);
  const [themeMounted, setThemeMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { data: assetsData } = useQuery(GetAssetsDocument);
  const { data: employeesData } = useQuery(EmployeesDocument);
  const [markNotificationAsRead] = useMutation(MarkNotificationAsReadDocument);

  const assets = useMemo(() => {
    return (assetsData?.assets ?? [])
      .map((asset) => useFragment(AssetFieldsFragmentDoc, asset))
      .filter(Boolean);
  }, [assetsData]);

  const employees = employeesData?.employees ?? [];
  const currentEmployee = useMemo(() => {
    const email = session?.user?.email?.toLowerCase();
    if (!email) return null;
    return (
      employees.find((employee) => employee.email?.toLowerCase() === email) ??
      null
    );
  }, [employees, session?.user?.email]);
  const dashboardRole = getDashboardRole(currentEmployee?.role);
  const dashboardEmployeeId = currentEmployee?.id;
  const {
    data: dashboardData,
    loading: notificationsLoading,
    refetch: refetchDashboard,
  } = useQuery(GetDashboardDocument, {
    variables: {
      role: dashboardRole,
      employeeId: dashboardEmployeeId,
    },
    skip: dashboardRole === UserRole.Employee && !dashboardEmployeeId,
    pollInterval: 30000,
  });

  const notifications = useMemo(() => {
    const rawNotifications = [
      ...(dashboardData?.dashboard.itView?.notifications ?? []),
      ...(dashboardData?.dashboard.financeView?.notifications ?? []),
      ...(dashboardData?.dashboard.employeeView?.notifications ?? []),
    ]
      .map((notification) =>
        useFragment(NotificationFieldsFragmentDoc, notification),
      )
      .filter(Boolean);
    const byId = new Map(rawNotifications.map((item) => [item.id, item]));
    return Array.from(byId.values()).sort(
      (left, right) => right.createdAt - left.createdAt,
    );
  }, [dashboardData]);
  const unreadCount = notifications.filter(
    (notification) => notification.isRead === 0,
  ).length;
  const isDarkTheme = resolvedTheme === "dark";

  const trimmedQuery = query.trim().toLowerCase();
  const normalizedQuery = normalizeSearchText(trimmedQuery);

  const matchedAssets = useMemo(() => {
    if (!trimmedQuery) return [];
    return assets.filter((asset) => {
      const rawHaystack = [
        asset.id,
        asset.assetTag,
        asset.serialNumber,
        asset.category,
        asset.locationId,
        asset.locationPath,
        asset.status,
        asset.assignedTo,
        asset.notes,
      ]
        .filter(Boolean)
        .join(" ");
      const normalizedHaystack = normalizeSearchText(rawHaystack);
      return (
        rawHaystack.toLowerCase().includes(trimmedQuery) ||
        normalizedHaystack.includes(normalizedQuery)
      );
    });
  }, [assets, normalizedQuery, trimmedQuery]);

  const matchedEmployees = useMemo(() => {
    if (!trimmedQuery) return [];
    return employees
      .filter((employee) => {
        const rawHaystack = [
          employee.firstName,
          employee.lastName,
          employee.email,
          employee.department,
          employee.branch,
        ]
          .filter(Boolean)
          .join(" ");
        const normalizedHaystack = normalizeSearchText(rawHaystack);
        return (
          rawHaystack.toLowerCase().includes(trimmedQuery) ||
          normalizedHaystack.includes(normalizedQuery)
        );
      })
      .slice(0, EMPLOYEE_RESULT_LIMIT);
  }, [employees, normalizedQuery, trimmedQuery]);

  const visibleMatchedAssets = useMemo(() => {
    if (showAllAssetResults) return matchedAssets;
    return matchedAssets.slice(0, ASSET_RESULT_PREVIEW_LIMIT);
  }, [matchedAssets, showAllAssetResults]);

  useEffect(() => {
    setThemeMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: {
    id: string;
    link?: string | null;
    isRead: number;
  }) => {
    if (notification.isRead === 0) {
      await markNotificationAsRead({
        variables: { id: notification.id },
      });
      await refetchDashboard();
    }

    if (notification.link) {
      setNotificationsOpen(false);
      router.push(notification.link);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => notification.isRead === 0,
    );

    await Promise.all(
      unreadNotifications.map((notification) =>
        markNotificationAsRead({ variables: { id: notification.id } }),
      ),
    );
    await refetchDashboard();
  };

  const dividerWidth = sidebarOpen ? "0.5px" : "1px";
  const dividerLeft = sidebarOpen ? "calc(240px - 0.5px)" : "calc(72px - 1px)";

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 pr-7 items-center justify-between border-b border-white/55 bg-white/35 text-foreground backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
      <span
        className="absolute top-0 hidden h-14 bg-sidebar-border/90 transition-[left,width] duration-300 ease-out md:block"
        style={{ left: dividerLeft, width: dividerWidth }}
      />

      <div className="flex min-w-0 items-center">
        <div
          className="hidden shrink-0 items-center transition-[width] duration-300 ease-out md:flex"
          style={{
            width: sidebarOpen ? "240px" : "72px",
          }}
        >
          <div className="flex h-14 items-center gap-3 px-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Package className="h-4 w-4 text-foreground" />
            </div>
            <span
              className="overflow-hidden whitespace-nowrap text-sm font-semibold tracking-[0.02em] text-foreground transition-all duration-300 ease-out"
              style={{
                maxWidth: sidebarOpen ? "120px" : "0px",
                opacity: sidebarOpen ? 1 : 0,
              }}
            >
              AssetHub
            </span>
          </div>
        </div>

        <div className="hidden min-w-0 px-5 md:block">
          <div
            className="relative transition-all duration-300 ease-out"
            ref={containerRef}
            style={{
              width: sidebarOpen ? "min(58vw, 660px)" : "min(74vw, 760px)",
            }}
          >
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Хөрөнгө, ажилтан хайх.."
              className="h-11 w-full rounded-xl border-input bg-background pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setShowAllAssetResults(false);
                if (!isOpen) setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsOpen(false);
                }
              }}
            />

            {isOpen && trimmedQuery.length > 0 && (
              <div
                className="absolute left-0 top-full z-50 mt-3 max-h-140 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/95 p-3 shadow-[0_20px_48px_rgba(15,23,42,0.16)] backdrop-blur transition-all duration-300 ease-out"
                style={{
                  width: sidebarOpen ? "min(74vw, 820px)" : "min(86vw, 920px)",
                }}
              >
                <span className="absolute -top-1.75 left-12 h-3.5 w-3.5 rotate-45 border-l border-t border-slate-200 bg-white" />
                {matchedAssets.length === 0 && matchedEmployees.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
                    Тохирох үр дүн олдсонгүй.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 to-white px-3 py-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Хайлтын үр дүн
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="max-w-55 truncate rounded-md bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
                          “{query.trim()}”
                        </span>
                        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-[11px] font-semibold text-white">
                          {matchedAssets.length + matchedEmployees.length}
                        </span>
                      </div>
                    </div>

                    {matchedAssets.length > 0 && (
                      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                        <div className="flex items-center justify-between px-1">
                          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            <Package className="h-3.5 w-3.5" />
                            Хөрөнгө ({matchedAssets.length})
                          </p>
                          {matchedAssets.length >
                            ASSET_RESULT_PREVIEW_LIMIT && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-md px-2 text-xs text-slate-600 hover:bg-slate-200/70"
                              onClick={() =>
                                setShowAllAssetResults((prev) => !prev)
                              }
                            >
                              {showAllAssetResults ? "Буцаах" : "Бүгдийг харах"}
                            </Button>
                          )}
                        </div>
                        <div className="mt-2 grid gap-2">
                          {visibleMatchedAssets.map((asset) => (
                            <div
                              key={asset.id}
                              className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                            >
                              <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                                <img
                                  src={
                                    asset.imageUrl ||
                                    "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='48' viewBox='0 0 64 48'><rect width='64' height='48' fill='%23e2e8f0'/><path d='M14 32h36v4H14zM18 14h28v14H18z' fill='%2394a3b8'/></svg>"
                                  }
                                  alt={asset.assetTag || "Asset"}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="truncate text-[15px] font-semibold text-slate-900">
                                    {renderHighlightedText(
                                      asset.assetTag,
                                      query,
                                      "asset",
                                    )}
                                  </p>
                                  {asset.category && (
                                    <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                      {renderHighlightedText(
                                        asset.category,
                                        query,
                                        "asset",
                                      )}
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-slate-500">
                                  {renderHighlightedText(
                                    asset.serialNumber || "Serial байхгүй",
                                    query,
                                    "asset",
                                  )}
                                </p>
                                <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                                  <MapPin className="h-3.5 w-3.5" />
                                  <span className="truncate">
                                    {renderHighlightedText(
                                      asset.locationPath || asset.status,
                                      query,
                                      "asset",
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {!showAllAssetResults &&
                          matchedAssets.length > ASSET_RESULT_PREVIEW_LIMIT && (
                            <p className="mt-2 px-1 text-xs text-slate-500">
                              Доорх &quot;Бүгдийг харах&quot; дээр дарж бүх
                              хөрөнгийг харна уу.
                            </p>
                          )}
                      </section>
                    )}

                    {matchedEmployees.length > 0 && (
                      <section className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                        <p className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                          <UserIcon className="h-3.5 w-3.5" />
                          Ажилтан ({matchedEmployees.length})
                        </p>
                        <div className="mt-2 grid gap-2">
                          {matchedEmployees.map((employee) => {
                            const fullName =
                              `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();
                            return (
                              <div
                                key={employee.id}
                                className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-sm"
                              >
                                <Avatar className="h-11 w-11 border border-slate-200">
                                  <AvatarImage
                                    src={employee.imageUrl || undefined}
                                    alt={fullName || "Employee"}
                                  />
                                  <AvatarFallback>
                                    {getInitials(
                                      fullName || employee.email || "?",
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {renderHighlightedText(
                                      fullName || employee.email,
                                      query,
                                    )}
                                  </p>
                                  <p className="truncate text-xs text-slate-500">
                                    {renderHighlightedText(
                                      employee.email,
                                      query,
                                    )}
                                  </p>
                                  <p className="truncate text-[11px] text-slate-500">
                                    {renderHighlightedText(
                                      employee.department || "Алба тодорхойгүй",
                                      query,
                                    )}
                                  </p>
                                </div>
                                {employee.branch && (
                                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                    {renderHighlightedText(
                                      employee.branch,
                                      query,
                                    )}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 ">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
          aria-label={isDarkTheme ? "Цайвар theme" : "Харанхуй theme"}
          title={isDarkTheme ? "Цайвар theme" : "Харанхуй theme"}
        >
          {themeMounted && isDarkTheme ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <div ref={notificationsRef} className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative h-8 w-8"
            onClick={() => setNotificationsOpen((open) => !open)}
            aria-label="Мэдэгдэл"
          >
            <BellDot className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>

          {notificationsOpen ? (
            <div className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_22px_60px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    Мэдэгдэл
                  </p>
                  <p className="text-xs text-slate-500">
                    {unreadCount > 0
                      ? `${unreadCount} уншаагүй мэдэгдэл`
                      : "Бүх мэдэгдэл уншсан"}
                  </p>
                </div>
                {unreadCount > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg px-2 text-xs text-slate-600 hover:bg-slate-100"
                    onClick={handleMarkAllNotificationsRead}
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Бүгд
                  </Button>
                ) : null}
              </div>

              <div className="max-h-[420px] overflow-y-auto p-2">
                {notificationsLoading ? (
                  <div className="space-y-2 p-2">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-18 animate-pulse rounded-xl bg-slate-100"
                      />
                    ))}
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-5 text-center">
                    <BellDot className="mb-2 h-7 w-7 text-slate-300" />
                    <p className="text-sm font-medium text-slate-700">
                      Мэдэгдэл алга
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Хөрөнгө олгох, шилжүүлэх, буцаах зэрэг үйлдлүүд энд
                      харагдана.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map((notification) => {
                      const tone = getNotificationTone(notification.type);
                      const unread = notification.isRead === 0;

                      return (
                        <button
                          key={notification.id}
                          type="button"
                          className={`group w-full rounded-xl border px-3 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50 ${
                            unread
                              ? "border-slate-200 bg-slate-50"
                              : "border-transparent bg-white"
                          }`}
                          onClick={() => void handleNotificationClick(notification)}
                        >
                          <div className="flex gap-3">
                            <span
                              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                                unread ? tone.dot : "bg-slate-300"
                              }`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <p
                                  className={`line-clamp-2 text-sm ${
                                    unread
                                      ? "font-semibold text-slate-950"
                                      : "font-medium text-slate-700"
                                  }`}
                                >
                                  {notification.title}
                                </p>
                                {notification.link ? (
                                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition group-hover:text-slate-700" />
                                ) : null}
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                                {notification.message}
                              </p>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${tone.badge}`}
                                >
                                  {tone.label}
                                </span>
                                <span className="inline-flex items-center text-[11px] text-slate-400">
                                  <Dot className="h-4 w-4" />
                                  {formatNotificationTime(
                                    notification.createdAt,
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 cursor-pointer rounded-full"
          onClick={() => router.push("/profile")}
          aria-label="Хэрэглэгчийн профайл"
        >
          {session?.user?.image ? (
            <Avatar className="h-7 w-7">
              <AvatarImage
                src={session.user.image}
                alt={session.user.name || "Profile"}
              />
              <AvatarFallback>
                {getInitials(session.user.name || session.user.email || "?")}
              </AvatarFallback>
            </Avatar>
          ) : (
            <UserIcon className="h-4 w-4" />
          )}
          <span className="sr-only">Хэрэглэгч</span>
        </Button>
      </div>
    </header>
  );
}
