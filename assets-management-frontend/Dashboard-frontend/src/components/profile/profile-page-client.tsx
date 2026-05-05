"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ElementType, ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Github,
  IdCard,
  Loader2,
  LogIn,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMutation, useQuery } from "@apollo/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreateEmployeeDocument,
  EmployeesDocument,
  UpdateEmployeeDocument,
  type EmployeeCreateInput,
  type EmployeeUpdateInput,
  type EmployeesQuery,
} from "@/gql/graphql";
import { cn } from "@/lib/utils";

type Employee = EmployeesQuery["employees"][number];

const LOCAL_PROFILE_PREFIX = "assethub-profile:";

const bootstrapSuperAdminEmails = (
  process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || ""
)
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const fallbackProfile = {
  name: "Хэрэглэгч",
  email: "Нэвтрээгүй байна",
};

function getInitials(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: number | null) {
  if (!value) return "Тодорхойгүй";

  const date = new Date(value > 1_000_000_000_000 ? value : value * 1000);

  if (Number.isNaN(date.getTime())) return "Тодорхойгүй";

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-700">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold text-slate-900">
          {value || "Тодорхойгүй"}
        </div>
      </div>
    </div>
  );
}

function getEmployeeName(employee?: Employee | null) {
  if (!employee) return "";
  return `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim();
}

function getLocalProfileKey(email: string) {
  return `${LOCAL_PROFILE_PREFIX}${email.toLowerCase()}`;
}

export function ProfilePageClient() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loginName, setLoginName] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [editMessage, setEditMessage] = useState("");
  const [editError, setEditError] = useState("");
  const [localEmployee, setLocalEmployee] = useState<Employee | undefined>();
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    firstNameEng: "",
    lastNameEng: "",
    email: "",
    role: "EMPLOYEE",
    department: "",
    branch: "",
    employeeCode: "",
    level: "",
    github: "",
    imageUrl: "",
    birthDayAndMonth: "",
  });
  const { data, loading } = useQuery(EmployeesDocument, {
    skip: status !== "authenticated",
  });
  const [updateEmployee, { loading: isSavingProfile }] = useMutation(
    UpdateEmployeeDocument,
    {
      refetchQueries: [EmployeesDocument],
      awaitRefetchQueries: true,
    },
  );
  const [createEmployee, { loading: isCreatingProfile }] = useMutation(
    CreateEmployeeDocument,
    {
      refetchQueries: [EmployeesDocument],
      awaitRefetchQueries: true,
    },
  );

  const remoteEmployee = useMemo(() => {
    const email = session?.user?.email?.toLowerCase();
    if (!email) return undefined;

    return data?.employees.find(
      (item) => item.email.toLowerCase() === email,
    );
  }, [data?.employees, session?.user?.email]);
  const employee = remoteEmployee ?? localEmployee;

  const displayName =
    getEmployeeName(employee) || session?.user?.name || fallbackProfile.name;
  const displayEmail =
    employee?.email || session?.user?.email || fallbackProfile.email;
  const displayImage = employee?.imageUrl || session?.user?.image || undefined;
  const isSignedIn = status === "authenticated";
  const sessionEmail = session?.user?.email?.toLowerCase() || "";
  const isSuperAdmin =
    employee?.role === "SUPER_ADMIN" ||
    bootstrapSuperAdminEmails.includes(sessionEmail);
  const isSavingProfileForm = isSavingProfile || isCreatingProfile;

  useEffect(() => {
    if (!sessionEmail) return;

    const savedProfile = window.localStorage.getItem(
      getLocalProfileKey(sessionEmail),
    );

    if (!savedProfile) {
      setLocalEmployee(undefined);
      return;
    }

    try {
      setLocalEmployee(JSON.parse(savedProfile) as Employee);
    } catch {
      window.localStorage.removeItem(getLocalProfileKey(sessionEmail));
      setLocalEmployee(undefined);
    }
  }, [sessionEmail]);

  useEffect(() => {
    if (!employee) {
      const nameParts = (session?.user?.name || "").split(" ").filter(Boolean);
      setProfileForm((current) => ({
        ...current,
        firstName: current.firstName || nameParts[0] || "",
        lastName: current.lastName || nameParts.slice(1).join(" ") || "",
        firstNameEng: current.firstNameEng || nameParts[0] || "",
        lastNameEng: current.lastNameEng || nameParts.slice(1).join(" ") || "",
        email: current.email || session?.user?.email || "",
        role: isSuperAdmin ? "SUPER_ADMIN" : current.role,
      }));
      return;
    }

    setProfileForm({
      firstName: employee.firstName || "",
      lastName: employee.lastName || "",
      firstNameEng: employee.firstNameEng || "",
      lastNameEng: employee.lastNameEng || "",
      email: employee.email || "",
      role: employee.role || "EMPLOYEE",
      department: employee.department || "",
      branch: employee.branch || "",
      employeeCode: employee.employeeCode || "",
      level: employee.level || "",
      github: employee.github || "",
      imageUrl: employee.imageUrl || "",
      birthDayAndMonth: employee.birthDayAndMonth || "",
    });
  }, [employee, isSuperAdmin, session?.user?.email, session?.user?.name]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    const result = await signIn("credentials", {
      name: loginName,
      email: loginEmail,
      redirect: false,
      callbackUrl: "/profile",
    });

    setIsLoggingIn(false);

    if (result?.error) {
      setLoginError("Нэвтрэхэд алдаа гарлаа. Email хаягаа шалгаад дахин оролдоно уу.");
      return;
    }

    router.replace("/profile");
    router.refresh();
  };

  const updateProfileForm = (field: keyof typeof profileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
  };

  const handleProfileSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEditMessage("");
    setEditError("");

    if (!isSignedIn) return;

    const clean = (value?: string | null) => value?.trim() || "";
    const email = clean(profileForm.email || session?.user?.email);

    if (!email) {
      setEditError("Email хоосон байна. Email оруулаад хадгална уу.");
      return;
    }

    const emailName = email.split("@")[0] || "user";
    const firstName = clean(profileForm.firstName) || emailName;
    const lastName = clean(profileForm.lastName) || "-";
    const firstNameEng = clean(profileForm.firstNameEng) || firstName;
    const lastNameEng = clean(profileForm.lastNameEng) || lastName;
    const department = clean(profileForm.department) || "Not set";
    const branch = clean(profileForm.branch) || "Not set";
    const level = clean(profileForm.level) || "Not set";
    const role = isSuperAdmin ? clean(profileForm.role) || "SUPER_ADMIN" : undefined;

    const profileInput = {
      firstName,
      lastName,
      firstNameEng,
      lastNameEng,
      email,
      department,
      branch,
      employeeCode: clean(profileForm.employeeCode) || undefined,
      level,
      github: clean(profileForm.github) || null,
      imageUrl: clean(profileForm.imageUrl) || null,
      birthDayAndMonth: clean(profileForm.birthDayAndMonth) || null,
    };

    const saveLocalProfile = () => {
      const now = Date.now();
      const savedEmployee = {
        __typename: "Employee",
        id: employee?.id || `local-${email}`,
        entraId: employee?.entraId ?? null,
        role: role || employee?.role || "EMPLOYEE",
        signUrl: employee?.signUrl ?? null,
        hireDate: employee?.hireDate || now,
        terminationDate: employee?.terminationDate ?? null,
        status: employee?.status || "ACTIVE",
        numberOfVacationDays: employee?.numberOfVacationDays ?? null,
        isKpi: employee?.isKpi ?? 0,
        isSalaryCompany: employee?.isSalaryCompany ?? 1,
        birthdayPoster: employee?.birthdayPoster ?? null,
        createdAt: employee?.createdAt || now,
        updatedAt: now,
        deletedAt: employee?.deletedAt ?? null,
        ...profileInput,
        employeeCode:
          profileInput.employeeCode || employee?.employeeCode || `LOCAL-${now}`,
      } as Employee;

      window.localStorage.setItem(
        getLocalProfileKey(email),
        JSON.stringify(savedEmployee),
      );
      setLocalEmployee(savedEmployee);
      return savedEmployee;
    };

    const saveProfile = async (includeRole: boolean) => {
      const safeRole = includeRole && role ? { role } : {};

      if (remoteEmployee) {
        return updateEmployee({
          variables: {
            id: remoteEmployee.id,
            input: {
              ...profileInput,
              ...safeRole,
            } as unknown as EmployeeUpdateInput,
          },
        });
      }

      return createEmployee({
        variables: {
          input: {
            ...profileInput,
            ...safeRole,
            hireDate: Date.now(),
            status: "ACTIVE",
          } as unknown as EmployeeCreateInput,
        },
      });
    };

    try {
      await saveProfile(Boolean(role));
      setEditMessage("Profile амжилттай хадгалагдлаа.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.toLowerCase().includes("failed to fetch") ||
        message.toLowerCase().includes("unauthorized") ||
        message.includes("status code 500")
      ) {
        saveLocalProfile();
        setEditMessage(
          "Backend холбогдохгүй байгаа тул profile browser дээр түр хадгалагдлаа.",
        );
        return;
      }

      if (
        message.toLowerCase().includes("role") ||
        message.includes("status code 400")
      ) {
        try {
          await saveProfile(false);
          setEditMessage(
            "Profile хадгалагдлаа. Backend restart хийгдээгүй тул role түр хадгалагдаагүй.",
          );
          return;
        } catch (retryError) {
          const retryMessage =
            retryError instanceof Error ? retryError.message : String(retryError);

          if (
            retryMessage.toLowerCase().includes("failed to fetch") ||
            retryMessage.toLowerCase().includes("unauthorized") ||
            retryMessage.includes("status code 500")
          ) {
            saveLocalProfile();
            setEditMessage(
              "Backend холбогдохгүй байгаа тул profile browser дээр түр хадгалагдлаа.",
            );
            return;
          }

          setEditError(
            retryMessage || "Profile хадгалах үед алдаа гарлаа.",
          );
          return;
        }
      }

      setEditError(message || "Profile хадгалах үед алдаа гарлаа.");
    }
  };

  if (status !== "loading" && !isSignedIn) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-muted/30 px-4 py-6">
        <Card className="w-full max-w-md rounded-lg border-slate-200 bg-white">
          <CardHeader>
            <Button asChild variant="ghost" className="mb-2 h-9 w-fit px-2 text-slate-700">
              <Link href="/">
                <ArrowLeft className="h-4 w-4" />
                Буцах
              </Link>
            </Button>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-800">
              <LogIn className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-semibold text-slate-950">
              Profile руу нэвтрэх
            </CardTitle>
            <CardDescription>
              Ажилтны email-ээ оруулаад profile мэдээллээ хараарай.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleEmailLogin}>
              <div className="space-y-2">
                <Label htmlFor="profile-name">Нэр</Label>
                <Input
                  id="profile-name"
                  value={loginName}
                  onChange={(event) => setLoginName(event.target.value)}
                  placeholder="Жишээ: Bold"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="profile-email">Email</Label>
                <Input
                  id="profile-email"
                  type="email"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  placeholder="name@company.com"
                  required
                />
              </div>
              {loginError ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {loginError}
                </p>
              ) : null}
              <Button type="submit" className="h-10 w-full" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                Нэвтрэх
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                onClick={() => signIn("google", { callbackUrl: "/profile" })}
              >
                Google-р нэвтрэх
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-muted/30 px-4 py-6 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" className="h-9 px-2 text-slate-700">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Буцах
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            {isSignedIn ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                Гарах
              </Button>
            ) : (
              <Button type="button" onClick={() => signIn("google")}>
                Google-р нэвтрэх
              </Button>
            )}
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <Card className="rounded-lg border-slate-200 bg-white">
            <CardHeader className="items-center text-center">
              {status === "loading" ? (
                <Skeleton className="h-24 w-24 rounded-full" />
              ) : (
                <Avatar className="h-24 w-24 border border-slate-200">
                  <AvatarImage src={displayImage} alt={displayName} />
                  <AvatarFallback className="text-2xl">
                    {getInitials(displayName || displayEmail || "?")}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="min-w-0">
                <CardTitle className="text-xl font-semibold text-slate-950">
                  {status === "loading" ? "Уншиж байна..." : displayName}
                </CardTitle>
                <CardDescription className="mt-1 break-words">
                  {displayEmail}
                </CardDescription>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant={isSignedIn ? "default" : "outline"}>
                  {isSignedIn ? "Нэвтэрсэн" : "Зочин"}
                </Badge>
                {employee?.status ? (
                  <Badge variant="outline">{employee.status}</Badge>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <Separator />
              <div className="grid gap-3">
                <DetailItem icon={Mail} label="Имэйл" value={displayEmail} />
                <DetailItem
                  icon={ShieldCheck}
                  label="Эрх"
                  value={employee?.role || "Тодорхойгүй"}
                />
                <DetailItem
                  icon={IdCard}
                  label="Ажилтны код"
                  value={employee?.employeeCode}
                />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5">
            <Card className="rounded-lg border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5 text-slate-700" />
                  Хувийн мэдээлэл
                </CardTitle>
                <CardDescription>
                  Google профайл болон ажилтны бүртгэлээс олдсон мэдээлэл.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 rounded-lg" />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    <DetailItem
                      icon={BriefcaseBusiness}
                      label="Алба хэлтэс"
                      value={employee?.department}
                    />
                    <DetailItem
                      icon={Building2}
                      label="Салбар"
                      value={employee?.branch}
                    />
                    <DetailItem
                      icon={BadgeCheck}
                      label="Түвшин"
                      value={employee?.level}
                    />
                    <DetailItem
                      icon={CalendarDays}
                      label="Ажилд орсон огноо"
                      value={formatDate(employee?.hireDate)}
                    />
                    <DetailItem
                      icon={Github}
                      label="GitHub"
                      value={
                        employee?.github ? (
                          <a
                            className="text-slate-950 underline underline-offset-4"
                            href={`https://github.com/${employee.github}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {employee.github}
                          </a>
                        ) : undefined
                      }
                    />
                    <DetailItem
                      icon={CalendarDays}
                      label="Төрсөн өдөр"
                      value={employee?.birthDayAndMonth}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={cn(
                "rounded-lg border-slate-200 bg-white",
                employee ? "border-emerald-200" : "border-amber-200",
              )}
            >
              <CardHeader>
                <CardTitle>
                  {employee ? "Employee record холбогдсон" : "Employee record олдсонгүй"}
                </CardTitle>
                <CardDescription>
                  {employee
                    ? "Таны email ажилтны бүртгэлтэй таарсан байна."
                    : "Нэвтэрсэн email ажилтны бүртгэлд байхгүй бол профайл зөвхөн Google мэдээллээр харагдана."}
                </CardDescription>
              </CardHeader>
            </Card>

            {isSignedIn ? (
              <Card className="rounded-lg border-slate-200 bg-white">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-slate-700" />
                    Profile засах
                  </CardTitle>
                  <CardDescription>
                    {employee
                      ? "Өөрийн profile мэдээллээ засаж хадгална."
                      : "Employee record байхгүй байна. Мэдээллээ бөглөөд хадгалахад шинэ record үүснэ."}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-4" onSubmit={handleProfileSave}>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="edit-first-name">Нэр</Label>
                        <Input
                          id="edit-first-name"
                          value={profileForm.firstName}
                          onChange={(event) =>
                            updateProfileForm("firstName", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-last-name">Овог</Label>
                        <Input
                          id="edit-last-name"
                          value={profileForm.lastName}
                          onChange={(event) =>
                            updateProfileForm("lastName", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-first-name-eng">English нэр</Label>
                        <Input
                          id="edit-first-name-eng"
                          value={profileForm.firstNameEng}
                          onChange={(event) =>
                            updateProfileForm("firstNameEng", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-last-name-eng">English овог</Label>
                        <Input
                          id="edit-last-name-eng"
                          value={profileForm.lastNameEng}
                          onChange={(event) =>
                            updateProfileForm("lastNameEng", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={profileForm.email}
                          onChange={(event) =>
                            updateProfileForm("email", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-role">Role</Label>
                        <select
                          id="edit-role"
                          disabled={!isSuperAdmin}
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                          value={profileForm.role}
                          onChange={(event) =>
                            updateProfileForm("role", event.target.value)
                          }
                        >
                          <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                          <option value="IT_ADMIN">IT_ADMIN</option>
                          <option value="FINANCE">FINANCE</option>
                          <option value="EMPLOYEE">EMPLOYEE</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-department">Алба хэлтэс</Label>
                        <Input
                          id="edit-department"
                          value={profileForm.department}
                          onChange={(event) =>
                            updateProfileForm("department", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-branch">Салбар</Label>
                        <Input
                          id="edit-branch"
                          value={profileForm.branch}
                          onChange={(event) =>
                            updateProfileForm("branch", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-code">Ажилтны код</Label>
                        <Input
                          id="edit-code"
                          value={profileForm.employeeCode}
                          onChange={(event) =>
                            updateProfileForm("employeeCode", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-level">Түвшин</Label>
                        <Input
                          id="edit-level"
                          value={profileForm.level}
                          onChange={(event) =>
                            updateProfileForm("level", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-github">GitHub</Label>
                        <Input
                          id="edit-github"
                          value={profileForm.github}
                          onChange={(event) =>
                            updateProfileForm("github", event.target.value)
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-birthday">Төрсөн өдөр</Label>
                        <Input
                          id="edit-birthday"
                          value={profileForm.birthDayAndMonth}
                          onChange={(event) =>
                            updateProfileForm(
                              "birthDayAndMonth",
                              event.target.value,
                            )
                          }
                          placeholder="MM-DD"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="edit-image">Зургийн URL</Label>
                        <Input
                          id="edit-image"
                          value={profileForm.imageUrl}
                          onChange={(event) =>
                            updateProfileForm("imageUrl", event.target.value)
                          }
                        />
                      </div>
                    </div>

                    {editMessage ? (
                      <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        {editMessage}
                      </p>
                    ) : null}
                    {editError ? (
                      <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                        {editError}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      className="h-10 w-fit"
                      disabled={isSavingProfileForm}
                    >
                      {isSavingProfileForm ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Хадгалах
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
