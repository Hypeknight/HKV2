'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  COMMUNITY_PULSE_NOTICE_VERSION,
  parseCommunityPulseSubmission,
  type CommunityPulseQuestion, type CommunityPulseResponseInput,
} from '@/lib/community-pulse/contracts';

type Participant =
  | { state: 'loading' | 'sign_in_required' | 'none' | 'unavailable' }
  | { state: 'selected'; optionId: string; revision: number };
const messages: Record<string, string> = {
  accepted: 'Your response is saved.',
  closed: 'This question is no longer accepting responses. Refresh to see its current status.',
  ineligible: 'Your account cannot answer this question.',
  invalid: 'This answer could not be accepted. Refresh the question and try again.',
  rate_limited: 'Please wait a minute before trying again.',
  revision_conflict: 'Your response changed elsewhere. Refresh to load your latest choice.',
  operation_conflict: 'This request conflicts with an earlier response. Refresh before trying again.',
  guest_response_exists: 'A response is already associated with this question.',
  unavailable: 'We could not confirm whether your response was saved. Retry this same answer or refresh to check.',
};

export default function CommunityPulseCard({ question, scopeLabel, city, state }: {
  question: CommunityPulseQuestion; scopeLabel: string; city: string; state: string;
}) {
  const [participant, setParticipant] = useState<Participant>({ state: 'loading' });
  const [selected, setSelected] = useState('');
  const [consent, setConsent] = useState(false);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<CommunityPulseResponseInput | null>(null);
  const [message, setMessage] = useState('');
  const home = (city || state ? '/?' + new URLSearchParams({ city, state }) : '/') + '#community-pulse';
  const report = question.report;
  const revision = participant.state === 'selected' ? participant.revision : 0;
  const canAnswer = participant.state === 'none' || participant.state === 'selected';

  useEffect(() => {
    let active = true;
    if (!question.acceptingResponses) return;
    fetch('/api/community-pulse/state?' + new URLSearchParams({ question: question.id }), {
      cache: 'no-store', credentials: 'same-origin',
    }).then(response => response.json()).then(value => {
      if (!active) return;
      if (value.state === 'selected' && question.options.some(o => o.id === value.optionId) &&
          Number.isInteger(value.revision) && value.revision >= 1 && value.revision <= 6) {
        setParticipant({ state: 'selected', optionId: value.optionId, revision: value.revision });
        setSelected(value.optionId);
      } else if (value.state === 'none' || value.state === 'sign_in_required') {
        setParticipant({ state: value.state });
      } else setParticipant({ state: 'unavailable' });
    }).catch(() => { if (active) setParticipant({ state: 'unavailable' }); });
    return () => { active = false; };
  }, [question.id, question.acceptingResponses, question.options]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending || !canAnswer || !question.acceptingResponses || !selected || !consent || revision >= 6) return;
    const request = pending ?? {
      questionId: question.id, optionId: selected, operationId: crypto.randomUUID(),
      expectedRevision: revision, noticeVersion: COMMUNITY_PULSE_NOTICE_VERSION,
    };
    setPending(request);
    setSending(true);
    setMessage('');
    try {
      const response = await fetch('/api/community-pulse', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const raw = await response.json();
      if (raw.state === 'sign_in_required') {
        setParticipant({ state: 'sign_in_required' });
        setMessage('Please sign in again to continue.');
        return;
      }
      const result = parseCommunityPulseSubmission(raw);
      setMessage(messages[result.state] || messages.unavailable);
      if (result.state === 'accepted') {
        setParticipant({ state: 'selected', optionId: request.optionId, revision: result.revision });
        setSelected(request.optionId);
        setPending(null);
        setConsent(false);
      } else if (result.state !== 'unavailable' && result.state !== 'rate_limited') {
        setPending(null);
        setParticipant({ state: 'unavailable' });
      }
    } catch { setMessage(messages.unavailable); }
    finally { setSending(false); }
  }

  return <aside id="community-pulse" className="sc-community sc-community-early" aria-labelledby="sc-community-title">
    <div className="sc-community-heading"><p className="sc-label">COMMUNITY PULSE · {scopeLabel}</p>
      <h2 id="sc-community-title">Your city has a Pulse.<br /><em>Add yours.</em></h2>
      <p className="sc-small-note">Voluntary community choices. Question version {question.version}.</p></div>
    <div className="sc-community-question">
      <h3>{question.prompt}</h3>{question.description ? <p>{question.description}</p> : null}
      {question.acceptingResponses ? <>
        {participant.state === 'loading' ? <p role="status">Checking your response…</p> : null}
        {participant.state === 'sign_in_required' ? <p><Link className="sc-button sc-button-secondary"
          href={'/auth/login?' + new URLSearchParams({ next: home })}>Sign in to answer</Link></p> : null}
        {participant.state === 'unavailable' ? <p role="status">Your response state is unavailable. <a href={home}>Refresh to check</a></p> : null}
        {canAnswer ? <form onSubmit={submit} aria-busy={sending}>
          <fieldset disabled={sending || pending !== null || revision >= 6} aria-describedby="community-pulse-notice">
            <legend className="sr-only">{question.prompt}</legend>
            <div className="sc-question-options">{question.options.map(option => <label key={option.id}>
              <input type="radio" name="community-choice" value={option.id} checked={selected === option.id}
                onChange={() => setSelected(option.id)} required /><span>{option.label}</span>
            </label>)}</div>
          </fieldset>
          {participant.state === 'selected' ? <p className="sc-small-note">Your saved choice is {question.options.find(o => o.id === participant.optionId)?.label}. {revision >= 6 ? 'You have reached the change limit for this question.' : 'Choose another option to change your response.'}</p> : null}
          <p id="community-pulse-notice" className="sc-small-note">Your choice is stored with your signed-in HypeKnight account. Published results summarize voluntary responses. Your account is not displayed publicly. The display threshold does not guarantee anonymity.</p>
          <label className="cp-consent"><input type="checkbox" checked={consent} disabled={sending || pending !== null}
            onChange={event => setConsent(event.target.checked)} required /><span>I have read this notice and agree to submit my choice.</span></label>
          <button className="sc-button sc-button-secondary" type="submit" disabled={sending || !consent || !selected ||
            revision >= 6 || (participant.state === 'selected' && selected === participant.optionId && pending === null)}>
            {sending ? 'Saving…' : pending ? 'Retry this answer' : participant.state === 'selected' ? 'Update my response' : 'Add my response'}
          </button>
        </form> : <ul className="cp-choice-preview">{question.options.map(option => <li key={option.id}>{option.label}</li>)}</ul>}
      </> : <><p className="sc-small-note">Responses are closed or paused for this question.</p><ul className="cp-choice-preview">{question.options.map(option => <li key={option.id}>{option.label}</li>)}</ul></>}
      {message ? <p role="status" aria-live="polite" className="sc-small-note">{message}</p> : null}
    </div>
    <details className="sc-results-explainer"><summary>Community results</summary>
      {report.state === 'available' ? <>
        <p>{report.total} effective responses in this question’s complete sample.</p>
        <dl className="cp-results">{report.options.map(row => <div key={row.optionId}>
          <dt>{question.options.find(o => o.id === row.optionId)?.label}</dt>
          <dd>{row.count} · {row.percentage}%</dd></div>)}</dl>
      </> : <p>{report.state === 'pending' ? 'Final results are published after an editor closes the question.' :
        report.state === 'insufficient' ? 'The sample is too small to publish results. Counts and percentages are withheld.' :
        'Complete results are temporarily unavailable.'}</p>}
      {'sealedAt' in report ? <p className="sc-small-note">Collection period {report.periodStart} to {report.periodEnd}. Results sealed {report.sealedAt}.</p> : null}
      <p className="sc-small-note">These choices describe voluntary responses to this question. Small samples are withheld. The display threshold does not guarantee anonymity.</p>
    </details>
  </aside>;
}
