import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { crumbsFor } from "@/components/breadcrumb-routes";
import { hasRole, useAuthStore } from "@/stores/auth";

/** Breadcrumb topbar sinh từ route hiện tại. Mobile chỉ hiện mục cuối. */
export function AppBreadcrumb() {
  const { pathname } = useLocation();
  const isAdmin = hasRole(useAuthStore((s) => s.user), "admin");
  const crumbs = crumbsFor(pathname, isAdmin);
  if (crumbs.length === 0) return null;

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem className={last ? undefined : "hidden md:inline-flex"}>
                {last ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : crumb.href ? (
                  <BreadcrumbLink asChild><Link to={crumb.href}>{crumb.label}</Link></BreadcrumbLink>
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
