'use client'


import { displayContent } from '@/lib/display-content'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, ShieldCheck } from 'lucide-react'
import type { GatewayStatus } from '@/lib/payments'

type Props = {
  plans: { code: string; name: string; pricePkr: number; priceUsd: number; tier: string }[]
  gateways: GatewayStatus[]
  defaultPlanCode?: string
}

export function CheckoutPanel({ plans, gateways, defaultPlanCode }: Props) {
  const router = useRouter()
  const [planCode, setPlanCode] = useState(defaultPlanCode ?? plans[0]?.code ?? '')
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR')
  const [provider, setProvider] = useState(gateways.find(gateway => gateway.configured)?.provider ?? 'JAZZCASH')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const plan = plans.find(item => item.code === planCode)
  const activeGateway = gateways.find(gateway => gateway.provider === provider)
  const amount = currency === 'USD' ? plan?.priceUsd ?? 0 : plan?.pricePkr ?? 0
  // The Free Community tier costs nothing, so it skips gateway selection and is
  // activated server-side through the same fulfilment path the gateways use.
  const isFreePlan = Boolean(plan && plan.pricePkr === 0 && plan.priceUsd === 0)

  async function startCheckout() {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/memberships/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planCode, provider: isFreePlan ? 'FREE' : provider, currency: isFreePlan ? 'PKR' : currency })
      })

      const data = await response.json()

      if (response.status === 401) {
        router.push(`/login?next=/membership/checkout`)
        return
      }

      if (!response.ok) {
        setError(data?.error ?? 'Checkout could not be started.')
        return
      }

      if (data.redirectUrl) {
        if (data.autoSubmitForm) {
          submitGatewayForm(data.autoSubmitForm.endpoint, data.autoSubmitForm.fields)
          return
        }
        window.location.href = data.redirectUrl
        return
      }

      setError('Gateway did not return a redirect. Please contact support with your order reference.')
    } catch {
      setError('Network error while starting checkout. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function submitGatewayForm(endpoint: string, fields: Record<string, string>) {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = endpoint
    Object.entries(fields).forEach(([key, value]) => {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    })
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-extrabold text-slate-900">1. Choose your plan</h2>
          <div className="mt-4 space-y-3">
            {plans.map(item => (
              <label
                key={item.code}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${
                  planCode === item.code
                    ? 'border-primary bg-primary-50'
                    : 'border-slate-200 hover:border-primary-200'
                }`}
              >
                <input
                  type="radio"
                  name="plan"
                  value={item.code}
                  checked={planCode === item.code}
                  onChange={() => setPlanCode(item.code)}
                  className="mt-1"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">{displayContent(item.name)}</span>
                    <span className="font-extrabold text-primary">
                      {displayContent(currency === 'USD'
                        ? `$${item.priceUsd}`
                        : `PKR ${item.pricePkr.toLocaleString('en-PK')}`)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs uppercase tracking-wide text-slate-500">
                    {displayContent(item.tier)} tier · 12 months
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-extrabold text-slate-900">2. Select payment method</h2>
          {displayContent(isFreePlan ? (
            <p className="mt-4 rounded-xl border border-primary-100 bg-primary-50 p-4 text-sm leading-6 text-primary-900">
              <strong>No payment is required.</strong> The Free Community tier is activated instantly, no
              card, wallet or bank details are collected at any point.
            </p>
          ) : null)}
          <div className={`mt-4 grid gap-3 sm:grid-cols-2 ${isFreePlan ? 'pointer-events-none opacity-45' : ''}`}
            aria-hidden={isFreePlan || undefined}>
            {gateways.map(gateway => (
              <button
                key={gateway.provider}
                type="button"
                disabled={!gateway.configured}
                onClick={() => {
                  setProvider(gateway.provider)
                  if (!gateway.currencies.includes(currency)) setCurrency(gateway.currencies[0])
                }}
                className={`rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
                  provider === gateway.provider
                    ? 'border-primary bg-primary-50'
                    : 'border-slate-200 hover:border-primary-200'
                }`}
              >
                <span className="flex items-center gap-2 font-bold text-slate-900">
                  {displayContent(gateway.label)}
                  {displayContent(gateway.simulation ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      DEV
                    </span>
                  ) : null)}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{displayContent(gateway.description)}</span>
                {displayContent(!gateway.configured ? (
                  <span className="mt-2 flex items-center gap-1 text-[11px] font-bold text-rose-600">
                    <Lock size={12} /> Not configured yet
                  </span>
                ) : null)}
              </button>
            ))}
          </div>
        </section>

        <section className={`rounded-2xl border border-slate-100 bg-white p-6 shadow-card ${isFreePlan ? 'hidden' : ''}`}>
          <h2 className="text-lg font-extrabold text-slate-900">3. Currency</h2>
          <div className="mt-4 flex gap-3">
            {(['PKR', 'USD'] as const).map(item => {
              const supported = activeGateway?.currencies.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  disabled={!supported}
                  onClick={() => setCurrency(item)}
                  className={`rounded-lg border px-5 py-2.5 text-sm font-bold transition disabled:opacity-40 ${
                    currency === item ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-700'
                  }`}
                >
                  {displayContent(item)}
                </button>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            JazzCash and Easypaisa settle in PKR. Stripe handles both PKR and international USD cards.
          </p>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-2xl border border-primary-100 bg-primary p-6 text-white shadow-soft">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gold-300">Order summary</h2>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-primary-100">Plan</dt>
              <dd className="font-bold">{displayContent(plan?.name ?? '—')}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-primary-100">Duration</dt>
              <dd className="font-bold">12 months</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-primary-100">Gateway</dt>
              <dd className="font-bold">{displayContent(activeGateway?.label ?? '—')}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-white/20 pt-3 text-base">
              <dt className="font-bold">Total</dt>
              <dd className="font-extrabold text-gold-300">
                {displayContent(currency === 'USD' ? `$${amount.toLocaleString('en-US')}` : `PKR ${amount.toLocaleString('en-PK')}`)}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={startCheckout}
            disabled={busy || !plan || (!isFreePlan && !activeGateway?.configured)}
            className="focus-ring mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-gold font-bold text-white transition hover:bg-gold-600 disabled:opacity-60"
          >
            {displayContent(busy ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />)}
            {displayContent(busy
              ? isFreePlan
                ? 'Activating…'
                : 'Redirecting to gateway…'
              : isFreePlan
                ? 'Activate free membership'
                : 'Pay securely')}
          </button>

          {displayContent(error ? (
            <p role="alert" className="mt-4 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-100">
              {displayContent(error)}
            </p>
          ) : null)}

          <p className="mt-4 text-[11px] leading-5 text-primary-100">
            You are redirected to the payment provider&apos;s own secure page. PYPC never stores card or
            wallet credentials. Membership activates automatically once the provider confirms payment.
          </p>
        </div>
      </aside>
    </div>
  )
}
