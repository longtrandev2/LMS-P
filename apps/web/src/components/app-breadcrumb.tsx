import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { crumbsFor, routeParams } from "@/components/breadcrumb-routes";
import { api } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { hasRole, useAuthStore } from "@/stores/auth";
import type { AssignmentDetails, ClassSummary, Paginated } from "@/types/api";

/**
 * Tên lớp/bài cho breadcrumb — dùng đúng query key mà các trang đang dùng nên thường lấy từ cache,
 * không phát sinh request mới.
 */
function useCrumbNames(pathname: string) {
  const params = routeParams(pathname);
  const isStudentArea = pathname.startsWith("/me/classes/");
  const classId = params.classId;
  const assignmentId = Number(params.assignmentId);
  const lecturerClass = useQuery({
    queryKey: queryKeys.classes.detail(classId ?? ""),
    queryFn: ({ signal }) => api.get<ClassSummary>(`/classes/${classId}`, undefined, signal),
    enabled: !!classId && !isStudentArea, staleTime: 60_000,
  });
  const myClasses = useQuery({
    queryKey: queryKeys.me.classes(),
    queryFn: async ({ signal }) => {
      const data = await api.get<ClassSummary[] | Paginated<ClassSummary>>("/me/classes", { page: 1, limit: 50 }, signal);
      return Array.isArray(data) ? data : data.items;
    },
    enabled: !!classId && isStudentArea, staleTime: 60_000,
  });
  const assignment = useQuery({
    queryKey: queryKeys.assignments.details(assignmentId),
    queryFn: ({ signal }) => api.get<AssignmentDetails>(`/assignments/${assignmentId}`, undefined, signal),
    enabled: Number.isFinite(assignmentId) && assignmentId > 0, staleTime: 60_000,
  });
  const className = isStudentArea
    ? myClasses.data?.find((item) => String(item.id) === classId)?.name
    : lecturerClass.data?.name;
  return { className, assignmentTitle: assignment.data?.assignment.title };
}

/** Breadcrumb topbar kiểu Frappe: mục cha nhạt, trang hiện tại đậm; mobile chỉ hiện mục cuối. */
export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const isAdmin = hasRole(useAuthStore((s) => s.user), "admin");
  const crumbs = crumbsFor(pathname, isAdmin, useCrumbNames(pathname));
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className={last ? "min-w-0" : "hidden md:inline-flex"}>
                {last ? (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink asChild><Link to={crumb.href} className="max-w-48 truncate">{crumb.label}</Link></BreadcrumbLink>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </BreadcrumbItem>
              {last ? null : <BreadcrumbSeparator className="hidden md:inline-flex" />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
