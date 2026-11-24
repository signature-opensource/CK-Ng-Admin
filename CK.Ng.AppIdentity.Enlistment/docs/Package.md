The approval page of a CK-AppIdentity System: an operator approves a party that waits to be enlisted with the codes
read on it, and manages the enlistment tickets of the Authentication Center.

The page is at `/app-identity/enlist?party={full name}`: a client application built with this package has the
"Enlistment" fact, so its party is the approval page of the System. An operator at the Critical level enters the codes
read on the waiting party; the page sends an `IApprovePartyCommand` and shows the outcome for each party that holds a
pending approval of it.
Without a party, the page also opens pre-authorized enlistment tickets for the parties the operator expects (shown
once, a secret given to the party at start) and lists and revokes the tickets of the Authentication Center.

See the [README](https://github.com/signature-opensource/CK-Ng-Admin/blob/stable/CK.Ng.AppIdentity.Enlistment/README.md).
