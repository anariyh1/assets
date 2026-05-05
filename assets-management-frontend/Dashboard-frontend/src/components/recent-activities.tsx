"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  ClipboardCheck,
  DollarSign,
  PackagePlus,
  RotateCcw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@apollo/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AssignmentsDocument,
  EmployeesDocument,
  GetAuditLogsDocument,
  type AssignmentFieldsFragment,
} from "@/gql/graphql";

type ActivityType =
  | "assigned"
  | "returned"
  | "transferred"
  | "verified"
  | "asset_status_changed"
  | "asset_price_changed"
  | "registered"
  | "deleted"
  | "warning";

type RecentActivity = {
  id: string;
  title: string;
  time: string;
  ts: number;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
};

type AuditLogRow = {
  id: string;
  tableName: string;
  recordId: string;
  action: string;
  actorId?: string | null;
  oldValueJson?: string | null;
  newValueJson?: string | null;
  createdAt: number;
};

const formatDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hour}:${minute}`;
};

const safeJson = (value?: string | null) => {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const formatMoney = (value: number | null) =>
  value == null ? "0₮" : `${value.toLocaleString("mn-MN")}₮`;

const pickActivityIcon = (type: ActivityType) => {
  switch (type) {
    case "assigned":
      return { icon: UserPlus, iconColor: "text-green-500" };
    case "returned":
      return { icon: RotateCcw, iconColor: "text-orange-500" };
    case "transferred":
      return { icon: ArrowLeftRight, iconColor: "text-blue-500" };
    case "verified":
      return { icon: ClipboardCheck, iconColor: "text-blue-500" };
    case "asset_status_changed":
      return { icon: BadgeCheck, iconColor: "text-indigo-500" };
    case "asset_price_changed":
      return { icon: DollarSign, iconColor: "text-emerald-600" };
    case "registered":
      return { icon: PackagePlus, iconColor: "text-cyan-600" };
    case "deleted":
      return { icon: Trash2, iconColor: "text-red-500" };
    case "warning":
      return { icon: AlertTriangle, iconColor: "text-amber-500" };
    default:
      return { icon: UserPlus, iconColor: "text-gray-500" };
  }
};

function getString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function getNumber(value: unknown) {
  return typeof value === "number" ? value : null;
}

function buildAuditActivity(
  log: AuditLogRow,
  employeeNameById: Map<string, string>,
): RecentActivity {
  const oldValue = safeJson(log.oldValueJson) ?? {};
  const newValue = safeJson(log.newValueJson) ?? {};
  const assetTag =
    getString(newValue.assetTag) ??
    getString(oldValue.assetTag) ??
    getString(newValue.assetId) ??
    getString(oldValue.assetId) ??
    getString(newValue.serialNumber) ??
    getString(oldValue.serialNumber) ??
    log.recordId;
  const actor = log.actorId
    ? employeeNameById.get(log.actorId) ?? "Admin"
    : "System";
  const oldStatus = getString(oldValue.status);
  const nextStatus = getString(newValue.status);
  const oldPurchaseCost = getNumber(oldValue.purchaseCost);
  const nextPurchaseCost = getNumber(newValue.purchaseCost);

  let type: ActivityType = "verified";
  let title = `${assetTag} дээр ${log.action} үйлдэл хийгдсэн`;

  if (log.action === "REGISTERED" || log.action === "CREATED") {
    type = "registered";
    title = `${assetTag} хөрөнгө бүртгэгдсэн`;
  } else if (log.action === "ASSIGNED") {
    type = "assigned";
    const employeeId = getString(newValue.employeeId);
    const employeeName = employeeId
      ? employeeNameById.get(employeeId) ?? employeeId
      : actor;
    title = `${assetTag} хөрөнгийг ${employeeName}-д олгосон`;
  } else if (log.action === "TRANSFERRED") {
    type = "transferred";
    const fromEmployeeId = getString(newValue.fromEmployeeId);
    const toEmployeeId = getString(newValue.toEmployeeId);
    const fromName = fromEmployeeId
      ? employeeNameById.get(fromEmployeeId) ?? fromEmployeeId
      : "өмнөх эзэмшигч";
    const toName = toEmployeeId
      ? employeeNameById.get(toEmployeeId) ?? toEmployeeId
      : "шинэ эзэмшигч";
    title = `${assetTag} хөрөнгийг ${fromName}-с ${toName} руу шилжүүлсэн`;
  } else if (log.action === "ASSET_RETURNED" || log.action === "RETURNED") {
    type = "returned";
    title = `${assetTag} хөрөнгө буцаагдсан`;
  } else if (
    log.action === "ASSET_DELETED" ||
    log.action === "ASSET_DELETE_REQUESTED"
  ) {
    type = "deleted";
    title =
      log.action === "ASSET_DELETED"
        ? `${assetTag} хөрөнгийг устгасан`
        : `${assetTag} хөрөнгө устгах хүсэлт илгээгдсэн`;
  } else if (log.action === "ASSET_DELETE_FAILED") {
    type = "warning";
    title = `${assetTag} хөрөнгө устгах үед алдаа гарсан`;
  } else if (oldStatus && nextStatus && oldStatus !== nextStatus) {
    type = "asset_status_changed";
    title = `${actor} нь ${assetTag} хөрөнгийн төлөвийг ${oldStatus} -> ${nextStatus} болгож өөрчилсөн`;
  } else if (
    nextPurchaseCost != null &&
    nextPurchaseCost !== oldPurchaseCost
  ) {
    type = "asset_price_changed";
    title = `${actor} нь ${assetTag} хөрөнгийн үнийг ${formatMoney(
      oldPurchaseCost,
    )} -> ${formatMoney(nextPurchaseCost)} болгож өөрчилсөн`;
  } else if (nextStatus) {
    type = "asset_status_changed";
    title = `${actor} нь ${assetTag} хөрөнгийн төлөвийг ${nextStatus} болгож өөрчилсөн`;
  }

  return {
    id: log.id,
    title,
    time: formatDateTime(log.createdAt),
    ts: log.createdAt,
    ...pickActivityIcon(type),
  };
}

export function RecentActivities() {
  const { data: assignmentsData, loading } = useQuery(AssignmentsDocument);
  const { data: auditData, loading: auditLoading } = useQuery(
    GetAuditLogsDocument,
    {
      variables: {},
      fetchPolicy: "network-only",
      pollInterval: 30000,
    },
  );
  const { data: employeesData } = useQuery(EmployeesDocument, {
    fetchPolicy: "cache-first",
  });

  const activities = useMemo(() => {
    const employeeNameById = new Map<string, string>();
    (employeesData?.employees ?? []).forEach((employee) => {
      const name =
        [employee.firstName, employee.lastName].filter(Boolean).join(" ") ||
        employee.email ||
        employee.id;
      employeeNameById.set(employee.id, name);
    });

    const assignments =
      (assignmentsData?.assignments ?? []) as AssignmentFieldsFragment[];
    const assignmentActivities = [...assignments]
      .sort((left, right) => {
        const leftTime = left.returnedAt ?? left.assignedAt;
        const rightTime = right.returnedAt ?? right.assignedAt;
        return rightTime - leftTime;
      })
      .slice(0, 20)
      .map((assignment) => {
        const employeeName = assignment.employee
          ? `${assignment.employee.firstName} ${assignment.employee.lastName}`.trim()
          : employeeNameById.get(assignment.employeeId) ?? "Admin";
        const asset = assignment.asset as
          | { assetTag?: string; category?: string }
          | null
          | undefined;
        const assetName = asset?.assetTag ?? asset?.category ?? "Хөрөнгө";
        const timeStamp = assignment.returnedAt ?? assignment.assignedAt;
        const type: ActivityType = assignment.returnedAt
          ? "returned"
          : "assigned";
        const title = assignment.returnedAt
          ? `${assetName}-г ${employeeName} буцаан өгсөн`
          : `${assetName}-г ${employeeName}-д хуваарилсан`;

        return {
          id: assignment.id,
          title,
          time: formatDateTime(timeStamp),
          ts: timeStamp,
          ...pickActivityIcon(type),
        };
      });

    const auditActivities = ((auditData?.auditLogs ?? []) as AuditLogRow[]).map(
      (log) => buildAuditActivity(log, employeeNameById),
    );

    return [...auditActivities, ...assignmentActivities]
      .sort((left, right) => (right.ts ?? 0) - (left.ts ?? 0))
      .slice(0, 20);
  }, [
    assignmentsData?.assignments,
    auditData?.auditLogs,
    employeesData?.employees,
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          Сүүлд хийгдсэн үйлдлүүд
        </CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[320px] px-6">
          <div className="space-y-5 py-2">
            {loading || auditLoading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5 rounded-full" />
                    <Skeleton className="h-3 w-28 rounded-full" />
                  </div>
                </div>
              ))
            ) : activities.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Үйлдэл бүртгэгдээгүй байна.
              </div>
            ) : (
              activities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center">
                      <Icon className={`h-5 w-5 ${activity.iconColor}`} />
                    </div>

                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-foreground">
                        {activity.title}
                      </p>

                      <span className="text-xs text-muted-foreground">
                        {activity.time}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
