import { Link } from "react-router-dom";
import logo from "../assets/klickit-logo.png";
import { isCurrentUserAdmin } from "../utils/auth";

export default function Sidebar({ activePage, branchRows, statusRows, mobileOpen, onCloseMobile }) {
  const isAdmin = isCurrentUserAdmin();

  return (
    <>
      <aside className={`sidebar${mobileOpen ? " is-open" : ""}`} id="sidebar">
        <div className="brand" onClick={onCloseMobile}>
          <img className="brand__mark" src={logo} alt="KLICKIT logo" width="60" height="60" />
        </div>

        <nav className="nav">
          <div className="nav__label">Overview</div>
          <Link
            className={`nav__item${activePage === "dashboard" ? " is-active" : ""}`}
            to="/"
            onClick={() => onCloseMobile?.()}
          >
            <span className="nav__dot"></span> Dashboard
          </Link>
          {isAdmin && (
            <Link
              className={`nav__item${activePage === "analytics" ? " is-active" : ""}`}
              to="/analytics"
              onClick={() => onCloseMobile?.()}
            >
              <span className="nav__dot"></span> Analytics
            </Link>
          )}

          <div className="nav__label">Branches</div>
          <div className="branch-list" id="branchList">
            {branchRows.map((row) => (
              <div
                key={row.key}
                className={`branch-row${row.slug ? ` branch-${row.slug}` : ""}${row.isAll ? " branch-all" : ""}${row.active ? " is-active" : ""}`}
                onClick={() => {
                  row.onClick?.();
                  onCloseMobile?.();
                }}
              >
                <span className="branch-row__left">
                  <span className={`branch-row__initial${row.slug ? ` branch-badge branch-${row.slug}` : ""}`}>
                    {row.initial}
                  </span>{" "}
                  {row.label}
                </span>
                <span className="branch-row__count">{row.count}</span>
              </div>
            ))}
          </div>

          <div className="nav__label">Status Queue</div>
          <div className="status-list" id="statusList">
            {statusRows.map((row) => (
              <div
                key={row.key}
                className={`status-row${row.active ? " is-active" : ""}`}
                onClick={() => {
                  row.onClick?.();
                  onCloseMobile?.();
                }}
              >
                <span className="status-row__left">
                  <span className="status-row__swatch" style={{ background: row.swatch }}></span> {row.label}
                </span>
                <span className="status-row__count">{row.count}</span>
              </div>
            ))}
          </div>
        </nav>

        <div className="sidebar__foot">
          <div className="sidebar__foot-row">Andheri &middot; Thane &middot; Dadar &middot; Vashi</div>
          <div className="sidebar__foot-row muted">info@klickit.co.in</div>
        </div>
      </aside>

      <div
        className={`sidebar-backdrop${mobileOpen ? " is-open" : ""}`}
        id="sidebarBackdrop"
        onClick={onCloseMobile}
      ></div>
    </>
  );
}
