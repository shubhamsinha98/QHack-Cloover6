import FinancingReport from "./FinancingReport";

export default function FinancingWorkspace({
  customers,
  selectedCustomer,
  leadData,
  briefing,
  onSelectCustomer,
  onBackToList,
  onDeleteCustomerReport,
}) {
  if (!selectedCustomer || !briefing) {
    return (
      <section className="grid gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
            Financing workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Finance reports by customer ID
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Open the financing report for a customer and walk through invoice lines, payment options, and 10-year savings.
          </p>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <div className="grid gap-4">
            {customers.length ? (
              customers.map((customer) => (
                <article key={customer.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{customer.customerCode}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {customer.postcode} • {customer.productInterest}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectCustomer(customer)}
                      disabled={customer.reportStatus !== "ready"}
                      className="rounded-full border border-brand-line bg-white px-4 py-2 text-sm font-semibold text-brand-deep disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                    >
                      {customer.reportStatus === "ready" ? "Open finance report" : "Report not ready"}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{customer.address}</p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No customers yet. Add a customer in the Customers tab to generate the first report.
              </div>
            )}
          </div>
        </section>
      </section>
    );
  }

  return (
    <FinancingReport
      customer={selectedCustomer}
      leadData={leadData}
      briefing={briefing}
      onBack={onBackToList}
      onDelete={() => onDeleteCustomerReport(selectedCustomer.id)}
    />
  );
}
