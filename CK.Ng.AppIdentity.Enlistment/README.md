# CK.Ng.AppIdentity.Enlistment

The approval page of a CK-AppIdentity System. A party that a holder doesn't trust yet waits for an approval: its
holder hands it the URL of the approval page of the System, followed by `?party={its full name}`, and the pending
approval travels the "Enlistment" route up to the party that hosts the page (see the routes of
[CK.AppIdentity.TransportLayer](https://github.com/signature-opensource/CK-AppIdentity-Transport/blob/stable/CK.AppIdentity.TransportLayer/README.md#the-routes-and-the-enlistment-url)).
An operator opens the URL, reads the approval code on the waiting party and enters it on the page.

## The package

[`NgAppIdentityEnlistmentPackage`](NgAppIdentityEnlistmentPackage.cs) has the "Enlistment" fact
(`[PartyClientFact( "Enlistment" )]`): a client application built with it is the approval page, so its party hosts the
"Enlistment" route of the System, whose target is the URL of the client application followed by `/app-identity/enlist`.
It registers the `IApprovePartyCommand` of
[CK.IO.AppIdentity.Enlistment](https://github.com/signature-opensource/CK-AppIdentity-Transport/blob/stable/CK.IO.AppIdentity.Enlistment/README.md).

## The page

[`EnlistPageComponent`](EnlistPage/EnlistPageComponent.cs) is the public route `app-identity/enlist` of the application
(the operator often arrives without being signed in). The page ([`EnlistPage`](EnlistPage/Res/enlist-page.ts)):

- shows the full name of the party to approve, read from `?party=` (without it, there is nothing to approve);
- asks the operator to sign in again (`NgAuthService.elevateToCritical`, a popup: the page keeps its state) until the
  operator is at the Critical level, then shows the seconds left in the Critical window;
- takes one code per party the waiting party waits on ("Add a code"): a code belongs to a pair of parties;
- sends the `IApprovePartyCommand` (when the Critical window is over, the Approve click signs in again first, the codes
  are kept) and shows its outcome for each party that holds a pending approval of the party.

The page doesn't approve anything itself: the command is handled by the host (CK.AppIdentity.Enlistment, or any
handler of the application).
