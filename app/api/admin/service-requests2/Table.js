// app/admin/service-requests2/Table.jsx
'use client';

export default function Table({ rows, labels }) {
  const L = labels || {};
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-800 text-slate-100">
          <tr>
            <Th>{L.type || 'Type'}</Th>
            <Th>{L.description || 'Description'}</Th>
            <Th>{L.name || 'Name'}</Th>
            <Th>{L.department || 'Department'}</Th>
            <Th>{L.email || 'Email'}</Th>
            <Th>{L.created || 'Created'}</Th>
            <Th>{L.status || 'Status'}</Th>
            <Th>{L.resolution || 'Resolution'}</Th>
            <Th>{L.comments || 'Comments'}</Th>
          </tr>
        </thead>
        <tbody className="bg-slate-900 text-slate-100">
          {(rows || []).map((r) => (
            <tr key={r.id} className="border-t border-slate-700">
              <Td>{r.type}</Td>
              <Td>{r.description}</Td>
              <Td>{r.name}</Td>
              <Td>{r.department}</Td>
              <Td>{r.email}</Td>
              <Td>{r.created}</Td>
              <Td>{r.status}</Td>
              <Td>{r.resolution}</Td>
              <Td>{r.comments}</Td>
            </tr>
          ))}
          {(!rows || rows.length === 0) && (
            <tr>
              <td colSpan={9} className="px-3 py-4 text-center text-slate-400">
                —
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function Th({ children }) {
  return <th className="px-3 py-2 text-left font-semibold">{children}</th>;
}
function Td({ children }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}
