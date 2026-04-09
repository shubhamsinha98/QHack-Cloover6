import { useEffect, useMemo, useState } from "react";

const PRODUCT_OPTIONS = ["Solar", "Heat pump", "Battery storage", "Wall box"];

function normalizeProducts(products) {
  if (products.includes("All products")) {
    return [...PRODUCT_OPTIONS];
  }

  return products.filter((product) => PRODUCT_OPTIONS.includes(product));
}

function buildWelcomeMessage(user) {
  if (user) {
    return `Welcome back ${user.name} from ${user.organisation}. Your inventory is ready, and the next step is to generate a sales briefing.`;
  }

  return "Welcome to DIGI ClOOVER. Sign in or create an account, set your product inventory, and then continue straight into the briefing workflow.";
}

function createInventoryTemplate(products, existingInventory = {}) {
  return products.reduce((inventory, product) => {
    const current = existingInventory[product] || { availability: "", timeline: "" };
    inventory[product] = {
      availability: current.availability || "",
      timeline: current.timeline || "",
    };
    return inventory;
  }, {});
}

function mapProductToInterest(product) {
  if (product === "Solar") {
    return "Solar panels";
  }

  if (product === "Battery storage") {
    return "Battery storage";
  }

  return product;
}

function InputField({ label, ...props }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        {...props}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
      />
    </label>
  );
}

function SectionHeading({ kicker, title }) {
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
        {kicker}
      </p>
      <h3 className="mt-1 text-xl font-semibold tracking-tight text-slate-900">{title}</h3>
    </div>
  );
}

export default function InstallerCRM({ onInventoryComplete }) {
  const [appState, setAppState] = useState({ users: [], currentUserId: null });
  const [view, setView] = useState("auth");
  const [statusText, setStatusText] = useState("Welcome. Choose how you want to continue.");
  const [signInForm, setSignInForm] = useState({ name: "", organisation: "" });
  const [createForm, setCreateForm] = useState({ name: "", organisation: "", products: [] });
  const [createInventory, setCreateInventory] = useState({});
  const [inventoryDraft, setInventoryDraft] = useState({});

  const currentUser = useMemo(
    () => appState.users.find((user) => user.id === appState.currentUserId) || null,
    [appState],
  );

  useEffect(() => {
    if (currentUser) {
      setInventoryDraft(createInventoryTemplate(currentUser.products, currentUser.inventory));
      setView("dashboard");
    } else if (view === "dashboard") {
      setView("auth");
    }
  }, [currentUser, view]);

  useEffect(() => {
    const normalizedProducts = normalizeProducts(createForm.products);

    if (!normalizedProducts.length) {
      setCreateInventory({});
      return;
    }

    setCreateInventory((current) => createInventoryTemplate(normalizedProducts, current));
  }, [createForm.products]);

  function findUserByCredentials(name, organisation) {
    return appState.users.find(
      (user) =>
        user.name.toLowerCase() === name.toLowerCase() &&
        user.organisation.toLowerCase() === organisation.toLowerCase(),
    );
  }

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

  function updateCreateInventory(product, field, value) {
    setCreateInventory((current) => ({
      ...current,
      [product]: {
        ...current[product],
        [field]: value,
      },
    }));
  }

  function updateEditInventory(product, field, value) {
    setInventoryDraft((current) => ({
      ...current,
      [product]: {
        ...current[product],
        [field]: value,
      },
    }));
  }

  function resetCreateFlow() {
    setCreateForm({ name: "", organisation: "", products: [] });
    setCreateInventory({});
  }

  function handleSignInSubmit(event) {
    event.preventDefault();
    const user = findUserByCredentials(signInForm.name.trim(), signInForm.organisation.trim());

    if (!user) {
      setStatusText("No registered user matched those details on this device.");
      return;
    }

    setAppState((current) => ({ ...current, currentUserId: user.id }));
    setStatusText("Dashboard loaded. Save inventory to continue to briefing.");
  }

  function handleCreateSubmit(event) {
    event.preventDefault();
    const name = createForm.name.trim();
    const organisation = createForm.organisation.trim();
    const selectedProducts = normalizeProducts(createForm.products);

    if (!selectedProducts.length) {
      setStatusText("Select at least one product before creating the account.");
      return;
    }

    if (findUserByCredentials(name, organisation)) {
      setStatusText("This user already exists on this device. Please sign in instead.");
      return;
    }

    const user = {
      id: `user-${Date.now()}`,
      name,
      organisation,
      products: selectedProducts,
      inventory: createInventoryTemplate(selectedProducts, createInventory),
    };

    setAppState((current) => ({
      users: [...current.users, user],
      currentUserId: user.id,
    }));
    resetCreateFlow();
    setStatusText("Account created. Review inventory, then continue to briefing.");
  }

  function handleSaveInventory(event) {
    event.preventDefault();

    if (!currentUser) {
      return;
    }

    setAppState((current) => ({
      ...current,
      users: current.users.map((user) =>
        user.id === currentUser.id ? { ...user, inventory: inventoryDraft } : user,
      ),
    }));
    setStatusText("Inventory updated. Opening the briefing page now.");
    onInventoryComplete?.({
      productInterest: mapProductToInterest(currentUser.products[0] || "Solar"),
      existingAssets:
        currentUser.products.length > 1 ? currentUser.products.join(", ") : currentUser.products[0] || "",
    });
  }

  function handleSignOut() {
    setAppState((current) => ({ ...current, currentUserId: null }));
    setView("auth");
    setStatusText("Signed out. Another user can sign in or create an account.");
  }

  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(253,246,238,0.88))] p-6 shadow-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Phone-first installer workflow
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                EnergyFlow Mobile CRM
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                {buildWelcomeMessage(currentUser)}
              </p>
            </div>
            <div className="rounded-full border border-emerald-100 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
              Voice playback is available only inside Coach Chat
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_0_8px_rgba(16,185,129,0.12)]" />
            <p className="text-sm text-slate-700">{statusText}</p>
          </div>
        </section>
      </div>

      {view === "auth" ? (
        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <SectionHeading kicker="Step 1" title="Choose access" />
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setView("sign-in");
                setStatusText("Sign in with your name and organisation.");
              }}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-sm"
            >
              <span className="block text-lg font-semibold text-slate-900">Sign in</span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                For registered users already saved on this device.
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setView("create");
                setStatusText("Create your account and choose your product portfolio.");
              }}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-sm"
            >
              <span className="block text-lg font-semibold text-slate-900">Create account</span>
              <span className="mt-2 block text-sm leading-6 text-slate-600">
                Set up a user profile, product focus, and inventory.
              </span>
            </button>
          </div>
        </section>
      ) : null}

      {view === "sign-in" ? (
        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <SectionHeading kicker="Registered user" title="Sign in" />
          <form onSubmit={handleSignInSubmit} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
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
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white">
                Continue to inventory
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignInForm({ name: "", organisation: "" });
                  setView("auth");
                  setStatusText("Welcome. Choose how you want to continue.");
                }}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {view === "create" ? (
        <section className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
          <SectionHeading kicker="New user" title="Create account" />
          <form onSubmit={handleCreateSubmit} className="grid gap-5">
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {[...PRODUCT_OPTIONS, "All products"].map((product) => {
                  const isChecked = createForm.products.includes(product);
                  return (
                    <label
                      key={product}
                      className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition ${
                        isChecked
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleCreateProduct(product)}
                        className="h-4 w-4 accent-emerald-600"
                      />
                      <span>{product}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {Object.keys(createInventory).length ? (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-slate-900">
                    Inventory availability and timeline
                  </h4>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Provide the current availability for each selected product. You can edit this later anytime.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {Object.entries(createInventory).map(([product, values]) => (
                    <article key={product} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <h5 className="text-base font-semibold text-slate-900">{product}</h5>
                      <div className="mt-3 grid gap-3">
                        <InputField
                          label="Current availability"
                          type="text"
                          placeholder="In stock, low stock, out of stock"
                          value={values.availability}
                          onChange={(event) =>
                            updateCreateInventory(product, "availability", event.target.value)
                          }
                          required
                        />
                        <InputField
                          label="Timeline for inventory"
                          type="text"
                          placeholder="Available now, 2 weeks, next month"
                          value={values.timeline}
                          onChange={(event) =>
                            updateCreateInventory(product, "timeline", event.target.value)
                          }
                          required
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <button className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white">
                Create account
              </button>
              <button
                type="button"
                onClick={() => {
                  resetCreateFlow();
                  setView("auth");
                  setStatusText("Welcome. Choose how you want to continue.");
                }}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Back
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {view === "dashboard" && currentUser ? (
        <div className="mt-5 grid gap-5">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <SectionHeading kicker="Profile" title={`Welcome, ${currentUser.name}`} />
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: "Name", value: currentUser.name },
                { label: "Organisation", value: currentUser.organisation },
                { label: "Products", value: currentUser.products.join(", ") },
                { label: "Inventory lines", value: String(currentUser.products.length) },
              ].map((item) => (
                <article key={item.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <strong className="block text-xs uppercase tracking-[0.1em] text-slate-500">
                    {item.label}
                  </strong>
                  <span className="mt-2 block text-sm font-semibold text-slate-900">
                    {item.value}
                  </span>
                </article>
              ))}
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Sign out
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-panel">
            <SectionHeading kicker="Step 2" title="Inventory" />
            <p className="mb-4 text-sm leading-6 text-slate-600">
              Save inventory details to continue to the briefing page.
            </p>
            <form onSubmit={handleSaveInventory} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                {currentUser.products.map((product) => (
                  <article key={product} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h4 className="text-base font-semibold text-slate-900">{product}</h4>
                    <div className="mt-3 grid gap-3">
                      <InputField
                        label="Current availability"
                        type="text"
                        value={inventoryDraft[product]?.availability || ""}
                        onChange={(event) =>
                          updateEditInventory(product, "availability", event.target.value)
                        }
                        required
                      />
                      <InputField
                        label="Timeline for inventory"
                        type="text"
                        value={inventoryDraft[product]?.timeline || ""}
                        onChange={(event) =>
                          updateEditInventory(product, "timeline", event.target.value)
                        }
                        required
                      />
                    </div>
                  </article>
                ))}
              </div>
              <div>
                <button className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white">
                  Save inventory and open briefing
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </section>
  );
}
