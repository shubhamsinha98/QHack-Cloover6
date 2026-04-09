import Briefing from "./Briefing";
import BriefingAssumptionsPanel from "./BriefingAssumptionsPanel";

export default function BriefingWorkspace({
  customers,
  selectedCustomer,
  leadData,
  briefing,
  loading,
  error,
  onSelectCustomer,
  onBackToList,
  onRetry,
  onRegenerateCustomer,
  onDeleteCustomerReport,
}) {
  if (!selectedCustomer && !loading && !error) {
    return (
      <section className="grid gap-5">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
            Briefing workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
            Customer reports
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Select a customer with a ready report to open the briefing here. Use the back button from any report to return to this list.
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
                      {customer.reportStatus === "ready"
                        ? "Open report"
                        : customer.reportStatus === "error"
                          ? "Report failed"
                          : "Generating..."}
                    </button>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{customer.address}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                    {customer.houseType ? <span>{customer.houseType}</span> : null}
                    {customer.roofType ? <span>{customer.roofType}</span> : null}
                  </div>
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

  if (selectedCustomer && !loading && !error && !briefing) {
    return (
      <div className="grid gap-5">
        <BriefingAssumptionsPanel
          leadData={leadData}
          loading={loading}
          onRegenerate={onRegenerateCustomer}
        />
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
                Briefing workspace
              </p>
              <h3 className="mt-2 text-xl font-semibold text-slate-900">
                Report not available yet for {selectedCustomer.customerCode}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Try regenerating the report or return to the customer list.
              </p>
            </div>
            <button
              type="button"
              onClick={onBackToList}
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
            >
              ← Back to customer reports
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <BriefingAssumptionsPanel
        leadData={leadData}
        loading={loading}
        onRegenerate={onRegenerateCustomer}
      />
      {selectedCustomer ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onDeleteCustomerReport(selectedCustomer.id)}
            className="rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
          >
            Delete customer report
          </button>
        </div>
      ) : null}
      <Briefing
        leadData={leadData}
        briefing={briefing}
        loading={loading}
        error={error}
        onNewLead={onBackToList}
        onRetry={onRetry}
        actionLabel="← Back to customer reports"
      />
    </div>
  );
}
