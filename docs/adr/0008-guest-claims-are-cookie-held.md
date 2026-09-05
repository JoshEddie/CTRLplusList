# Guest claims are cookie-held capabilities with no account

A guest's claim is a `purchases` row with all identity columns NULL and a free-text
`guest_name`; the right to see or remove it comes solely from the claim id being
listed in the httpOnly `guest_claims` cookie. A lightweight guest identity row
was the alternative, and it was rejected to keep claiming frictionless.

**Consequences:** clearing the cookie makes those claims permanently anonymous
and un-removable by anyone including their author, and duplicate guest claims
are not constrained at all — true of the application as well as the database
since the name-match check that approximated one was deleted, its false
positives having told a second Josh he had already claimed something he had
never seen. Capacity limits guests instead, regardless of identity. A cached
read cannot see the cookie, so a guest's own claim must be overlaid back in
after the read.
