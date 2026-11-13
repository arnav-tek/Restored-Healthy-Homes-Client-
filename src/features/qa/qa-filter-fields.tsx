export function QaFilterFields({
  query,
  categories,
  admin,
  statusName = "qaStatus",
  includeHidden = false,
}: {
  query: { q: string; category: string; qaStatus: string };
  categories: readonly { id: string; name: string }[];
  admin: boolean;
  statusName?: string;
  includeHidden?: boolean;
}) {
  return (
    <>
      <div className="search-field">
        <label htmlFor="workspace-qa-q">Q&A keyword</label>
        <input
          id="workspace-qa-q"
          name="q"
          maxLength={120}
          defaultValue={query.q}
        />
      </div>
      <div className="search-field">
        <label htmlFor="workspace-qa-category">Q&A category</label>
        <select
          id="workspace-qa-category"
          name="category"
          defaultValue={query.category}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {admin && (
        <div className="search-field">
          <label htmlFor="workspace-qa-status">Publication status</label>
          <select
            id="workspace-qa-status"
            name={statusName}
            defaultValue={query.qaStatus}
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
            {includeHidden && <option value="hidden">Hidden</option>}
          </select>
        </div>
      )}
    </>
  );
}
