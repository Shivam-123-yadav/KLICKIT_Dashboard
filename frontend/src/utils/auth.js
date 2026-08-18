import { BRANCHES } from "./constants";

export function getStoredTheme() {
  return localStorage.getItem("klickit-theme") || "dark";
}

export function setStoredTheme(theme) {
  localStorage.setItem("klickit-theme", theme);
}

export function getCurrentUserName() {
  return localStorage.getItem("username") || "User";
}

export function getCurrentUserBranch() {
  return localStorage.getItem("branch") || "";
}

export function getCurrentUserRole() {
  return localStorage.getItem("role") || "";
}

export function isCurrentUserAdmin() {
  return getCurrentUserRole() === "admin";
}

export function isCurrentUserViewer() {
  return getCurrentUserRole() === "viewer";
}

export function getVisibleBranches() {
  const role = getCurrentUserRole();
  const branch = getCurrentUserBranch();

  if (role === "admin" || role === "viewer" || branch === "Andheri") {
    return BRANCHES;
  }

  if (!branch) {
    return [];
  }

  return BRANCHES.filter((b) => b === branch);
}

export function isAuthenticated() {
  return Boolean(localStorage.getItem("access_token"));
}

export async function logoutUser() {
  const refreshToken = localStorage.getItem("refresh_token");

  try {
    if (refreshToken) {
      await fetch("/api/auth/logout/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({ refresh: refreshToken }),
      });
    }
  } catch (error) {
    console.error("Logout failed:", error);
  } finally {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("branch");
    window.location.replace("/login");
  }
}
