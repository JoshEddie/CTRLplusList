# actor-resolution-consolidation

Route every actor-resolution call site through the two chokepoints (authedUserId, getUserIdByEmail), eliminating the inline session-to-users bypasses, so active-profile resolution lands once later. Issue #188.
