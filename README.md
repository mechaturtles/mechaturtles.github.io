# mechaturtles-web
because static is trendy now


## booking link gate

The `/time/` page doesn't contain the Proton booking link in plain text. It ships
`src/time/booking-link.json`: the link encrypted with AES-256-GCM, using a key
derived from a 4-digit code with PBKDF2-SHA256 (random salt, 5,000,000 iterations).
`src/time/unlock.js` decrypts it in the browser when someone enters the right code,
checks that the result starts with `https://calendar.proton.me/`, and then redirects.

To rotate the link and/or code, set both values in your environment (don't commit them
or paste them anywhere) and run:

```sh
BOOKING_LINK=... BOOKING_CODE=... node scripts/encrypt-booking-link.mjs
```

This rewrites only `src/time/booking-link.json`. Commit that file and open a PR.
This is a speed bump against scrapers and spam, not strong security: a 4-digit code
can be brute-forced offline, so rotate it now and then.
