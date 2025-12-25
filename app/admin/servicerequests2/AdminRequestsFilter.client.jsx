"use client";

import styles from "../../reform-report/ReformReport.module.css"; // [KT:SURGICAL:REFORM-THEME-SR2]
import useTranslation from "@/app/hooks/useTranslation";

const BASE_LABELS = {
  filterLabel: "Filter by status:",
  apply: "Apply",
  allOption: "All",
};

export default function AdminRequestsFilter({
  lang,
  statusOptions,
  statusFilter,
  debug,
}) {
  const { t } = useTranslation(BASE_LABELS, lang || "English");

  return (
    <div
      className={styles.card}
      style={{ margin: "12px 0", padding: "12px 16px" }}
    >
      <form
        method="GET"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <label htmlFor="status" className={styles.label}>
          {t.filterLabel}
        </label>

        <select
          id="status"
          name="status"
          defaultValue={statusFilter || "All"}
          className={styles.input}
          style={{ maxWidth: 260, minWidth: 180 }}
        >
          {(Array.isArray(statusOptions) ? statusOptions : []).map((opt) => {
            const value = opt || "";
            const label = opt === "All" ? t.allOption : opt || "—";

            return (
              <option key={value || "blank"} value={value}>
                {label}
              </option>
            );
          })}
        </select>

        <button type="submit" className={styles.navButton}>
          {t.apply}
        </button>

        {lang ? (
          <input type="hidden" name="lang" value={lang} />
        ) : null}
        {debug ? (
          <input type="hidden" name="debug" value={debug ? "1" : ""} />
        ) : null}
      </form>
    </div>
  );
}
