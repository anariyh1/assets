"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@apollo/client";
import { ArrowRight, Search } from "lucide-react";

import { formatAssetId } from "@/components/assets/filter/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AssignmentsDocument,
  GetAssetsDocument,
  GetDisposalRequestsDocument,
  GetPurchaseRequestsDocument,
  PurchaseRequestStatus,
} from "@/gql/graphql";

type AssetRequestRow = {
  id: string;
  assetName: string;
  assetCode: string;
  previousUser: string;
  nextUser: string;
  requestType: string;
  status: string;
  sortTime: number;
  sourceType: "assignment" | "transfer" | "disposal" | "purchase";
};

type AssetLite = {
  id: string;
  assetTag?: string | null;
  serialNumber?: string | null;
  category?: string | null;
};

type EmployeeLite = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
};

type AssignmentLite = {
  id: string;
  status?: string | null;
  assetId: string;
  assignedAt?: number | null;
  asset?: AssetLite | null;
  requestedBy?: EmployeeLite | null;
  employee?: EmployeeLite | null;
};

type DisposalLite = {
  id: string;
  assetId: string;
  status?: string | null;
  createdAt?: number | null;
  asset?: AssetLite | null;
  requestedBy?: EmployeeLite | null;
};

type PurchaseRequestLite = {
  id: string;
  assetTag: string;
  serialNumber: string;
  requesterEmail: string;
  status: string;
  createdAt?: number | null;
};

const formatEmployeeName = (employee?: EmployeeLite | null) => {
  if (!employee) return "Admin";
  const fullName = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || employee.email || "Admin";
};

const requestStatusLabel = (status: string) => {
  if (status === "ASSIGN_REQUESTED") return "Хүлээгдэж байна";
  if (status === "PENDING") return "Хүлээгдэж байна";
  if (status === "APPROVED") return "Зөвшөөрсөн";
  if (status === "DECLINED") return "Татгалзсан";
  return status || "Хүлээгдэж байна";
};

function AssetRequestsTableSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index} className="border-0 bg-white hover:bg-white">
          {Array.from({ length: 7 }).map((__, cellIndex) => (
            <TableCell key={cellIndex} className="px-3 py-3.5 md:px-4">
              <Skeleton className="h-4 w-24 bg-[#ececec]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function RequestsTable({
  rows,
  onOpenDetail,
}: {
  rows: AssetRequestRow[];
  onOpenDetail: (row: AssetRequestRow) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-0 bg-[#f3f3f3] hover:bg-[#f3f3f3]">
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            №
          </TableHead>
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            Хөрөнгийн нэр
          </TableHead>
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            Хөрөнгийн ID
          </TableHead>
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            Өмнөх хэрэглэгч
          </TableHead>
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            Шинэ хэрэглэгч
          </TableHead>
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            Хүсэлтийн төрөл
          </TableHead>
          <TableHead className="h-auto px-3 py-3 text-[13px] font-semibold text-[#111111] md:px-4">
            Төлөв
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody className="[&_tr:last-child]:border-0">
        {rows.map((request, index) => (
          <TableRow
            key={request.id}
            className={[
              "border-b border-[#efefef] hover:bg-inherit",
              index % 2 === 0 ? "bg-white" : "bg-[#fafafa]",
            ].join(" ")}
          >
            <TableCell className="px-3 py-3.5 text-[14px] font-medium text-[#111111] md:px-4">
              {index + 1}
            </TableCell>
            <TableCell className="px-3 py-3.5 text-[14px] font-medium text-[#111111] md:px-4">
              {request.assetName}
            </TableCell>
            <TableCell className="px-3 py-3.5 text-[14px] font-medium text-[#111111] md:px-4">
              {request.assetCode}
            </TableCell>
            <TableCell className="px-3 py-3.5 text-[14px] text-[#111111] md:px-4">
              {request.previousUser}
            </TableCell>
            <TableCell className="px-3 py-3.5 text-[14px] text-[#111111] md:px-4">
              {request.nextUser}
            </TableCell>
            <TableCell className="px-3 py-3.5 text-[14px] text-[#111111] md:px-4">
              {request.requestType}
            </TableCell>
            <TableCell className="px-3 py-3.5 md:px-4">
              <div className="flex items-center justify-between gap-3">
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[12px] font-semibold text-amber-700">
                  {requestStatusLabel(request.status)}
                </span>
                <Button
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-[12px] font-semibold text-[#0b6fae] hover:bg-[#e9f3fb] hover:text-[#0b6fae]"
                  onClick={() => onOpenDetail(request)}
                >
                  Дэлгэрэнгүй
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function AssetRequestsTable() {
  const [detailRow, setDetailRow] = useState<AssetRequestRow | null>(null);
  const [showAllOpen, setShowAllOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data: assignmentsData, loading: assignmentsLoading } = useQuery(
    AssignmentsDocument,
    { fetchPolicy: "network-only", pollInterval: 30000 },
  );
  const { data: assetsData, loading: assetsLoading } = useQuery(
    GetAssetsDocument,
    { fetchPolicy: "cache-first" },
  );
  const { data: disposalsData, loading: disposalsLoading } = useQuery(
    GetDisposalRequestsDocument,
    {
      variables: { status: "PENDING" },
      fetchPolicy: "network-only",
      pollInterval: 30000,
    },
  );
  const { data: purchaseRequestsData, loading: purchaseRequestsLoading } =
    useQuery(GetPurchaseRequestsDocument, {
      variables: { status: PurchaseRequestStatus.Pending },
      fetchPolicy: "network-only",
      pollInterval: 30000,
    });

  const allRows = useMemo(() => {
    const assets = (assetsData?.assets ?? []) as AssetLite[];
    const assignments =
      (assignmentsData?.assignments ?? []) as AssignmentLite[];
    const disposals =
      (disposalsData?.disposalRequests ?? []) as DisposalLite[];
    const purchaseRequests = (purchaseRequestsData?.purchaseRequests ??
      []) as PurchaseRequestLite[];
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));

    const assignmentRows: AssetRequestRow[] = assignments
      .filter((assignment) =>
        ["ASSIGN_REQUESTED", "PENDING"].includes(assignment.status ?? ""),
      )
      .map((assignment) => {
        const asset = assignment.asset ?? assetById.get(assignment.assetId);
        const isTransfer = assignment.status === "PENDING";
        return {
          id: assignment.id,
          assetName: formatAssetId(asset?.assetTag ?? assignment.assetId),
          assetCode: asset?.serialNumber ?? assignment.assetId,
          previousUser: formatEmployeeName(assignment.requestedBy),
          nextUser: formatEmployeeName(assignment.employee),
          requestType: isTransfer ? "Хөрөнгө шилжүүлэх" : "Хөрөнгө олгох",
          status: assignment.status ?? "PENDING",
          sortTime: assignment.assignedAt ?? 0,
          sourceType: isTransfer ? "transfer" : "assignment",
        };
      });

    const disposalRows: AssetRequestRow[] = disposals.map((disposal) => ({
      id: disposal.id,
      assetName: formatAssetId(disposal.asset?.assetTag ?? disposal.assetId),
      assetCode: disposal.asset?.serialNumber ?? disposal.assetId,
      previousUser: formatEmployeeName(disposal.requestedBy),
      nextUser: "IT админ",
      requestType: "Хөрөнгө устгах",
      status: disposal.status ?? "PENDING",
      sortTime: disposal.createdAt ?? 0,
      sourceType: "disposal",
    }));

    const purchaseRows: AssetRequestRow[] = purchaseRequests.map((request) => ({
      id: request.id,
      assetName: formatAssetId(request.assetTag),
      assetCode: request.serialNumber,
      previousUser: request.requesterEmail,
      nextUser: "Санхүү",
      requestType: "Хөрөнгө худалдан авах",
      status: request.status,
      sortTime: request.createdAt ?? 0,
      sourceType: "purchase",
    }));

    return [...assignmentRows, ...disposalRows, ...purchaseRows].sort(
      (left, right) => right.sortTime - left.sortTime,
    );
  }, [assetsData, assignmentsData, disposalsData, purchaseRequestsData]);

  const filteredRows = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return allRows;
    return allRows.filter((row) =>
      [
        row.assetName,
        row.assetCode,
        row.previousUser,
        row.nextUser,
        row.requestType,
        requestStatusLabel(row.status),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [allRows, search]);

  const rows = useMemo(() => filteredRows.slice(0, 5), [filteredRows]);
  const isLoading =
    assignmentsLoading ||
    assetsLoading ||
    disposalsLoading ||
    purchaseRequestsLoading;

  const detailMessage = useMemo(() => {
    if (!detailRow) return "";
    if (detailRow.sourceType === "assignment") {
      return `${detailRow.assetName} хөрөнгийг ${detailRow.nextUser}-д олгох хүсэлт хүлээгдэж байна.`;
    }
    if (detailRow.sourceType === "transfer") {
      return `${detailRow.previousUser}-аас ${detailRow.nextUser}-руу шилжүүлэх хүсэлт хүлээгдэж байна.`;
    }
    if (detailRow.sourceType === "purchase") {
      return `${detailRow.previousUser} ${detailRow.assetName} хөрөнгө худалдан авах хүсэлт илгээсэн.`;
    }
    return `${detailRow.previousUser} ${detailRow.assetName} хөрөнгийг устгах хүсэлт илгээсэн.`;
  }, [detailRow]);

  return (
    <Card className="border bg-white p-0 shadow-none">
      <CardHeader className="flex-row items-center justify-between px-3 pt-2">
        <CardTitle className="pl-3 pt-2 text-[18px] font-semibold tracking-[-0.02em] text-[#111111]">
          Хөрөнгийн хүсэлтүүд
        </CardTitle>
        <CardAction className="pl-2">
          <Button
            variant="ghost"
            className="h-auto gap-2.5 rounded-full px-3 pt-1.5 text-[13px] font-medium text-[#6b6b6b] hover:bg-transparent hover:text-[#111111]"
            onClick={() => setShowAllOpen(true)}
          >
            Бүгдийг үзэх
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="px-4 pb-3">
        <div className="mb-3 flex max-w-sm items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Хүсэлт хайх..."
            className="h-9 rounded-lg border-slate-200"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#efefef] bg-white">
          {isLoading ? (
            <Table>
              <TableBody>
                <AssetRequestsTableSkeleton />
              </TableBody>
            </Table>
          ) : rows.length === 0 ? (
            <div className="px-4 py-8 text-center text-[14px] text-[#6b6b6b]">
              Одоогоор харагдах хүсэлт алга байна.
            </div>
          ) : (
            <RequestsTable rows={rows} onOpenDetail={setDetailRow} />
          )}
        </div>
      </CardContent>

      <Dialog open={showAllOpen} onOpenChange={setShowAllOpen}>
        <DialogContent className="w-[calc(100vw-24px)] max-w-none sm:w-[min(98vw,1320px)]">
          <DialogHeader>
            <DialogTitle>Бүх хөрөнгийн хүсэлтүүд</DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              Нийт {allRows.length} хүсэлтээс {filteredRows.length} нь
              харагдаж байна.
            </DialogDescription>
          </DialogHeader>
          <div className="h-[62vh] min-h-[360px] overflow-auto rounded-2xl border border-[#efefef] bg-white sm:h-[70vh] sm:min-h-[420px]">
            {isLoading ? (
              <Table>
                <TableBody>
                  <AssetRequestsTableSkeleton />
                </TableBody>
              </Table>
            ) : filteredRows.length === 0 ? (
              <div className="px-4 py-8 text-center text-[14px] text-[#6b6b6b]">
                Одоогоор харагдах хүсэлт алга байна.
              </div>
            ) : (
              <RequestsTable rows={filteredRows} onOpenDetail={setDetailRow} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={detailRow != null}
        onOpenChange={(open) => !open && setDetailRow(null)}
      >
        <DialogContent className="max-w-[min(92vw,560px)]">
          <DialogHeader>
            <DialogTitle>
              {detailRow
                ? `${detailRow.assetCode} — төлөвийн дэлгэрэнгүй`
                : ""}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-5">
              {detailMessage}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
