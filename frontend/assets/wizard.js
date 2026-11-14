/**
 * Shared multi-step form shell: step header + progress bar + step chips, sectioned cards with a
 * coloured edge, sub-panels, a live preview card, and a Wizard / All-in-one toggle.
 * Theme tokens only (see the `.wz` block in signin-styles.css).
 *
 *   <FormWizard steps=[{id,label,icon,title,desc,content}] step setStep mode setMode preview footer… />
 * Every step's content stays MOUNTED (hidden when inactive) so uncontrolled inputs still submit.
 */
import { Ft as ReactHooks, vt as Icon, yt as jsxRuntime } from './ui-D4_WaMI9.js';

const { useState } = ReactHooks();
const runtime = jsxRuntime();
const jsx = runtime.jsx;
const jsxs = runtime.jsxs;

const MODE_KEY = 'tessly:formMode';

export function useFormMode() {
  const [mode, setModeState] = useState(() => {
    try { return localStorage.getItem(MODE_KEY) === 'all' ? 'all' : 'wizard'; } catch (e) { return 'wizard'; }
  });
  const setMode = (m) => {
    setModeState(m);
    try { localStorage.setItem(MODE_KEY, m); } catch (e) {}
  };
  return [mode, setMode];
}

/** A tinted sub-panel inside a step: small-caps label + content. */
export function Panel({ label, icon, children, id }) {
  return jsxs('div', {
    className: 'wz-panel',
    role: 'group',
    'aria-label': label,
    id,
    children: [
      label ? jsxs('div', { className: 'wz-panel__label', children: [icon ? jsx(Icon, { name: icon }) : null, label] }) : null,
      children
    ]
  });
}

/** Live preview card: banner (avatar + title + subtitle) and tabbed key/value rows. */
export function PreviewCard({ avatar, initials, title, subtitle, tabs }) {
  const [tab, setTab] = useState(0);
  const cur = tabs[Math.min(tab, tabs.length - 1)];
  return jsxs('aside', {
    className: 'wz-preview',
    'data-wz-preview': '',
    children: [
      jsxs('div', {
        className: 'wz-preview__head',
        children: [jsx('span', { className: 'wz-preview__icon', children: jsx(Icon, { name: 'eye' }) }), jsx('b', { children: 'Live Preview' }), jsx('span', { className: 'wz-preview__live', children: 'Live' })]
      }),
      jsxs('div', {
        className: 'wz-preview__banner',
        children: [
          avatar ? jsx('img', { src: avatar, alt: '', className: 'wz-preview__avatar' }) : jsx('span', { className: 'wz-preview__avatar wz-preview__avatar--txt', children: initials || '?' }),
          jsxs('div', { className: 'wz-preview__who', children: [jsx('b', { id: 'wz-preview-title', children: title }), jsx('small', { children: subtitle })] })
        ]
      }),
      jsx('div', {
        className: 'wz-preview__tabs',
        role: 'tablist',
        children: tabs.map((t, i) => jsx('button', { type: 'button', role: 'tab', className: 'wz-preview__tab' + (i === tab ? ' is-on' : ''), onClick: () => setTab(i), children: t.label }, t.label))
      }),
      jsx('dl', {
        className: 'wz-preview__rows',
        children: cur.rows.map(([k, v]) => jsxs('div', { className: 'wz-preview__row', children: [jsx('dt', { children: k }), jsx('dd', { children: v === '' || v === undefined || v === null ? jsx('i', { children: 'Not specified' }) : v })] }, k))
      })
    ]
  });
}

export function FormWizard({
  icon = 'user', title, subtitle, steps, step, setStep, mode, setMode, preview, onBack, backLabel = 'Back',
  onNext, onCancel, submitLabel, saving, extraActions, titleBadge, headerExtra, errors, onJumpError
}) {
  const last = steps.length - 1;
  const wizard = mode === 'wizard';
  const pct = Math.round(((step + 1) / steps.length) * 100);
  const goto = (i) => {
    if (i === step) return;
    // moving forward goes through the caller's validation, backwards is always allowed
    if (i > step) onNext(i);
    else setStep(i);
  };
  const foot = jsxs('div', {
              className: 'wz-foot',
              children: [
                jsxs('div', {
                  className: 'wz-foot__l',
                  children: [
                    wizard && step > 0
                      ? jsxs('button', { type: 'button', className: 'btn', id: 'wz-prev', onClick: () => setStep(step - 1), children: [jsx(Icon, { name: 'arrow-l' }), 'Previous'] })
                      : jsx('button', { type: 'button', className: 'btn btn--ghost', id: 'wz-cancel', onClick: onCancel, children: 'Cancel' }),
                    extraActions || null
                  ]
                }),
                wizard && step < last
                  ? jsxs('button', { key: 'wz-next-btn', type: 'button', className: 'btn btn--primary', id: 'wz-next', onClick: () => onNext(step + 1), children: [`Next: ${steps[step + 1].label}`, jsx(Icon, { name: 'arrow-r' })] })
                  : jsx('button', { key: 'wz-submit-btn', type: 'submit', className: 'btn btn--primary', id: 'wz-submit', disabled: saving, children: saving ? 'Saving…' : submitLabel })
              ]
            });
  return jsxs('div', {
    className: 'wz',
    'data-wz-mode': mode,
    // Enter inside a text field moves to the next step (validated) instead of submitting early
    onKeyDown: (e) => {
      const t = e.target;
      if (wizard && e.key === 'Enter' && step < last && t && t.tagName === 'INPUT' && !['checkbox', 'file', 'radio', 'button', 'submit'].includes(t.type)) {
        e.preventDefault();
        onNext(step + 1);
      }
    },
    children: [
      jsxs('div', {
        className: 'wz-top',
        children: [
          jsxs('div', {
            className: 'wz-top__l',
            children: [
              jsx('button', { type: 'button', className: 'wz-top__back', id: 'wz-back', onClick: onBack, children: [jsx(Icon, { name: 'arrow-l' }), backLabel] }),
              jsx('span', { className: 'wz-top__icon', children: jsx(Icon, { name: icon }) }),
              jsxs('div', { children: [jsxs('h2', { className: 'wz-top__title', children: [title, titleBadge ? jsx('span', { className: 'wz-top__badge', children: titleBadge }) : null] }), jsx('p', { className: 'wz-top__sub', children: subtitle })] })
            ]
          }),
          jsxs('div', {
            className: 'wz-top__r',
            children: [
          headerExtra || null,
          jsxs('div', {
            className: 'wz-modes',
            role: 'group',
            'aria-label': 'Form layout',
            children: [
              jsx('button', { type: 'button', id: 'wz-mode-wizard', className: 'wz-modes__btn' + (wizard ? ' is-on' : ''), onClick: () => setMode('wizard'), children: 'Wizard Mode' }),
              jsx('button', { type: 'button', id: 'wz-mode-all', className: 'wz-modes__btn' + (!wizard ? ' is-on' : ''), onClick: () => setMode('all'), children: 'All-In-One Form' })
            ]
          })
            ]
          })
        ]
      }),
      wizard
        ? jsxs('div', {
            className: 'wz-progress',
            children: [
              jsxs('div', {
                className: 'wz-progress__head',
                children: [
                  jsxs('span', { className: 'wz-progress__title', children: [jsx(Icon, { name: 'sparkle' }), `STEP ${step + 1} OF ${steps.length}: `, jsx('em', { id: 'wz-step-title', children: steps[step].title })] }),
                  jsx('span', { className: 'wz-progress__pct', id: 'wz-pct', children: `${pct}% Completed` })
                ]
              }),
              jsx('div', { className: 'wz-progress__bar', children: jsx('i', { style: { width: pct + '%' } }) }),
              jsx('div', {
                className: 'wz-steps',
                children: steps.map((s, i) =>
                  jsxs('button', {
                    type: 'button',
                    className: 'wz-step' + (i === step ? ' is-current' : i < step ? ' is-done' : ''),
                    'data-wz-step': i + 1,
                    onClick: () => goto(i),
                    children: [
                      jsx('span', { className: 'wz-step__n', children: i < step ? jsx(Icon, { name: 'check' }) : String(i + 1).padStart(2, '0') }),
                      jsxs('span', { className: 'wz-step__t', children: [jsx('small', { children: i === step ? 'CURRENT' : i < step ? 'COMPLETED' : `STEP ${String(i + 1).padStart(2, '0')}` }), jsx('b', { children: s.label })] })
                    ]
                  }, s.id)
                )
              })
            ]
          })
        : null,
      jsxs('div', {
        className: 'wz-body',
        children: [
          jsxs('div', {
            className: 'wz-main',
            children: [
              errors && errors.length
                ? jsxs('div', {
                    className: 'wz-alert', id: 'wz-error-summary', role: 'alert',
                    children: [
                      jsxs('b', { children: [jsx(Icon, { name: 'x' }), `Please fix ${errors.length} field${errors.length === 1 ? '' : 's'} before continuing`] }),
                      jsx('ul', { children: errors.map((er) => jsx('li', { key: er.key, children: jsx('button', { type: 'button', className: 'wz-alert__jump', 'data-jump': er.key, onClick: () => onJumpError && onJumpError(er), children: `${er.label} — ${er.message}` }) })) })
                    ]
                  })
                : null,
              ...steps.map((s, i) =>
                jsxs('section', {
                  className: 'wz-sec',
                  'data-section': s.title,
                  'data-wz-section': i + 1,
                  'data-accent': s.accent || 'primary',
                  hidden: wizard && i !== step,
                  children: [
                    jsxs('header', {
                      className: 'wz-sec__head',
                      children: [
                        jsxs('div', { children: [jsxs('h3', { className: 'wz-sec__title', children: [jsx(Icon, { name: s.icon || 'note' }), `SECTION ${i + 1}: ${s.title.toUpperCase()}`] }), s.desc ? jsx('p', { className: 'wz-sec__desc', children: s.desc }) : null] }),
                        s.badge ? jsx('span', { className: 'wz-sec__badge', children: s.badge }) : null
                      ]
                    }),
                    jsx('div', { className: 'wz-sec__body', children: s.content }),
                    (wizard ? i === step : i === last) ? foot : null
                  ]
                }, s.id)
              )
            ]
          }),
          preview
        ]
      })
    ]
  });
}
