# Messaging styles — what changed

The original stylesheet contained the messaging section **twice**.

## What was removed

A second, dark-glass version defined ~15 of the same selectors
(`.messages-shell`, `.conversation-item`, `.message-thread`,
`.message-composer`, `.composer-row`, `.attachment-preview`,
`.message-meta`, `.conversation-header`, `.conversation-more`,
`.mobile-back-button`, `.messages-no-selection`,
`.conversation-empty`, and others) with hardcoded `rgba()` values
instead of design tokens. Because it appeared later in the file,
it won every conflict.

It also styled markup that does not exist in `MessagesView`:

- `.conversation-item-copy`, `.conversation-active-dot`
- `.conversation-heading-kicker`, `.conversation-count`
- `.message-bubble`, `.message-row.sent`, `.message-row.received`
- `.message-list`, `.message-intro`, `.message-side-mark`
- `.composer-shell`, `.composer-attach`, `.composer-send`
- `.message-composer-footer`, `.message-attachment`

Those rules had no elements to attach to.

## The `:root:not(.dark)` bug

That block scoped its light-mode rules with:

    :root:not(.dark) .messages-shell,
    [data-theme="light"] .messages-shell { ... }

Nothing in the app ever sets a `.dark` class — theming is done
with `html[data-theme="dark"]`. So `:not(.dark)` matched the
`<html>` element **in both themes**, and at higher specificity
than the dark base rules. The result: light messaging styles
applied in dark mode.

This is fixed by removing the block entirely. The surviving
messaging styles use `html[data-theme="dark"]`, matching the rest
of the stylesheet.

## `.message-meta` meant two things

- Token version: the composer footer (character count, send hint)
- Glass version: per-bubble timestamps

`MessagesView` uses it as the composer footer, so that is what
`messages.css` now defines.

## If you want the bubble design later

Keep it in a separate file and add the markup first. Do not
reintroduce it as a second definition of the same selectors —
convert `.message-thread`'s children to `.message-list` /
`.message-row` / `.message-bubble` in the component, then style
those new class names only.
