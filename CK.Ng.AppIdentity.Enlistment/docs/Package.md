The approval page of a CK-AppIdentity System, at `/app-identity/enlist?party={full name}`: a client application built
with this package has the "Enlistment" fact, so its party hosts the "Enlistment" route of the System. An operator at the
Critical level enters the codes read on the waiting party; the page sends an `IApprovePartyCommand` and shows the
outcome for each party that holds a pending approval of it.
