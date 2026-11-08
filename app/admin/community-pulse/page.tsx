import Link from 'next/link';
import { requireAdministrator } from '@/lib/admin/control-center';
import { communityPulseEnabled } from '@/lib/community-pulse/home';
import { loadCommunityEditor } from '@/lib/community-pulse/editor';
import { createCommunityQuestion, transitionCommunityQuestion, selectCommunityHomeQuestion, maintainCommunityQuestions } from './actions';

export const dynamic = 'force-dynamic';

const feedback: Record<string, string> = {
  created: 'Draft created. Review it below before publishing.',
  updated: 'Question lifecycle updated.',
  home_updated: 'Homepage selection updated.',
  maintained: 'Expired questions and eligible retention records were processed. Run again if more than 50 records were pending.',
  invalid: 'Check the form fields, dates, and any required confirmation.',
  unavailable: 'The operation could not be confirmed. Refresh before trying again.',
  transition_failed: 'The question could not move to that state. Refresh and check its current status and dates.',
  selection_failed: 'Homepage selection failed. Publish the question first and use signed-in participation.',
  disabled: 'Community Pulse activation is disabled in this environment.',
};
const stamp = (value: string) => new Date(value).toISOString().replace('T', ' ').replace('.000Z', ' UTC');

export default async function CommunityPulseAdmin({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdministrator();
  if (!communityPulseEnabled()) return <div className="hk-admin-page"><header className="hk-admin-heading">
    <p className="hk-admin-eyebrow">Participation</p><h1>Community Pulse</h1>
    <p>Community Pulse is awaiting activation review in this environment.</p>
  </header></div>;
  const params = await searchParams;
  const result = await loadCommunityEditor();
  if (result.state !== 'available') return <div className="hk-admin-page"><h1>Community Pulse</h1>
    <p role="status">Question management is temporarily unavailable. Its database foundation and permissions must be available.</p>
    <a href="/admin/community-pulse">Retry question management</a></div>;
  const { questions, markets, areas, total } = result.editor;
  const now = Date.now();

  return <div className="hk-admin-page cp-admin">
    <header className="hk-admin-heading"><p className="hk-admin-eyebrow">Participation · Community questions</p>
      <h1>Ask the community.</h1><p>Create a question, preview its choices, then decide when and where to publish it.</p>
      <p className="hk-admin-detail">Public results become available after closure when the complete sample supports display. Questions collect voluntary preferences.</p>
      <div className="hk-admin-actions"><Link href="/#community-pulse">View homepage Pulse</Link><Link href="/admin/patron-pulse">Event Patron Pulse</Link></div>
    </header>
    {params.status && feedback[params.status] ? <p role="status" className="hk-admin-notice">{feedback[params.status]}</p> : null}
    <section className="hk-admin-panel"><h2>Create a draft</h2>
      <p>Single choice, signed-in participation. Published wording and choices are fixed. For a correction, archive a draft and create a replacement.</p>
      <form action={createCommunityQuestion} className="cp-editor-form">
        <label>Question<input name="prompt" minLength={5} maxLength={180} required /></label>
        <label>Optional description<textarea name="description" maxLength={500} rows={2} /></label>
        <label>Choices, one per line<textarea name="options" rows={4} maxLength={490} required
          placeholder={'Live music\nDancing\nA relaxed atmosphere\nSomething different'} /></label>
        <p className="hk-admin-detail">Use two to six distinct choices, each up to 80 characters. Avoid sensitive demographic questions and free-form answers.</p>
        <label>Question scope<select name="marketId" defaultValue=""><option value="">Across HypeKnight</option>
          {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
        <div className="cp-editor-pair"><label>Optional city within that market<input name="city" maxLength={100} list="community-registry-cities" /></label>
          <label>State for that city<input name="state" maxLength={50} /></label></div>
        <datalist id="community-registry-cities">{areas.map(a => <option key={a.marketId + a.city + a.state} value={a.city}>{a.state}</option>)}</datalist>
        <p className="hk-admin-detail">A city and state must belong to the selected registry market. This sets the question’s location context.</p>
        <div className="cp-editor-pair"><label>Opens · UTC<input type="datetime-local" name="opensAt" required /></label>
          <label>Closes · UTC<input type="datetime-local" name="closesAt" required /></label></div>
        <p className="hk-admin-detail">Closing must be after opening and within 30 days. Future openings use Schedule. Open now requires the current time to be inside the window.</p>
        <button type="submit">Create draft</button>
      </form>
    </section>
    <section aria-labelledby="community-question-list"><h2 id="community-question-list">Question workspace</h2>
      <p className="hk-admin-detail">Showing the newest {questions.length} of {total} questions.</p>
      {!questions.length ? <p className="hk-admin-notice mt-4">No community questions have been created.</p> : null}
      <div className="mt-4 grid gap-4">{questions.map(q => {
        const inside = now >= Date.parse(q.opensAt) && now < Date.parse(q.closesAt);
        const before = now < Date.parse(q.opensAt);
        return <article key={q.id} className="hk-admin-panel">
          <p className="hk-admin-eyebrow">{q.status} · Version {q.version}{q.selectedForHome ? ' · Selected for homepage' : ''}</p>
          <h3 className="my-2 text-xl font-semibold">{q.prompt}</h3>
          {q.description ? <p>{q.description}</p> : null}
          <p className="hk-admin-detail">{q.marketId ? markets.find(m => m.id === q.marketId)?.name || 'Registry market' : 'Across HypeKnight'}{q.city ? ' · ' + q.city + ', ' + q.state : ''}</p>
          <p className="hk-admin-detail">Opens {stamp(q.opensAt)} · Closes {stamp(q.closesAt)}</p>
          <details className="mt-3"><summary className="cp-editor-summary">Preview choices and recent editorial history</summary>
            <ul className="my-3 list-inside list-disc">{q.options.map(o => <li key={o.id}>{o.label}</li>)}</ul>
            <ul className="hk-admin-detail">{q.audit.map((a, i) => <li key={i}>{stamp(a.at)} · {a.action.replaceAll('_', ' ')}</li>)}</ul>
          </details>
          <div className="cp-editor-actions">
            {q.status === 'draft' && before ? <Transition id={q.id} status="scheduled" label="Schedule" /> : null}
            {['draft', 'scheduled', 'paused'].includes(q.status) && inside ? <Transition id={q.id} status="open" label="Open responses" /> : null}
            {['scheduled', 'open'].includes(q.status) && now < Date.parse(q.closesAt) ? <Transition id={q.id} status="paused" label="Pause responses" /> : null}
            {['draft', 'closed'].includes(q.status) || (['scheduled', 'paused'].includes(q.status) && before) ? <Transition id={q.id} status="archived" label="Archive question" /> : null}
            {!q.guestsAllowed && !['draft', 'archived'].includes(q.status) ? <form action={selectCommunityHomeQuestion}>
              <input type="hidden" name="questionId" value={q.id} /><input type="hidden" name="selected" value={q.selectedForHome ? 'no' : 'yes'} />
              <button type="submit">{q.selectedForHome ? 'Remove from homepage' : 'Select for homepage'}</button>
            </form> : null}
          </div>
          {['scheduled', 'open', 'paused'].includes(q.status) && now >= Date.parse(q.opensAt) ? <form action={transitionCommunityQuestion} className="mt-4">
            <input type="hidden" name="questionId" value={q.id} /><input type="hidden" name="nextStatus" value="closed" />
            <label className="cp-admin-confirm"><input type="checkbox" name="confirmClose" value="yes" required />
              <span>Close permanently and publish final results if the sample supports display.</span></label>
            <button type="submit">Close question and seal results</button>
          </form> : null}
          {q.guestsAllowed ? <p className="hk-admin-notice mt-3">This question permits guests in the foundation. It is excluded from this signed-in homepage release.</p> : null}
        </article>;
      })}</div>
    </section>
    <section className="hk-admin-panel"><h2>Expiry and retention</h2>
      <p>Close up to 50 expired questions, purge up to 50 sealed samples past their 90-day retention window, and remove expired request counters. Published aggregate snapshots are retained.</p>
      <form action={maintainCommunityQuestions} className="mt-3">
        <label className="cp-admin-confirm"><input type="checkbox" name="confirmMaintenance" value="yes" required /><span>I authorize this closure and retention run.</span></label>
        <button type="submit">Process expired questions and retention</button>
      </form>
    </section>
  </div>;
}

function Transition({ id, status, label }: { id: string; status: string; label: string }) {
  return <form action={transitionCommunityQuestion}><input name="questionId" type="hidden" value={id} />
    <input name="nextStatus" type="hidden" value={status} /><button type="submit">{label}</button></form>;
}
