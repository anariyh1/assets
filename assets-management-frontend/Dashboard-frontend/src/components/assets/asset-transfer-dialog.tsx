"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import {
  UpdateAssetDocument,
  EmployeesDocument,
  AssignAssetDocument,
  TransferAssetDocument,
} from "@/gql/graphql";
import { User, MapPin, X, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LocationPicker } from "./location-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter as ConfirmFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type SelectedAsset = {
  id: string;
  assetTag: string;
  serialNumber?: string;
  category?: string;
  location?: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  currentBookValue?: number;
  purchaseCost?: number;
};

type TabMode = "owner" | "location";

interface AssetTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: SelectedAsset[];
  onRemoveAsset?: (id: string) => void;
  onSuccess?: () => void;
}

export function AssetTransferDialog({
  open,
  onOpenChange,
  selectedAssets,
  onRemoveAsset,
  onSuccess,
}: AssetTransferDialogProps) {
  const [tab, setTab] = useState<TabMode>("owner");
  const [locationFullPath, setLocationFullPath] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [conditionAtTransfer, setConditionAtTransfer] = useState("GOOD");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [ownerPickerOpen, setOwnerPickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: employeesData } = useQuery(EmployeesDocument);
  const [updateAssetMutation] = useMutation(UpdateAssetDocument);
  const [assignAssetMutation] = useMutation(AssignAssetDocument);
  const [transferAssetMutation] = useMutation(TransferAssetDocument);

  const employees = useMemo(() => {
    const list = (employeesData?.employees ?? []) as Array<{
      id: string;
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    }>;
    return list.map((e) => ({
      id: e.id,
      name: [e.firstName, e.lastName].filter(Boolean).join(" ") || e.email || e.id,
    }));
  }, [employeesData?.employees]);

  const selectedEmployeeName = employees.find(
    (employee) => employee.id === employeeId,
  )?.name;

  useEffect(() => {
    if (!open) return;
    setTab("owner");
    setOwnerPickerOpen(false);
    setConditionAtTransfer("GOOD");
    setReason("");
  }, [open]);

  const handleTransferToLocation = async () => {
    if (!locationFullPath || selectedAssets.length === 0) {
      toast.error("Байршил болон хөрөнгийг сонгоно уу.");
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading("Байршил руу шилжүүлж байна...");
    try {
      for (const asset of selectedAssets) {
        await updateAssetMutation({
          variables: {
            id: asset.id,
            input: { locationId: locationFullPath },
          },
        });
      }
      toast.success(`${selectedAssets.length} хөрөнгө амжилттай шилжүүллээ.`, {
        id: toastId,
      });
      setLocationFullPath("");
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Шилжүүлэхэд алдаа гарлаа.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTransferToOwner = async () => {
    if (!employeeId || selectedAssets.length === 0) {
      toast.error("Эзэмшигч болон хөрөнгийг сонгоно уу.");
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading("Эзэмшигч рүү шилжүүлж байна...");
    try {
      for (const asset of selectedAssets) {
        if (asset.assignedEmployeeId) {
          await transferAssetMutation({
            variables: {
              assetId: asset.id,
              fromEmployeeId: asset.assignedEmployeeId,
              toEmployeeId: employeeId,
              reason: reason.trim() || undefined,
              conditionNoted: conditionAtTransfer,
            },
          });
        } else {
          await assignAssetMutation({
            variables: {
              assetId: asset.id,
              employeeId,
              conditionAtAssign: conditionAtTransfer,
            },
          });
        }
      }
      toast.success(`${selectedAssets.length} хөрөнгө амжилттай шилжүүллээ.`, {
        id: toastId,
      });
      setEmployeeId("");
      setConditionAtTransfer("GOOD");
      setReason("");
      onSuccess?.();
      onOpenChange(false);
    } catch (e) {
      toast.error("Хуваарилах үед алдаа гарлаа.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    setConfirmOpen(true);
  };

  const canSubmit =
    selectedAssets.length > 0 &&
    (tab === "location" ? !!locationFullPath : !!employeeId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle className="sr-only">Хөрөнгө шилжүүлэх</DialogTitle>
          <div className="flex items-center gap-6 border-b pb-3 pr-10">
            <button
              type="button"
              onClick={() => setTab("owner")}
              className={
                tab === "owner"
                  ? "flex items-center gap-1.5 border-b-2 border-primary pb-0.5 text-sm font-medium text-foreground transition-colors"
                  : "flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              <User className="h-4 w-4" />
              Эзэмшигчрүү шилжүүлэх
            </button>
            <button
              type="button"
              onClick={() => setTab("location")}
              className={
                tab === "location"
                  ? "flex items-center gap-1.5 border-b-2 border-primary pb-0.5 text-sm font-medium text-foreground transition-colors"
                  : "flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              }
            >
              <MapPin className="h-4 w-4" />
              Байршилруу шилжүүлэх
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground">
              Сонгогдсон хөрөнгө
            </label>
            <div className="mt-2 flex flex-wrap gap-2 rounded-md border border-input bg-muted/30 p-2 min-h-[52px]">
              {selectedAssets.length === 0 ? (
                <span className="text-sm text-muted-foreground py-1">
                  Хөрөнгө сонгоогүй байна. Хүснэгтээс сонгоно уу.
                </span>
              ) : (
                selectedAssets.map((asset) => (
                  <span
                    key={asset.id}
                    className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-sm border border-border"
                  >
                    {asset.assetTag}
                    {onRemoveAsset && (
                      <button
                        type="button"
                        onClick={() => onRemoveAsset(asset.id)}
                        className="rounded p-0.5 hover:bg-muted"
                        aria-label={`${asset.assetTag}-г хасах`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
          </div>

          {tab === "location" && (
            <LocationPicker
              value={locationFullPath}
              onChange={(path) => setLocationFullPath(path ?? "")}
              label="Байршил сонгох"
            />
          )}

          {tab === "owner" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Эзэмшигч сонгох
              </label>
              <Popover open={ownerPickerOpen} onOpenChange={setOwnerPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ownerPickerOpen}
                    className="h-11 w-full justify-between overflow-hidden rounded-md border-gray-200 font-normal"
                  >
                    <span className="truncate">
                      {selectedEmployeeName || "Эзэмшигч хайх..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Нэрээр хайх..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>Ажилтан олдсонгүй.</CommandEmpty>
                      <CommandGroup>
                        {employees.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={emp.name}
                            onSelect={() => {
                              setEmployeeId(emp.id);
                              setOwnerPickerOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                employeeId === emp.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {emp.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Хүлээлгэн өгөх үеийн төлөв
                </label>
                <Select
                  value={conditionAtTransfer}
                  onValueChange={setConditionAtTransfer}
                >
                  <SelectTrigger className="h-11 w-full rounded-md border-gray-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GOOD">Сайн</SelectItem>
                    <SelectItem value="FAIR">Дунд</SelectItem>
                    <SelectItem value="DAMAGED">Эвдрэлтэй</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Шилжүүлэх шалтгаан
                </label>
                <Input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Жишээ: ажилтан солигдсон..."
                  className="h-11 rounded-md border-gray-200"
                />
              </div>
            </div>
          )}
          {selectedAssets.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Шилжүүлгийн мэдээлэл
              </p>
              {tab === "owner" ? (
                <div className="rounded-md bg-white/70 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Шинэ эзэмшигч: </span>
                  <span className="font-medium">{selectedEmployeeName || "—"}</span>
                </div>
              ) : (
                <div className="rounded-md bg-white/70 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">Шинэ байршил: </span>
                  <span className="font-medium">{locationFullPath || "—"}</span>
                </div>
              )}
              <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                {selectedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-md bg-white px-3 py-3 text-sm"
                  >
                    <span className="text-muted-foreground">Хөрөнгө</span>
                    <span className="font-medium">{asset.assetTag}</span>
                    <span className="text-muted-foreground">Сериал</span>
                    <span className="font-medium">{asset.serialNumber || "—"}</span>
                    <span className="text-muted-foreground">Одоогийн эзэмшигч</span>
                    <span className="font-medium">
                      {asset.assignedEmployeeName || "Эзэмшигчгүй"}
                    </span>
                    <span className="text-muted-foreground">Байршил</span>
                    <span className="font-medium">{asset.location || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Цуцлах
          </Button>
          <Button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="bg-sky-900 text-white hover:bg-sky-950"
          >
            {submitting ? "Түр хүлээнэ үү..." : "Шилжүүлэх"}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Та шилжүүлэхэд итгэлтэй байна уу?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tab === "owner"
                ? "Сонгосон хөрөнгүүд шинэ эзэмшигч рүү шилжинэ."
                : "Сонгосон хөрөнгүүд шинэ байршил руу шилжинэ."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ConfirmFooter>
            <AlertDialogCancel>Үгүй</AlertDialogCancel>
            <AlertDialogAction
              className="bg-sky-900 text-white hover:bg-sky-950"
              onClick={() => {
                if (tab === "location") {
                  void handleTransferToLocation();
                } else {
                  void handleTransferToOwner();
                }
              }}
            >
              Тийм
            </AlertDialogAction>
          </ConfirmFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
