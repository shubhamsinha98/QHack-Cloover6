import { useState } from "react";
import { registerUser, signInUser } from "../lib/api";

const PRODUCT_OPTIONS = ["Solar", "Heat pump", "Battery storage", "Wall box"];

function normalizeProducts(products) {
  if (products.includes("All products")) {
    return [...PRODUCT_OPTIONS];
  }

  return products.filter((product) => PRODUCT_OPTIONS.includes(product));
}

function InputField({ label, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-soft"
      />
    </label>
  );
}

export default function AuthPortal({ onAuthenticate }) {
  const [mode, setMode] = useState("welcome");
  const [statusText, setStatusText] = useState("Sign in or create an account to open your CRM workspace.");
  const [signInForm, setSignInForm] = useState({ name: "", organisation: "" });
  const [createForm, setCreateForm] = useState({ name: "", organisation: "", products: [] });
  const [submitting, setSubmitting] = useState(false);

  function toggleCreateProduct(product) {
    setCreateForm((current) => {
      const exists = current.products.includes(product);
      return {
        ...current,
        products: exists
          ? current.products.filter((item) => item !== product)
          : [...current.products, product],
      };
    });
  }

  async function handleSignInSubmit(event) {
    event.preventDefault();
    setSubmitting(true);

    try {
      const user = await signInUser({
        name: signInForm.name.trim(),
        organisation: signInForm.organisation.trim(),
      });
      setStatusText(`Welcome back, ${user.name}. Opening your customer workspace.`);
      onAuthenticate(user);
    } catch (error) {
      setStatusText(error.message || "Sign-in failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateSubmit(event) {
    event.preventDefault();
    const name = createForm.name.trim();
    const organisation = createForm.organisation.trim();
    const selectedProducts = normalizeProducts(createForm.products);

    if (!selectedProducts.length) {
      setStatusText("Select at least one product before creating the account.");
      return;
    }

    setSubmitting(true);

    try {
      const user = await registerUser({
        name,
        organisation,
        products: selectedProducts,
        inventory: {},
      });
      setStatusText(`Account created for ${user.name}. Opening your customer workspace.`);
      onAuthenticate(user);
    } catch (error) {
      setStatusText(error.message || "Account creation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[36px] border border-brand-line bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(238,243,255,0.94))] p-6 shadow-shell sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-line bg-brand-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep">
            CRM sign in
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Start in your installer workspace, then move into customers and briefings.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Sign in to open your customer list. New reps can create an account and land directly
            in the logged-in CRM layout.
          </p>

          <div className="mt-8 rounded-3xl border border-brand-line bg-white/90 px-5 py-4 text-sm text-slate-700">
            {statusText}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setMode("sign-in");
                setStatusText("Sign in with your name and organisation.");
              }}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                mode === "sign-in"
                  ? "bg-brand text-white shadow-[0_14px_30px_rgba(29,62,255,0.22)]"
                  : "border border-brand-line bg-white text-slate-700 hover:border-brand hover:text-brand-deep"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("create");
                setStatusText("Create your account and continue into customers.");
              }}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                mode === "create"
                  ? "bg-brand text-white shadow-[0_14px_30px_rgba(29,62,255,0.22)]"
                  : "border border-brand-line bg-white text-slate-700 hover:border-brand hover:text-brand-deep"
              }`}
            >
              Create account
            </button>
          </div>
        </section>

        <section className="rounded-[36px] border border-brand-line bg-white/95 p-6 shadow-shell sm:p-8">
          {mode === "sign-in" ? (
            <form onSubmit={handleSignInSubmit} className="grid gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
                  Registered user
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Sign in</h3>
              </div>
              <InputField
                label="Name"
                type="text"
                placeholder="Alex Morgan"
                value={signInForm.name}
                onChange={(event) => setSignInForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
              <InputField
                label="Organisation"
                type="text"
                placeholder="SunGrid Solutions"
                value={signInForm.organisation}
                onChange={(event) =>
                  setSignInForm((current) => ({ ...current, organisation: event.target.value }))
                }
                required
              />
              <button
                disabled={submitting}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(29,62,255,0.2)] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Signing in..." : "Open customer workspace"}
              </button>
            </form>
          ) : mode === "create" ? (
            <form onSubmit={handleCreateSubmit} className="grid gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep">
                  New user
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-900">Create account</h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Name"
                  type="text"
                  placeholder="Alex Morgan"
                  value={createForm.name}
                  onChange={(event) => setCreateForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
                <InputField
                  label="Organisation"
                  type="text"
                  placeholder="SunGrid Solutions"
                  value={createForm.organisation}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, organisation: event.target.value }))
                  }
                  required
                />
              </div>

              <fieldset className="grid gap-3">
                <legend className="text-sm font-semibold text-slate-900">
                  Which products do you deal with?
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[...PRODUCT_OPTIONS, "All products"].map((product) => {
                    const isChecked = createForm.products.includes(product);
                    return (
                      <label
                        key={product}
                        className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                          isChecked
                            ? "border-brand-line bg-brand-soft text-brand-deep"
                            : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCreateProduct(product)}
                          className="h-4 w-4 accent-brand"
                        />
                        <span>{product}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <button
                disabled={submitting}
                className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(29,62,255,0.2)] disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {submitting ? "Creating account..." : "Create account and enter CRM"}
              </button>
            </form>
          ) : (
            <div className="flex min-h-[280px] items-center justify-center rounded-3xl border border-dashed border-brand-line bg-[linear-gradient(180deg,#ffffff,#f8faff)] px-6 text-center text-sm leading-6 text-slate-500">
              Choose sign in or create account to begin.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
