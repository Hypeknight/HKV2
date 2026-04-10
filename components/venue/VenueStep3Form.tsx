'use client';

import { useMemo, useState } from 'react';

type Plan = {
  id: string;
  name: string;
  tier: string;
  duration_months: number;
  base_monthly_price: number;
  base_prepaid_price: number;
  included_event_posts: number;
};

type Props = {
  venueId: string;
  plans: Plan[];
  currentPlanId?: string | null;
  currentBillingMode?: string | null;
  currentLockIn?: boolean | null;
  currentFeatures?: {
    comments_enabled?: boolean;
    dj_requests_enabled?: boolean;
    linkdn_mode?: string;
    drink_menu_enabled?: boolean;
    rsvp_enabled?: boolean;
    table_service_enabled?: boolean;
    music_profile_enabled?: boolean;
    dress_code_enabled?: boolean;
    special_message_enabled?: boolean;
  } | null;
  action: (formData: FormData) => void;
};

export default function VenueStep3Form({
  venueId,
  plans,
  currentPlanId,
  currentBillingMode,
  currentLockIn,
  currentFeatures,
  action,
}: Props) {
  const [planId, setPlanId] = useState(currentPlanId || plans[0]?.id || '');
  const [billingMode, setBillingMode] = useState(currentBillingMode || 'monthly');
  const [lockIn, setLockIn] = useState(!!currentLockIn);

  const [commentsEnabled, setCommentsEnabled] = useState(!!currentFeatures?.comments_enabled);
  const [djRequestsEnabled, setDjRequestsEnabled] = useState(!!currentFeatures?.dj_requests_enabled);
  const [linkdnMode, setLinkdnMode] = useState(currentFeatures?.linkdn_mode || 'none');
  const [drinkMenuEnabled, setDrinkMenuEnabled] = useState(!!currentFeatures?.drink_menu_enabled);
  const [rsvpEnabled, setRsvpEnabled] = useState(!!currentFeatures?.rsvp_enabled);
  const [tableServiceEnabled, setTableServiceEnabled] = useState(!!currentFeatures?.table_service_enabled);
  const [musicProfileEnabled, setMusicProfileEnabled] = useState(!!currentFeatures?.music_profile_enabled);
  const [dressCodeEnabled, setDressCodeEnabled] = useState(!!currentFeatures?.dress_code_enabled);
  const [specialMessageEnabled, setSpecialMessageEnabled] = useState(!!currentFeatures?.special_message_enabled);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === planId),
    [plans, planId]
  );

  const addOnMonthly = useMemo(() => {
    return (
      (commentsEnabled ? 10 : 0) +
      (djRequestsEnabled ? 15 : 0) +
      (linkdnMode === 'lite' ? 75 : 0) +
      (linkdnMode === 'full' ? 250 : 0)
    );
  }, [commentsEnabled, djRequestsEnabled, linkdnMode]);

  const addOnPrepaid = useMemo(() => {
    return (
      (commentsEnabled ? 25 : 0) +
      (djRequestsEnabled ? 40 : 0) +
      (linkdnMode === 'lite' ? 150 : 0) +
      (linkdnMode === 'full' ? 500 : 0)
    );
  }, [commentsEnabled, djRequestsEnabled, linkdnMode]);

  const total = useMemo(() => {
    if (!selectedPlan) return 0;
    return billingMode === 'monthly'
      ? Number(selectedPlan.base_monthly_price || 0) + addOnMonthly
      : Number(selectedPlan.base_prepaid_price || 0) + addOnPrepaid;
  }, [selectedPlan, billingMode, addOnMonthly, addOnPrepaid]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <form action={action} className="grid gap-8">
          <input type="hidden" name="venue_id" value={venueId} />

          <div>
            <h2 className="text-2xl font-bold text-white">Choose a Plan</h2>
            <div className="mt-5 space-y-4">
              {plans.map((plan) => (
                <label
                  key={plan.id}
                  className="block rounded-3xl border border-white/10 bg-black/20 p-5 text-white"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="plan_definition_id"
                      value={plan.id}
                      checked={planId === plan.id}
                      onChange={() => setPlanId(plan.id)}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-semibold">{plan.name}</p>
                      <p className="mt-1 text-sm text-white/65">
                        {plan.tier} · {plan.duration_months} months
                      </p>
                      <p className="mt-2 text-sm text-accent">
                        ${Number(plan.base_monthly_price || 0).toFixed(2)}/mo or $
                        {Number(plan.base_prepaid_price || 0).toFixed(2)} prepaid
                      </p>
                      <p className="mt-1 text-sm text-white/65">
                        Includes {plan.included_event_posts} posted events
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Billing</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="billing_mode"
                    value="monthly"
                    checked={billingMode === 'monthly'}
                    onChange={() => setBillingMode('monthly')}
                  />
                  <span>Monthly</span>
                </div>
              </label>

              <label className="rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="billing_mode"
                    value="prepaid"
                    checked={billingMode === 'prepaid'}
                    onChange={() => setBillingMode('prepaid')}
                  />
                  <span>One-time / prepaid</span>
                </div>
              </label>
            </div>

            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 text-white">
              <input
                type="checkbox"
                name="lock_in"
                value="yes"
                checked={lockIn}
                onChange={(e) => setLockIn(e.target.checked)}
                className="mt-1"
              />
              <span className="text-sm text-white/80">
                Lock in this plan for the selected duration. Locked plans cannot change
                package/features during the term.
              </span>
            </label>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Features</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Toggle name="comments_enabled" label="Live comments" checked={commentsEnabled} onChange={setCommentsEnabled} />
              <Toggle name="dj_requests_enabled" label="DJ / Music requests" checked={djRequestsEnabled} onChange={setDjRequestsEnabled} />
              <Toggle name="drink_menu_enabled" label="Drink menu display" checked={drinkMenuEnabled} onChange={setDrinkMenuEnabled} />
              <Toggle name="rsvp_enabled" label="RSVP" checked={rsvpEnabled} onChange={setRsvpEnabled} />
              <Toggle name="table_service_enabled" label="Table service" checked={tableServiceEnabled} onChange={setTableServiceEnabled} />
              <Toggle name="music_profile_enabled" label="Music profile visibility" checked={musicProfileEnabled} onChange={setMusicProfileEnabled} />
              <Toggle name="dress_code_enabled" label="Dress code visibility" checked={dressCodeEnabled} onChange={setDressCodeEnabled} />
              <Toggle name="special_message_enabled" label="Special message visibility" checked={specialMessageEnabled} onChange={setSpecialMessageEnabled} />
            </div>

            <div className="mt-5 space-y-3">
              <p className="text-sm font-medium text-white">Linkd'N</p>
              {['none', 'lite', 'full'].map((mode) => (
                <label
                  key={mode}
                  className="block rounded-2xl border border-white/10 bg-black/20 p-4 text-white"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="linkdn_mode"
                      value={mode}
                      checked={linkdnMode === mode}
                      onChange={() => setLinkdnMode(mode)}
                    />
                    <span className="capitalize">{mode === 'none' ? 'No Linkd\'N' : mode}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-black/20 p-5 text-sm text-white/75">
            <p className="font-semibold text-white">Venue Listing Rules</p>
            <ul className="mt-3 space-y-2">
              <li>Venue listings remain drafts until payment activates the subscription.</li>
              <li>Public display depends on active subscription and venue visibility settings.</li>
              <li>Package upgrades may require prorated charges.</li>
              <li>Downgrades and removed features do not receive refunds.</li>
              <li>Refund and removal requests must go through HypeKnight customer service and admin review.</li>
              <li>Included event postings still follow HypeKnight event submission and moderation rules.</li>
            </ul>
          </div>

          <button
            type="submit"
            className="rounded-2xl bg-accent px-6 py-3 font-semibold text-black hover:opacity-90"
          >
            Save and Continue
          </button>
        </form>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
        <h2 className="text-2xl font-bold text-white">Live Summary</h2>
        <div className="mt-6 space-y-4">
          <Row label="Plan" value={selectedPlan?.name || '—'} />
          <Row label="Tier" value={selectedPlan?.tier || '—'} />
          <Row label="Duration" value={selectedPlan ? `${selectedPlan.duration_months} months` : '—'} />
          <Row label="Included events" value={selectedPlan ? String(selectedPlan.included_event_posts) : '—'} />
          <Row label="Billing mode" value={billingMode} />
          <Row label="Lock-in" value={lockIn ? 'Yes' : 'No'} />
          <Row label="Add-ons" value={billingMode === 'monthly' ? `$${addOnMonthly.toFixed(2)}` : `$${addOnPrepaid.toFixed(2)}`} />
          <div className="border-t border-white/10 pt-4">
            <Row
              label="Estimated total"
              value={`$${Number(total || 0).toFixed(2)}${billingMode === 'monthly' ? '/mo' : ''}`}
              strong
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white">
      <input
        type="checkbox"
        name={name}
        value="yes"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4"
      />
      <span>{label}</span>
    </label>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? 'text-lg font-semibold text-white' : 'text-sm text-white/75'}`}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}